"use client";

/**
 * 本机订单记录（localStorage）
 *
 * 应用无登录态，订单 API 需按 system_no/out_trade_no 查询，
 * 因此下单成功后把订单号 + 摘要记到本地，用于「我的订单」入口回查实时状态。
 * 实时状态（支付/出票）由服务端调 /open/v1/flight/order/detail 获取。
 */

export interface LocalOrder {
  system_no: string;
  out_trade_no: string;
  created_at: number; // 本地下单时间戳
  // 下单时的摘要（便于离线展示）
  from_city: string;
  to_city: string;
  date: string;
  flight_no: string;
  airline_name: string;
  verified_total: number; // 验价后总价
}

const KEY = "cheap-flights:orders:v1";
const MAX = 30;

export function loadOrders(): LocalOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: LocalOrder) {
  if (typeof window === "undefined") return;
  try {
    const list = loadOrders().filter(
      (o) => o.system_no !== order.system_no
    );
    list.unshift(order);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function removeOrder(systemNo: string) {
  if (typeof window === "undefined") return;
  try {
    const list = loadOrders().filter((o) => o.system_no !== systemNo);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
