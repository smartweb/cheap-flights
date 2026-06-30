import { NextRequest, NextResponse } from "next/server";
import { listAlerts, countUnseen, markAllSeen } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/alerts — 告警列表
 *  ?unseen=1   只返回未读条数（首页红点用）
 *  ?limit=N    限制条数（默认 50） */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("unseen") === "1") {
    return NextResponse.json({ ok: true, data: { count: countUnseen() } });
  }
  const limit = Number(searchParams.get("limit")) || 50;
  return NextResponse.json({ ok: true, data: listAlerts(limit) });
}

/** POST /api/alerts — 标记全部已读 */
export async function POST() {
  const changed = markAllSeen();
  return NextResponse.json({ ok: true, data: { updated: changed } });
}
