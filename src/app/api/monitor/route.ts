import { NextResponse } from "next/server";
import { runMonitor } from "@/server/cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/monitor — 立即触发一轮监控（手动测试 / 「立即扫描」按钮用）
 *  不依赖 cron，调用即跑一次。返回扫描统计。 */
export async function POST() {
  const stats = await runMonitor();
  return NextResponse.json({ ok: true, data: stats });
}
