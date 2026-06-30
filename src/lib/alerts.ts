/**
 * 告警记录查询（仅服务端使用）
 *
 * 供「告警记录」页和首页红点徽章使用。
 * cron 写入 alerts 表后，前端通过 /api/alerts 读取。
 */
import { getDb } from "@/server/db";

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("lib/alerts 只能在服务端使用");
  }
}

export interface Alert {
  id: number;
  subscription_id: string;
  from_code: string;
  to_code: string;
  from_city: string | null;
  to_city: string | null;
  date: string;
  flight_no: string;
  airline_name: string | null;
  adult_price: number | null;
  airport_tax: number | null;
  fuel_tax: number | null;
  total: number;
  dep_time: string | null;
  arr_time: string | null;
  duration_minutes: number | null;
  cabin_name: string | null;
  search_offer_id: string | null;
  pushed: boolean;
  seen: boolean;
  created_at: number;
}

interface AlertRow {
  id: number;
  subscription_id: string;
  from_code: string;
  to_code: string;
  from_city: string | null;
  to_city: string | null;
  date: string;
  flight_no: string;
  airline_name: string | null;
  adult_price: number | null;
  airport_tax: number | null;
  fuel_tax: number | null;
  total: number;
  dep_time: string | null;
  arr_time: string | null;
  duration_minutes: number | null;
  cabin_name: string | null;
  search_offer_id: string | null;
  pushed: number;
  seen: number;
  created_at: number;
}

function rowToAlert(r: AlertRow): Alert {
  return { ...r, pushed: !!r.pushed, seen: !!r.seen };
}

/** 列出最近告警（默认 50 条，最新在前） */
export function listAlerts(limit = 50): Alert[] {
  assertServer();
  const rows = getDb()
    .prepare(`SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?`)
    .all(Math.max(1, Math.min(200, limit))) as AlertRow[];
  return rows.map(rowToAlert);
}

/** 未读告警条数（首页红点用） */
export function countUnseen(): number {
  assertServer();
  const r = getDb().prepare(`SELECT COUNT(*) AS c FROM alerts WHERE seen = 0`).get() as {
    c: number;
  };
  return r.c;
}

/** 标记单条为已读 */
export function markSeen(id: number): void {
  assertServer();
  getDb().prepare(`UPDATE alerts SET seen = 1 WHERE id = ?`).run(id);
}

/** 标记全部已读 */
export function markAllSeen(): number {
  assertServer();
  const r = getDb().prepare(`UPDATE alerts SET seen = 1 WHERE seen = 0`).run();
  return r.changes;
}

/** 标记某条告警的 Bark 推送结果（cron 用） */
export function markPushed(id: number, ok: boolean): void {
  assertServer();
  getDb().prepare(`UPDATE alerts SET pushed = ? WHERE id = ?`).run(ok ? 1 : 0, id);
}
