"use client";

import { useState } from "react";
import { ORIGIN_CITIES } from "@/lib/catalog";
import type { UserSettings } from "@/lib/settings";

const THRESHOLD_PRESETS = [300, 500, 800, 1000, 1500];

export function SettingsSheet({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (s: UserSettings) => void;
}) {
  const [fromCode, setFromCode] = useState(settings.from_code);
  const [threshold, setThreshold] = useState(settings.threshold);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setFromCode(settings.from_code);
      setThreshold(settings.threshold);
    }
  }

  const ceil = Math.round(threshold * 1.1);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 overlay-in" onClick={onClose} aria-hidden />
          <div className="relative w-full max-w-h5 bg-white rounded-t-xl sheet-up bar-safe max-h-[90vh] overflow-y-auto no-scrollbar border-t border-gray-200">
            <div className="px-5 pt-4 pb-3 sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 z-10">
              <div className="mx-auto h-1 w-8 rounded-full bg-gray-200 mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 tracking-tightish">
                  监控设置
                </h3>
                <button
                  onClick={onClose}
                  className="btn-press h-7 w-7 grid place-items-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  aria-label="关闭"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-5 pb-7 pt-5 space-y-7">
              {/* 出发城市 */}
              <section>
                <label className="block text-xs font-medium text-gray-900">出发城市</label>
                <p className="mt-1 text-2xs text-gray-600">仅支持北上广深出发</p>
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

              {/* 监控金额 */}
              <section>
                <label className="block text-xs font-medium text-gray-900">
                  监控金额（含税总价）
                </label>
                <p className="mt-1 text-2xs text-gray-600">
                  只推 <span className="font-semibold text-gray-900">¥{ceil}</span>（监控金额 × 110%）以下的机票
                </p>
                <div className="mt-3 flex items-baseline gap-1 border-b-2 border-gray-200 focus-within:border-gray-900 pb-1.5 transition-colors">
                  <span className="text-lg font-semibold text-gray-900">¥</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={100}
                    max={99999}
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(100, Number(e.target.value) || 0))}
                    className="flex-1 w-0 text-3xl font-bold tnum text-gray-900 bg-transparent outline-none tracking-tighter"
                  />
                  <span className="text-xs text-gray-600">/ 张</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {THRESHOLD_PRESETS.map((p) => {
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
                <div className="mt-4 rounded-md bg-gray-100 px-3.5 py-3 text-2xs text-gray-700 leading-relaxed">
                  含税总价 = 票价 + 机建费（¥50）+ 燃油费。监控 ¥500 时，
                  会推送 ≤ ¥550 的机票，留一点抢票缓冲。
                </div>
              </section>

              <button
                onClick={() => {
                  onSave({ from_code: fromCode, threshold });
                  onClose();
                }}
                className="btn-press w-full rounded-md bg-gray-900 text-white font-medium py-3 text-sm hover:bg-gray-700 transition-colors"
              >
                保存并刷新
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
