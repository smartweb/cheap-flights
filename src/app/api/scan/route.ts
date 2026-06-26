import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/flight";
import { LxApiError } from "@/lib/client";
import {
  DESTINATIONS,
  ORIGIN_MAP,
  DEFAULT_THRESHOLD,
  DEFAULT_ORIGIN_CODE,
  pushCeil,
} from "@/lib/catalog";
import { toDeal, type FlightDeal } from "@/lib/deal";
import type { LxFlightSearchRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 扫描日期窗口：默认未来 7 天（捡漏以近期为主，兼顾速度） */
const DEFAULT_DAYS = 7;
/** 单城市单日请求的 page_size：只取最便宜的 1 个航班（已按 price 排序） */
const PAGE_SIZE = 1;
/** 并发扇出批大小（上游数据查询 QPS 上限 50，留余量取 24） */
const CONCURRENCY = 24;

interface ScanBody {
  from_code?: string;
  threshold?: number;
  dates?: string[]; // YYYY-MM-DD[]
  destinations?: string[]; // 可选：自定义目的地 code 列表
}

/** 生成从今天起 n 天的日期数组 */
function nextDays(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
  }
  return out;
}

/** 并发跑一个 async 任务数组，每批 batch 个 */
async function pooled<T, R>(
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

/** 扫描特价机票 */
export async function POST(req: NextRequest) {
  let body: ScanBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体非 JSON" }, { status: 400 });
  }

  const from_code = body.from_code || DEFAULT_ORIGIN_CODE;
  if (!ORIGIN_MAP[from_code]) {
    return NextResponse.json(
      { ok: false, error: "仅支持北上广深出发（SZX/CAN/PEK/SHA）" },
      { status: 400 }
    );
  }

  const threshold = clampThreshold(body.threshold);
  const ceil = pushCeil(threshold); // 推送上限 = 监控金额 × 110%

  const dates =
    Array.isArray(body.dates) && body.dates.length
      ? body.dates.slice(0, 21)
      : nextDays(DEFAULT_DAYS);

  const dests = (Array.isArray(body.destinations) && body.destinations.length
    ? DESTINATIONS.filter((d) => body.destinations!.includes(d.code))
    : DESTINATIONS
  ).filter((d) => d.code !== from_code);

  // 任务：date × destination 扇出
  const tasks: { date: string; to_code: string }[] = [];
  for (const date of dates) {
    for (const d of dests) {
      tasks.push({ date, to_code: d.code });
    }
  }

  let authError = false;
  const deals: FlightDeal[] = [];

  await pooled(tasks, CONCURRENCY, async ({ date, to_code }) => {
    const r: LxFlightSearchRequest = {
      trip_mode: "domestic",
      trip_type: "oneway",
      from_code,
      to_code,
      cabin_class: "economy",
      depart_date: date,
      passengers: { adult: 1, child: 0, infant: 0 },
      sort_by: "price",
      page_size: PAGE_SIZE,
    };
    try {
      const data = await searchFlights(r);
      for (const flight of data.flights || []) {
        for (const cabin of flight.cabins || []) {
          const deal = toDeal(flight, cabin, date);
          // 仅推送含税总价 ≤ 阈值×110% 的舱位
          if (deal.total > 0 && deal.total <= ceil) {
            // 跳过无座舱位
            if (cabin.seat_status === "sold_out") continue;
            deals.push(deal);
          }
        }
      }
    } catch (e) {
      const err = e as LxApiError;
      if (err.authRelated) authError = true; // 标记鉴权类故障
      // 单航线失败不影响整体扫描，忽略
    }
  });

  // 去重（同航班同舱位同日期，保留最低价）
  const seen = new Map<string, FlightDeal>();
  for (const d of deals) {
    const key = `${d.flight_no}_${d.date}_${d.cabin_code}`;
    const prev = seen.get(key);
    if (!prev || d.total < prev.total) seen.set(key, d);
  }

  const sorted = [...seen.values()].sort((a, b) => a.total - b.total).slice(0, 60);

  return NextResponse.json({
    ok: true,
    data: {
      deals: sorted,
      meta: {
        from_code,
        threshold,
        ceil,
        dates,
        destinations_scanned: dests.length,
        total_deals: sorted.length,
        auth_error: authError,
      },
    },
  });
}

function clampThreshold(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_THRESHOLD;
  return Math.max(100, Math.min(99999, Math.round(n)));
}
