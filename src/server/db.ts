/**
 * SQLite 持久化（仅服务端使用）
 *
 * better-sqlite3 是同步 API，单连接 + WAL 模式：
 *  - API 路由（Next.js 服务端）和 cron / 自定义 server.ts 共用同一个连接
 *  - WAL 允许读写并发，避免 cron 写入时阻塞请求读取
 *
 * db 路径可由 DB_PATH 环境变量覆盖，默认 ./data/monitor.db
 */
import Database from "better-sqlite3";
import type { Database as DB } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("server/db 只能在服务端使用（会读写本地 SQLite 文件）");
  }
}

const DB_PATH = resolve(process.env.DB_PATH ?? "./data/monitor.db");

let _db: DB | null = null;

/** 获取单例连接（首次调用时建目录、开 WAL、跑迁移） */
export function getDb(): DB {
  assertServer();
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

/** 建表迁移：用 IF NOT EXISTS 做幂等，版本演进直接在这里追加 ALTER/CREATE */
function migrate(db: DB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      from_code TEXT NOT NULL,
      to_code TEXT NOT NULL,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      cabin_class TEXT NOT NULL DEFAULT 'economy',
      adult INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_alert_total INTEGER,
      last_alert_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id TEXT NOT NULL,
      from_code TEXT NOT NULL,
      to_code TEXT NOT NULL,
      from_city TEXT,
      to_city TEXT,
      date TEXT NOT NULL,
      flight_no TEXT NOT NULL,
      airline_name TEXT,
      adult_price INTEGER,
      airport_tax INTEGER,
      fuel_tax INTEGER,
      total INTEGER NOT NULL,
      dep_time TEXT,
      arr_time TEXT,
      duration_minutes INTEGER,
      cabin_name TEXT,
      search_offer_id TEXT,
      pushed INTEGER NOT NULL DEFAULT 0,
      seen INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_sub ON alerts(subscription_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_unseen ON alerts(seen, created_at DESC);
  `);

  // 订阅表增加 trip_mode 列（国内 / 国际），老库幂等迁移
  ensureColumn(db, "subscriptions", "trip_mode", "TEXT NOT NULL DEFAULT 'domestic'");
}

/** 幂等添加列：若列已存在则跳过（SQLite 不支持 IF NOT EXISTS 加列） */
function ensureColumn(db: DB, table: string, column: string, decl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
}
