import { NextRequest, NextResponse } from "next/server";
import {
  removeSubscription,
  setSubscriptionEnabled,
} from "@/lib/subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** DELETE /api/subscriptions/[id] — 删除订阅（连带其告警） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const ok = removeSubscription(id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "订阅不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** PATCH /api/subscriptions/[id] — 暂停 / 启用
 *  body: { enabled?: boolean } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体非 JSON" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "缺少 enabled 布尔字段" },
      { status: 400 }
    );
  }
  const ok = setSubscriptionEnabled(params.id, body.enabled);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "订阅不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
