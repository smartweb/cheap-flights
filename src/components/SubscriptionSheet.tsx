"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui";
import {
  ORIGIN_CITIES,
  DOMESTIC_DESTINATIONS,
  SEA_DESTINATIONS,
  DEFAULT_THRESHOLD,
  DEFAULT_SEA_THRESHOLD,
  scopeOf,
  pushCeil,
  type DestScope,
} from "@/lib/catalog";

/** 按 scope 区分的阈值预设档（元） */
const THRESHOLD_PRESETS: Record<DestScope, number[]> = {
  domestic: [300, 500, 800, 1000, 1500],
  international: [800, 1200, 2000, 3000, 4000],
};

const SCOPE_LABEL: Record<DestScope, string> = {
  domestic: "国内热门",
  international: "东南亚",
};

export interface SubscriptionDraft {
  from_code: string;
  to_code: string;
  date_start: string;
  date_end: string;
  threshold: number;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function plusDaysStr(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function SubscriptionSheet({
  open,
  onClose,
  onSubmit,
  defaultFromCode,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (d: SubscriptionDraft) => Promise<void>;
  defaultFromCode?: string;
}) {
  const today = todayStr();
  const [fromCode, setFromCode] = useState(defaultFromCode ?? "SZX");
  const [toCode, setToCode] = useState("");
  const [dateStart, setDateStart] = useState(today);
  const [dateEnd, setDateEnd] = useState(plusDaysStr(today, 14));
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开时重置为默认值
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setFromCode(defaultFromCode ?? "SZX");
      setToCode("");
      setDateStart(today);
      setDateEnd(plusDaysStr(today, 14));
      setThreshold(DEFAULT_THRESHOLD);
      setError(null);
      setSubmitting(false);
    }
  }

  const ceil = pushCeil(threshold);
  const spanDays =
    (new Date(dateEnd + "T00:00:00").getTime() -
      new Date(dateStart + "T00:00:00").getTime()) /
    86400000;
  const spanInvalid = spanDays < 0 || spanDays > 30;
  const canSubmit = !!toCode && !spanInvalid && !submitting;

  // 当前所选目的地的 scope，决定阈值预设档
  const toScope: DestScope = toCode ? scopeOf(toCode) : "domestic";
  const presets = THRESHOLD_PRESETS[toScope];

  /** 选择目的地：切换时若阈值仍为另一 scope 的默认值，则同步切到当前 scope 默认值 */
  const pickTo = (code: string) => {
    const next = code === toCode ? "" : code;
    setToCode(next);
    if (next) {
      const sc = scopeOf(next);
      const stillDefault =
        (sc === "domestic" && threshold === DEFAULT_SEA_THRESHOLD) ||
        (sc === "international" && threshold === DEFAULT_THRESHOLD);
      if (stillDefault) setThreshold(sc === "international" ? DEFAULT_SEA_THRESHOLD : DEFAULT_THRESHOLD);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        from_code: fromCode,
        to_code: toCode,
        date_start: dateStart,
        date_end: dateEnd,
        threshold,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="新建监控航线">
      <div className="space-y-7">
        {/* 出发城市 */}
        <section>
          <label className="block text-xs font-medium text-gray-900">出发城市</label>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {ORIGIN_CITIES.map((c) => {
              const active = c.code === fromCode;
              return (
                <button
                  key={c.code}
                  onClick={() => setFromCode(c.code)}
                  className={`btn-press rounded-md py-2.5 text-sm font-medium border transition ${
                    active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* 目的地 */}
        <section>
          <label className="block text-xs font-medium text-gray-900">目的地</label>
          <p className="mt-1 text-2xs text-gray-600">选择一个想去的城市</p>
          <div className="mt-3 max-h-64 overflow-y-auto no-scrollbar space-y-3">
            {([
              { scope: "domestic" as const, list: DOMESTIC_DESTINATIONS },
              { scope: "international" as const, list: SEA_DESTINATIONS },
            ]).map(({ scope: sc, list }) => (
              <div key={sc}>
                <div className="text-2xs font-semibold text-gray-500 mb-1.5 px-0.5">
                  {SCOPE_LABEL[sc]}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {list.filter((d) => d.code !== fromCode).map((d) => {
                    const active = d.code === toCode;
                    return (
                      <button
                        key={d.code}
                        onClick={() => pickTo(d.code)}
                        className={`btn-press rounded-md py-2 px-1 text-xs font-medium border text-center transition ${
                          active
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                        }`}
                      >
                        <div className="text-base leading-none">{d.emoji}</div>
                        <div className="mt-1">{d.city}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 日期窗口 */}
        <section>
          <label className="block text-xs font-medium text-gray-900">出发日期范围</label>
          <p className="mt-1 text-2xs text-gray-600">
            监控这段区间内任意一天跌破阈值的票（最多 30 天）
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              value={dateStart}
              min={today}
              onChange={(e) => setDateStart(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none tnum"
            />
            <span className="text-gray-400 text-xs">至</span>
            <input
              type="date"
              value={dateEnd}
              min={dateStart}
              onChange={(e) => setDateEnd(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none tnum"
            />
          </div>
          {spanInvalid && (
            <p className="mt-1.5 text-2xs text-danger">
              日期窗口需在 0–30 天内
            </p>
          )}
        </section>

        {/* 阈值 */}
        <section>
          <label className="block text-xs font-medium text-gray-900">
            告警金额（含税总价）
          </label>
          <p className="mt-1 text-2xs text-gray-600">
            票价 ≤ <span className="font-semibold text-gray-900">¥{ceil}</span>（金额 × 110%）时通知你
          </p>
          <div className="mt-3 flex items-baseline gap-1 border-b-2 border-gray-200 focus-within:border-gray-900 pb-1.5 transition-colors">
            <span className="text-lg font-semibold text-gray-900">¥</span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={99999}
              value={threshold}
              onChange={(e) =>
                setThreshold(Math.max(100, Number(e.target.value) || 0))
              }
              className="flex-1 w-0 text-3xl font-bold tnum text-gray-900 bg-transparent outline-none tracking-tighter"
            />
            <span className="text-xs text-gray-600">/ 张</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((p) => {
              const active = p === threshold;
              return (
                <button
                  key={p}
                  onClick={() => setThreshold(p)}
                  className={`btn-press px-3 py-1 rounded-md text-xs font-medium border tnum transition ${
                    active
                      ? "border-gray-900 bg-gray-100 text-gray-900"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  ¥{p}
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <p className="text-xs text-danger fade-in">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="btn-press w-full rounded-md bg-gray-900 text-white font-medium py-3 text-sm hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "添加中…" : "开始监控"}
        </button>
      </div>
    </Sheet>
  );
}
