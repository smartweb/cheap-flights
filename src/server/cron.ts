/**
 * 监控定时任务（仅服务端，由 server.ts 的 node-cron 调用）
 *
 * 流程：读所有启用订阅 → 逐条扫描取最低价 → 命中阈值且非重复 → 写 alerts + Bark 推送
 *
 * 去重规则（避免同一航线反复打扰）：
 *  - 当前价 ≥ 上次告警价 → 跳过（价格没创新低）
 *  - 且距上次告警不足 12 小时 → 跳过（节流，哪怕价格更低也避免狂轰）
 *  - 否则：写告警 + 推送，更新 last_alert_total / last_alert_at
 */
import { listEnabledSubscriptions, recordAlert, updateLastAlert } from "@/lib/subscriptions";
import { markPushed } from "@/lib/alerts";
import { ORIGIN_MAP, DESTINATION_MAP } from "@/lib/catalog";
import { scanSubscription } from "@/lib/scan-engine";
import { pushDealAlert, barkConfigured } from "@/server/bark";

/** 告警节流窗口：同航线两次推送最少间隔 */
const THROTTLE_MS = 12 * 60 * 60 * 1000;

export interface MonitorStats {
  scanned: number;
  hit: number;
  pushed: number;
  errors: number;
}

/** 跑一轮完整监控（可被 cron 或手动触发） */
export async function runMonitor(): Promise<MonitorStats> {
  const stats: MonitorStats = { scanned: 0, hit: 0, pushed: 0, errors: 0 };
  const subs = listEnabledSubscriptions();
  if (subs.length === 0) return stats;

  for (const sub of subs) {
    stats.scanned++;
    try {
      const { best } = await scanSubscription(
        sub.from_code,
        sub.to_code,
        sub.date_start,
        sub.date_end,
        sub.threshold,
        { cabin_class: sub.cabin_class, adult: sub.adult, trip_mode: sub.trip_mode }
      );

      if (!best || best.total > sub.threshold) continue; // 未命中

      // 去重判断
      const now = Date.now();
      const sameOrHigher = sub.last_alert_total != null && best.total >= sub.last_alert_total;
      const tooSoon = sub.last_alert_at != null && now - sub.last_alert_at < THROTTLE_MS;
      if (sameOrHigher || tooSoon) continue;

      // 命中：写告警记录
      stats.hit++;
      const originCity = ORIGIN_MAP[sub.from_code]?.name ?? sub.from_code;
      const destCity = DESTINATION_MAP[sub.to_code]?.city ?? sub.to_code;
      const alertId = recordAlert(sub, {
        date: best.date,
        flight_no: best.flight_no,
        airline_name: best.airline_name,
        from_city: best.from_city,
        to_city: best.to_city,
        adult_price: best.adult_price,
        airport_tax: best.airport_tax,
        fuel_tax: best.fuel_tax,
        total: best.total,
        dep_time: best.dep_time,
        arr_time: best.arr_time,
        duration_minutes: best.duration_minutes,
        cabin_name: best.cabin_name,
        search_offer_id: best.search_offer_id,
      });

      // 推送（无论推送是否成功都更新订阅的 last_alert，避免下次又重复记录这条）
      updateLastAlert(sub.id, best.total);
      if (barkConfigured()) {
        const ok = await pushDealAlert(best, originCity, destCity);
        markPushed(alertId, ok);
        if (ok) stats.pushed++;
      }
    } catch {
      stats.errors++;
    }
  }

  return stats;
}
