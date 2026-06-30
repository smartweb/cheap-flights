/**
 * 航线订阅 CRUD（仅服务端使用）
 *
 * 订阅 = 一个出发→目的城市对 + 日期窗口 + 阈值。
 * 服务端 cron 据此扫描，命中阈值则写入 alerts + 推送。
 *
 * 与 orders.ts 不同，订阅存服务端 SQLite（cron 读得到），
 * 不放 localStorage（浏览器关闭后 cron 拿不到）。
 */
import { getDb } from "@/server/db";

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("lib/subscriptions 只能在服务端使用");
  }
}

export interface Subscription {
  id: string;
  from_code: string;
  to_code: string;
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  threshold: number;
  cabin_class: string;
  adult: number;
  /** 国内 / 国际（决定 cron 扫描时传给上游的 trip_mode） */
  trip_mode: "domestic" | "international";
  enabled: boolean;
  created_at: number;
  last_alert_total: number | null;
  last_alert_at: number | null;
}

interface SubscriptionRow {
  id: string;
  from_code: string;
  to_code: string;
  date_start: string;
  date_end: string;
  threshold: number;
  cabin_class: string;
  adult: number;
  trip_mode: string;
  enabled: number;
  created_at: number;
  last_alert_total: number | null;
  last_alert_at: number | null;
}

function rowToSub(r: SubscriptionRow): Subscription {
  return {
    ...r,
    trip_mode: r.trip_mode === "international" ? "international" : "domestic",
    enabled: !!r.enabled,
    last_alert_total: r.last_alert_total,
    last_alert_at: r.last_alert_at,
  };
}

/** 列出全部订阅（默认按创建时间倒序） */
export function listSubscriptions(): Subscription[] {
  assertServer();
  const rows = getDb()
    .prepare(`SELECT * FROM subscriptions ORDER BY created_at DESC`)
    .all() as SubscriptionRow[];
  return rows.map(rowToSub);
}

/** 仅启用的订阅（cron 用） */
export function listEnabledSubscriptions(): Subscription[] {
  assertServer();
  const rows = getDb()
    .prepare(`SELECT * FROM subscriptions WHERE enabled = 1 ORDER BY created_at DESC`)
    .all() as SubscriptionRow[];
  return rows.map(rowToSub);
}

export interface NewSubscription {
  from_code: string;
  to_code: string;
  date_start: string;
  date_end: string;
  threshold: number;
  cabin_class?: string;
  adult?: number;
  /** 国内 / 国际（默认 domestic） */
  trip_mode?: "domestic" | "international";
}

/** 新增订阅，返回完整记录 */
export function addSubscription(input: NewSubscription): Subscription {
  assertServer();
  const id = `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const trip_mode = input.trip_mode === "international" ? "international" : "domestic";
  const sub: SubscriptionRow = {
    id,
    from_code: input.from_code,
    to_code: input.to_code,
    date_start: input.date_start,
    date_end: input.date_end,
    threshold: input.threshold,
    cabin_class: input.cabin_class ?? "economy",
    adult: input.adult ?? 1,
    trip_mode,
    enabled: 1,
    created_at: Date.now(),
    last_alert_total: null,
    last_alert_at: null,
  };
  getDb()
    .prepare(
      `INSERT INTO subscriptions
        (id, from_code, to_code, date_start, date_end, threshold, cabin_class, adult, trip_mode, enabled, created_at)
       VALUES (@id, @from_code, @to_code, @date_start, @date_end, @threshold, @cabin_class, @adult, @trip_mode, @enabled, @created_at)`
    )
    .run(sub);
  return rowToSub(sub);
}

/** 删除订阅（连同其告警记录一并清理） */
export function removeSubscription(id: string): boolean {
  assertServer();
  const db = getDb();
  const r = db.prepare(`DELETE FROM subscriptions WHERE id = ?`).run(id);
  if (r.changes > 0) {
    db.prepare(`DELETE FROM alerts WHERE subscription_id = ?`).run(id);
  }
  return r.changes > 0;
}

/** 切换启用 / 暂停 */
export function setSubscriptionEnabled(id: string, enabled: boolean): boolean {
  assertServer();
  const r = getDb()
    .prepare(`UPDATE subscriptions SET enabled = ? WHERE id = ?`)
    .run(enabled ? 1 : 0, id);
  return r.changes > 0;
}

/** 记录一次告警（供 cron 调用） */
export function recordAlert(
  sub: Subscription,
  a: {
    date: string;
    flight_no: string;
    airline_name?: string;
    from_city?: string;
    to_city?: string;
    adult_price?: number;
    airport_tax?: number;
    fuel_tax?: number;
    total: number;
    dep_time?: string;
    arr_time?: string;
    duration_minutes?: number;
    cabin_name?: string;
    search_offer_id?: string;
  }
): number {
  assertServer();
  const r = getDb()
    .prepare(
      `INSERT INTO alerts
        (subscription_id, from_code, to_code, from_city, to_city, date, flight_no, airline_name,
         adult_price, airport_tax, fuel_tax, total, dep_time, arr_time, duration_minutes,
         cabin_name, search_offer_id, pushed, seen, created_at)
       VALUES (@subscription_id, @from_code, @to_code, @from_city, @to_city, @date, @flight_no, @airline_name,
         @adult_price, @airport_tax, @fuel_tax, @total, @dep_time, @arr_time, @duration_minutes,
         @cabin_name, @search_offer_id, 0, 0, @created_at)`
    )
    .run({
      subscription_id: sub.id,
      from_code: sub.from_code,
      to_code: sub.to_code,
      from_city: a.from_city ?? null,
      to_city: a.to_city ?? null,
      date: a.date,
      flight_no: a.flight_no,
      airline_name: a.airline_name ?? null,
      adult_price: a.adult_price ?? null,
      airport_tax: a.airport_tax ?? null,
      fuel_tax: a.fuel_tax ?? null,
      total: a.total,
      dep_time: a.dep_time ?? null,
      arr_time: a.arr_time ?? null,
      duration_minutes: a.duration_minutes ?? null,
      cabin_name: a.cabin_name ?? null,
      search_offer_id: a.search_offer_id ?? null,
      created_at: Date.now(),
    });
  return Number(r.lastInsertRowid);
}

/** 更新订阅的上次告警价格/时间（去重用） */
export function updateLastAlert(id: string, total: number): void {
  assertServer();
  getDb()
    .prepare(`UPDATE subscriptions SET last_alert_total = ?, last_alert_at = ? WHERE id = ?`)
    .run(total, Date.now(), id);
}
