/**
 * 扫描引擎（仅服务端）
 *
 * 把原本内联在 /api/scan/route.ts 的扇出 + 过滤 + 去重逻辑抽成纯函数，
 * 让「首页扫描」和「cron 后台监控」共用同一套规则，避免两边行为漂移。
 *
 * 核心函数：
 *  - scanLowestDeals: 给定出发地 + 目的地列表 + 日期，返回命中阈值的 deals
 *  - scanSubscription: 扫单条订阅，返回该航线最低价 deal（cron 用）
 */
import { searchFlights } from "@/lib/flight";
import { LxApiError } from "@/lib/client";
import { pushCeil } from "@/lib/catalog";
import { toDeal, type FlightDeal } from "@/lib/deal";
import type { LxFlightSearchRequest } from "@/lib/types";

/** 并发跑一个 async 任务数组，每批 batch 个（内存并发度，真正 QPS 由 client.ts 限流） */
export async function pooled<T, R>(
  items: T[],
  batch: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batch) {
    const slice = items.slice(i, i + batch);
    results.push(...(await Promise.allSettled(slice.map(fn))));
  }
  return results;
}

export interface ScanResult {
  deals: FlightDeal[];
  /** 是否出现鉴权类故障（token/IP 问题） */
  authError: boolean;
}

/**
 * 扫描：from_code → 多个目的地 × 多个日期，返回含税总价 ≤ threshold×110% 的 deals。
 * 跳过 sold_out 舱位；同航班同舱位同日期保留最低价；按价升序。
 */
export async function scanLowestDeals(
  from_code: string,
  to_codes: string[],
  dates: string[],
  threshold: number,
  opts: {
    concurrency?: number;
    pageSize?: number;
    cabin_class?: string;
    adult?: number;
    limit?: number;
    /** 国内 / 国际（默认 domestic，保持向后兼容） */
    trip_mode?: "domestic" | "international";
  } = {}
): Promise<ScanResult> {
  const {
    concurrency = 40,
    pageSize = 1,
    cabin_class = "economy",
    adult = 1,
    limit = 60,
    trip_mode = "domestic",
  } = opts;
  const ceil = pushCeil(threshold);

  const tasks: { date: string; to_code: string }[] = [];
  for (const date of dates) {
    for (const to_code of to_codes) {
      tasks.push({ date, to_code });
    }
  }

  let authError = false;
  const deals: FlightDeal[] = [];

  await pooled(tasks, concurrency, async ({ date, to_code }) => {
    const r: LxFlightSearchRequest = {
      trip_mode,
      trip_type: "oneway",
      from_code,
      to_code,
      cabin_class: cabin_class as "economy" | "business" | "first",
      depart_date: date,
      passengers: { adult, child: 0, infant: 0 },
      sort_by: "price",
      page_size: pageSize,
    };
    try {
      const data = await searchFlights(r);
      for (const flight of data.flights || []) {
        for (const cabin of flight.cabins || []) {
          if (cabin.seat_status === "sold_out") continue;
          const deal = toDeal(flight, cabin, date);
          if (deal.total > 0 && deal.total <= ceil) {
            deals.push(deal);
          }
        }
      }
    } catch (e) {
      const err = e as LxApiError;
      if (err.authRelated) authError = true;
    }
  });

  // 去重：同航班同舱位同日期，保留最低价
  const seen = new Map<string, FlightDeal>();
  for (const d of deals) {
    const key = `${d.flight_no}_${d.date}_${d.cabin_code}`;
    const prev = seen.get(key);
    if (!prev || d.total < prev.total) seen.set(key, d);
  }
  const sorted = [...seen.values()].sort((a, b) => a.total - b.total).slice(0, limit);
  return { deals: sorted, authError };
}

/** 从今天起 n 天的日期数组（YYYY-MM-DD） */
export function nextDays(n: number): string[] {
  return daysBetween(0, n);
}

/** 从 offset 天后开始，连续 span 天（含两端） */
export function daysBetween(offset: number, span: number): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const count = Math.max(1, span);
  for (let i = offset; i < offset + count; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
  }
  return out;
}

/** 把 YYYY-MM-DD 转成距今天数（负=过去），用于判断订阅窗口相对今天的位置 */
export function daysFromToday(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/**
 * 扫单条订阅：在 [date_start, date_end] 窗口内取该航线最低价。
 * 返回最低价 deal（可能为 null 表示该区间无票或全部超阈值）。
 *
 * 与 scanLowestDeals 的区别：单航线场景下放宽阈值——
 * cron 的目的是「跌破订阅金额就告警」，命中判据用 threshold 本身（不含 110% 缓冲）。
 */
export async function scanSubscription(
  from_code: string,
  to_code: string,
  date_start: string,
  date_end: string,
  threshold: number,
  opts: {
    cabin_class?: string;
    adult?: number;
    /** 国内 / 国际（默认 domestic） */
    trip_mode?: "domestic" | "international";
  } = {}
): Promise<{ best: FlightDeal | null; authError: boolean }> {
  const startOffset = Math.max(0, daysFromToday(date_start)); // 不扫过去
  const endOffset = Math.max(startOffset, daysFromToday(date_end));
  const span = endOffset - startOffset + 1;
  const dates = daysBetween(startOffset, span);

  // 单航线：to_codes 只有一个，pageSize 放大到 3 多取几个候选取最低
  const res = await scanLowestDeals(from_code, [to_code], dates, threshold, {
    ...opts,
    pageSize: 3,
    limit: 1,
  });
  return { best: res.deals[0] ?? null, authError: res.authError };
}
