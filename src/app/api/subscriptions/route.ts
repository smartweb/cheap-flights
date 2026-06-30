import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_THRESHOLD,
  ORIGIN_MAP,
  DESTINATION_MAP,
  scopeOf,
} from "@/lib/catalog";
import {
  listSubscriptions,
  addSubscription,
} from "@/lib/subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 把监控金额收敛到合法区间（与 scan 路由一致） */
function clampThreshold(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_THRESHOLD;
  return Math.max(100, Math.min(99999, Math.round(n)));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function plusDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** GET /api/subscriptions — 列出全部订阅 */
export async function GET() {
  return NextResponse.json({ ok: true, data: listSubscriptions() });
}

/** POST /api/subscriptions — 新增一条订阅 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体非 JSON" }, { status: 400 });
  }

  const from_code = String(body.from_code ?? "").toUpperCase();
  const to_code = String(body.to_code ?? "").toUpperCase();
  if (!ORIGIN_MAP[from_code]) {
    return NextResponse.json(
      { ok: false, error: "出发地仅支持北上广深（SZX/CAN/PEK/SHA）" },
      { status: 400 }
    );
  }
  if (!DESTINATION_MAP[to_code]) {
    return NextResponse.json(
      { ok: false, error: "目的地不在支持列表内" },
      { status: 400 }
    );
  }
  if (from_code === to_code) {
    return NextResponse.json(
      { ok: false, error: "出发地与目的地不能相同" },
      { status: 400 }
    );
  }

  // 日期窗口：默认今天起 14 天
  const today = todayStr();
  const date_start = DATE_RE.test(String(body.date_start ?? ""))
    ? String(body.date_start)
    : today;
  const date_end = DATE_RE.test(String(body.date_end ?? ""))
    ? String(body.date_end)
    : plusDaysStr(today, 14);

  if (date_end < date_start) {
    return NextResponse.json(
      { ok: false, error: "结束日期不能早于开始日期" },
      { status: 400 }
    );
  }
  // 最多监控 30 天，避免单条订阅扇出过大
  const spanDays =
    (new Date(date_end + "T00:00:00").getTime() -
      new Date(date_start + "T00:00:00").getTime()) /
    86400000;
  if (spanDays > 30) {
    return NextResponse.json(
      { ok: false, error: "日期窗口最多 30 天" },
      { status: 400 }
    );
  }

  const sub = addSubscription({
    from_code,
    to_code,
    date_start,
    date_end,
    threshold: clampThreshold(body.threshold),
    trip_mode: scopeOf(to_code),
  });

  return NextResponse.json({ ok: true, data: sub });
}
