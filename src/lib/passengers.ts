"use client";

/**
 * 乘机人 / 联系人信息本地记忆（localStorage）
 * 方便用户复用，避免每次下单重复填写。
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

const KEY = "cheap-flights:passengers:v1";

export function loadPassengers(): StoredPassenger[] {
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

export function savePassengers(list: StoredPassenger[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* ignore */
  }
}

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
