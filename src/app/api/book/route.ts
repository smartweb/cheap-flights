import { NextRequest, NextResponse } from "next/server";
import { priceFlight, createFlightOrder } from "@/lib/flight";
import { LxApiError } from "@/lib/client";
import type { IdType, LxContactInfo, LxPassengerInfo, PassengerType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 合法证件类型白名单 */
const VALID_ID_TYPES = new Set<IdType>([
  "ID_CARD",
  "PASSPORT",
  "HK_MACAO_PERMIT",
  "RETURN_HOME_PERMIT",
  "TAIWAN_PERMIT",
  "TAIWAN_COMPATRIOT_PERMIT",
  "SOLDIER_CARD",
  "FOREIGN_PERMANENT_RESIDENCE_ID",
  "HK_MACAO_TAIWAN_RESIDENCE_PERMIT",
  "HOUSEHOLD_REGISTER",
  "BIRTH_CERTIFICATE",
  "OTHER",
]);

interface BookBody {
  search_offer_id?: string;
  contact?: LxContactInfo;
  passengers?: Array<{
    name?: string;
    name_en?: string;
    phone?: string;
    type?: PassengerType;
    id_type?: IdType;
    id_number?: string;
    birthday?: string;
    sex?: 1 | 2;
  }>;
}

/**
 * 下单（真实接口）：
 *  1) 服务端用 search_offer_id 调「验价」换取最新 offer_id（10分钟有效）+ 锁定 total_fare
 *  2) 用 offer_id 调「创建订单」(pay_mode=user_pay) → 拿到 checkout_url
 *  3) 前端拿到 checkout_url 直接跳转托管收银台完成支付
 *
 * 身份证 / 手机号等敏感数据仅在本服务端流转，不写日志、不落库。
 *
 * ⚠️ 使用生产 token (rdak_live) 时，成功下单会产生真实订单（支付在收银台完成）。
 */
export async function POST(req: NextRequest) {
  // 简易防刷：同一 IP 10 秒内最多 2 次下单
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "下单太频繁，请稍后再试" },
      { status: 429 }
    );
  }

  let body: BookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体非 JSON" }, { status: 400 });
  }

  // ---- 入参校验 ----
  if (!body.search_offer_id) {
    return NextResponse.json(
      { ok: false, error: "缺少 search_offer_id" },
      { status: 400 }
    );
  }
  const contact = body.contact;
  if (!contact?.name || !contact?.phone || !/^1\d{10}$/.test(contact.phone)) {
    return NextResponse.json(
      { ok: false, error: "联系人信息有误：姓名与 11 位手机号必填" },
      { status: 400 }
    );
  }
  const passengers = body.passengers ?? [];
  if (!passengers.length || passengers.length > 4) {
    return NextResponse.json(
      { ok: false, error: "乘客数量需为 1–4 人" },
      { status: 400 }
    );
  }

  for (let i = 0; i < passengers.length; i++) {
    const p = passengers[i];
    if (!p.name || !p.id_number || !p.id_type || !p.phone || !p.type) {
      return NextResponse.json(
        { ok: false, error: `乘客 ${i + 1} 信息不全：姓名/证件号/证件类型/手机号/类型必填` },
        { status: 400 }
      );
    }
    if (!VALID_ID_TYPES.has(p.id_type)) {
      return NextResponse.json(
        { ok: false, error: `乘客 ${i + 1} 证件类型不合法` },
        { status: 400 }
      );
    }
    if (!/^1\d{10}$/.test(p.phone)) {
      return NextResponse.json(
        { ok: false, error: `乘客 ${i + 1} 手机号格式有误` },
        { status: 400 }
      );
    }
    if ((p.type === "child" || p.type === "infant") && !p.birthday) {
      return NextResponse.json(
        { ok: false, error: `乘客 ${i + 1} 为儿童/婴儿，需填写出生日期` },
        { status: 400 }
      );
    }
  }

  const passengerPayload: LxPassengerInfo[] = passengers.map((p) => ({
    name: p.name!.trim(),
    name_en: p.name_en?.trim(),
    phone: p.phone!,
    type: p.type!,
    id_type: p.id_type!,
    id_number: p.id_number!.trim(),
    birthday: p.birthday,
    sex: p.sex,
  }));

  // ---- 1) 验价：换取可下单 offer_id + 锁定实时总价 ----
  let pricing;
  try {
    pricing = await priceFlight({
      search_offer_id: body.search_offer_id,
      passengers: passengerPayload,
    });
  } catch (e) {
    const err = e as LxApiError;
    return NextResponse.json(
      { ok: false, error: `验价失败：${err.message}`, authRelated: err.authRelated },
      { status: 502 }
    );
  }

  // ---- 2) 创建订单（user_pay）→ 拿 checkout_url ----
  const outTradeNo = `CF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const order = await createFlightOrder({
      out_trade_no: outTradeNo,
      offer_id: pricing.offer_id,
      contact: { name: contact.name.trim(), phone: contact.phone, email: contact.email },
      passengers: passengerPayload,
      pay_mode: "user_pay",
      return_url: `${req.nextUrl.origin}/?paid=1`,
    });

    if (!order.checkout_url) {
      return NextResponse.json(
        {
          ok: false,
          error: "下单成功但未返回收银台地址，请稍后重试",
          data: { system_no: order.system_no, status: order.status },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        checkout_url: order.checkout_url,
        system_no: order.system_no,
        out_trade_no: order.out_trade_no,
        status: order.status,
        total_amount: order.total_amount,
        pay_expire_time: order.pay_expire_time,
        // 验价阶段的实时总价（供前端展示）
        verified_total: pricing.total_fare,
        price_changed: pricing.price_changed,
      },
    });
  } catch (e) {
    const err = e as LxApiError;
    return NextResponse.json(
      { ok: false, error: `下单失败：${err.message}`, authRelated: err.authRelated },
      { status: 502 }
    );
  }
}

/* ---- 简易内存限流（单实例；生产可换 Redis） ---- */
const BUCKET = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 2;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = BUCKET.get(ip);
  if (!rec || now - rec.ts > WINDOW_MS) {
    BUCKET.set(ip, { count: 1, ts: now });
    return false;
  }
  rec.count++;
  return rec.count > MAX_PER_WINDOW;
}
