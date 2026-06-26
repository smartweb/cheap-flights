/**
 * 龙虾出行开放平台 — HTTP 客户端（仅服务端使用）
 *
 * 职责：
 *  - 注入 Bearer Token（来自 process.env.LX_API_TOKEN，绝不进入前端）
 *  - 超时控制、JSON 收发
 *  - 统一解析响应外壳（code === 0 视为成功）
 *  - 错误归一化（含鉴权 / 限流识别）
 *
 * 仅使用真实接口数据，不提供任何 mock 兜底。
 */

import type { LxEnvelope } from "./types";

const BASE = (process.env.LX_API_BASE ?? "https://api.longxiachuxing.com").replace(/\/$/, "");
const TOKEN = process.env.LX_API_TOKEN ?? "";
const TIMEOUT_MS = 15000;

export class LxApiError extends Error {
  code: number | string;
  httpStatus?: number;
  authRelated?: boolean;
  constructor(
    message: string,
    opts: { code?: number | string; httpStatus?: number; authRelated?: boolean } = {}
  ) {
    super(message);
    this.name = "LxApiError";
    this.code = opts.code ?? -1;
    this.httpStatus = opts.httpStatus;
    this.authRelated = opts.authRelated;
  }
}

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("lx/client 只能在服务端调用，禁止在前端使用（会泄露 token）");
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/** 调用上游接口，返回 data 字段；失败抛 LxApiError */
export async function callApi<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  assertServer();
  const { method = "GET", query, body } = opts;

  const url = new URL(BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    throw new LxApiError(`网络错误：${msg}（请检查 IP 白名单与网络）`, {
      code: "network",
      authRelated: true,
    });
  }
  clearTimeout(timer);

  const text = await res.text();
  let json: LxEnvelope<T> | null = null;
  try {
    json = text ? (JSON.parse(text) as LxEnvelope<T>) : null;
  } catch {
    // 非 JSON 响应
  }

  if (res.status === 401 || res.status === 403) {
    throw new LxApiError(`鉴权失败(${res.status})：请确认 token 有效、来源 IP 已加入白名单。`, {
      code: res.status,
      httpStatus: res.status,
      authRelated: true,
    });
  }
  if (res.status === 429) {
    throw new LxApiError("请求过于频繁，触发上游限流（QPS 限制）。", {
      code: 429,
      httpStatus: 429,
    });
  }

  if (json) {
    if (json.code === 0) {
      if (json.data === undefined) return undefined as unknown as T;
      return json.data;
    }
    throw new LxApiError(json.message ?? `业务错误 code=${json.code}`, {
      code: json.code ?? -1,
      httpStatus: res.status,
    });
  }

  throw new LxApiError(`上游服务异常(HTTP ${res.status})`, {
    code: res.status,
    httpStatus: res.status,
  });
}

export const lxConfig = { BASE, hasToken: !!TOKEN };
