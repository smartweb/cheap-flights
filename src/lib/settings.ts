"use client";

import { useEffect, useState } from "react";

/**
 * 出发城市 / 阈值设置持久化（localStorage）
 *
 * v2: 区分国内阈值（threshold）与东南亚阈值（sea_threshold），随首页 Tab 独立记忆。
 *     老的 v1 key（cheap-flights:settings:v1）会被读取一次作为兜底迁移，再写入 v2。
 */
export interface UserSettings {
  from_code: string;
  threshold: number; // 国内阈值
  sea_threshold: number; // 东南亚阈值
}

const KEY = "cheap-flights:settings:v2";
const LEGACY_KEY = "cheap-flights:settings:v1";

/** 默认值（与 catalog 的默认阈值保持一致） */
export const DEFAULT_SETTINGS: UserSettings = {
  from_code: "SZX",
  threshold: 500,
  sea_threshold: 1200,
};

function migrateLegacy(): Partial<UserSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<{ from_code: string; threshold: number }>;
    const out: Partial<UserSettings> = {};
    if (p.from_code) out.from_code = p.from_code;
    if (typeof p.threshold === "number" && p.threshold > 0) out.threshold = p.threshold;
    return out;
  } catch {
    return null;
  }
}

export function loadSettings(fallback: UserSettings): UserSettings {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Partial<UserSettings>) : null;
    // 老 v1 用户：把 from_code / threshold 迁移过来
    const legacy = p ? null : migrateLegacy();
    const src = { ...(legacy ?? {}) };
    if (p) Object.assign(src, p);
    return {
      from_code: src.from_code || fallback.from_code,
      threshold:
        typeof src.threshold === "number" && src.threshold > 0
          ? src.threshold
          : fallback.threshold,
      sea_threshold:
        typeof src.sea_threshold === "number" && src.sea_threshold > 0
          ? src.sea_threshold
          : fallback.sea_threshold,
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(s: UserSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** 仅在客户端读取一次设置，避免 SSR/CSR 水合不一致 */
export function useUserSettings(fallback: UserSettings) {
  const [settings, setSettings] = useState<UserSettings>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings(fallback));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { settings, setSettings, ready };
}
