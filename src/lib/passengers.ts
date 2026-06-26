"use client";

/**
 * 乘机人 / 联系人信息本地记忆（localStorage）
 * 方便用户复用，避免每次下单重复填写。
 *
 * - passengers：常用乘机人列表（最多 10 个，按最近使用排序）
 * - contact：上次使用的联系人（姓名 + 手机号）
 *
 * 注意：存储在浏览器本地，不上传服务端，不上传龙虾出行。
 */
import type { IdType, PassengerType } from "./types";

export interface StoredPassenger {
  name: string;
  type: PassengerType;
  id_type: IdType;
  id_number: string;
  phone: string;
  birthday?: string;
  sex?: 1 | 2;
}

export interface StoredContact {
  name: string;
  phone: string;
}

const PAX_KEY = "cheap-flights:passengers:v1";
const CONTACT_KEY = "cheap-flights:contact:v1";

/* ---------------- 乘机人 ---------------- */
export function loadPassengers(): StoredPassenger[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PAX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * 把本次填写的乘机人合并进记忆库（去重，最近使用置顶）。
 * 同名 + 同证件号视为同一人，更新其余字段。
 */
export function savePassengers(list: StoredPassenger[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAX_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* ignore */
  }
}

export function mergePassengers(
  current: StoredPassenger[],
  newlyUsed: StoredPassenger[]
): StoredPassenger[] {
  const merged = [...newlyUsed];
  for (const c of current) {
    const exists = merged.some(
      (m) => m.name === c.name && m.id_number === c.id_number
    );
    if (!exists) merged.push(c);
  }
  return merged.slice(0, 10);
}

/* ---------------- 联系人 ---------------- */
export function loadContact(): StoredContact | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c && typeof c.name === "string" && typeof c.phone === "string"
      ? c
      : null;
  } catch {
    return null;
  }
}

export function saveContact(c: StoredContact) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/* ---------------- 证件类型枚举 ---------------- */
export const ID_TYPE_LABELS: { value: IdType; label: string }[] = [
  { value: "ID_CARD", label: "身份证" },
  { value: "PASSPORT", label: "护照" },
  { value: "HK_MACAO_PERMIT", label: "港澳通行证" },
  { value: "TAIWAN_PERMIT", label: "台湾通行证" },
  { value: "HK_MACAO_TAIWAN_RESIDENCE_PERMIT", label: "港澳台居住证" },
  { value: "HOUSEHOLD_REGISTER", label: "户口本" },
  { value: "BIRTH_CERTIFICATE", label: "出生证" },
  { value: "SOLDIER_CARD", label: "军官证" },
  { value: "OTHER", label: "其他" },
];
