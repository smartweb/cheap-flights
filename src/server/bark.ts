/**
 * Bark 推送（仅服务端）
 *
 * Bark 是 iOS 上的轻量推送 App：一个 HTTP POST 即可送达通知。
 * 完全自动，无需人工确认（不像 agently-cli 的两阶段确认），适合 cron 调用。
 *
 * 配置：BARK_KEY（Bark App 里显示的 key），可选 BARK_BASE（自建服务器时改）。
 */
import type { FlightDeal } from "@/lib/deal";

const BARK_KEY = process.env.BARK_KEY ?? "";
const BARK_BASE = (process.env.BARK_BASE ?? "https://api.day.app").replace(/\/$/, "");

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("server/bark 只能在服务端使用（携带推送 key）");
  }
}

export function barkConfigured(): boolean {
  return !!BARK_KEY;
}

/** 推送一条命中告警 */
export async function pushDealAlert(
  deal: FlightDeal,
  originCity: string,
  destCity: string
): Promise<boolean> {
  assertServer();
  if (!BARK_KEY) return false;

  // 标题：航线 + 价格
  const title = `${originCity}→${destCity} ¥${deal.total}`;
  // 正文：日期 + 航班 + 起飞时间
  const body = `${deal.date} ${deal.airline_name} ${deal.flight_no} · ${deal.dep_time.slice(
    11,
    16
  )}起飞`;

  // Bark URL API：https://api.day.app/<key>/<title>/<body>
  // title/body 用 encodeURIComponent 保证特殊字符安全
  const url = `${BARK_BASE}/${BARK_KEY}/${encodeURIComponent(
    title
  )}/${encodeURIComponent(body)}`;

  try {
    const res = await fetch(url, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}
