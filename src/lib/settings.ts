"use client";

import { useEffect, useState } from "react";

/**
 * 出发城市 / 阈值设置持久化（localStorage）
 */
export interface UserSettings {
  from_code: string;
  threshold: number;
}

const KEY = "cheap-flights:settings:v1";

export function loadSettings(fallback: UserSettings): UserSettings {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<UserSettings>;
    return {
      from_code: p.from_code || fallback.from_code,
      threshold:
        typeof p.threshold === "number" && p.threshold > 0
          ? p.threshold
          : fallback.threshold,
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
