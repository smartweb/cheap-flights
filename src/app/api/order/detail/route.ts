import { NextRequest, NextResponse } from "next/server";
import { getFlightOrderDetail } from "@/lib/flight";
import { LxApiError } from "@/lib/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 订单详情（真实接口）：
 * 按 system_no 或 out_trade_no 查询支付/出票/票号等实时状态。
 * 仅服务端调用，token 不暴露。
 */
export async function POST(req: NextRequest) {
  let body: { system_no?: string; out_trade_no?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体非 JSON" }, { status: 400 });
  }

  if (!body.system_no && !body.out_trade_no) {
    return NextResponse.json(
      { ok: false, error: "缺少参数：system_no 或 out_trade_no" },
      { status: 400 }
    );
  }

  try {
    const data = await getFlightOrderDetail({
      system_no: body.system_no,
      out_trade_no: body.out_trade_no,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const err = e as LxApiError;
    return NextResponse.json(
      { ok: false, error: err.message, authRelated: err.authRelated },
      { status: 502 }
    );
  }
}
