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

  // 每次打开同步外部最新值
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
          <div className="absolute inset-0 bg-black/40 fade-in" onClick={onClose} aria-hidden />
          <div className="relative w-full max-w-h5 bg-canvas rounded-t-[28px] sheet-up bar-safe max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="px-5 pt-3 pb-2 sticky top-0 bg-canvas/95 backdrop-blur rounded-t-[28px]">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-ink">⚙️ 监控设置</h3>
                <button
                  onClick={onClose}
                  className="btn-press h-8 w-8 grid place-items-center rounded-full bg-line/60 text-muted"
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-5 pb-7 space-y-6">
              {/* 出发城市 */}
              <section>
                <div className="eyebrow">出发城市</div>
                <div className="mt-2 text-sm text-muted">仅支持北上广深出发</div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {ORIGIN_CITIES.map((c) => {
                    const active = c.code === fromCode;
                    return (
                      <button
                        key={c.code}
                        onClick={() => setFromCode(c.code)}
                        className={`btn-press rounded-2xl py-3 flex flex-col items-center gap-1 border-2 transition ${
                          active
                            ? "border-brand bg-brand-soft"
                            : "border-line bg-card"
                        }`}
                      >
                        <span className="text-xl">{c.emoji}</span>
                        <span className={`text-sm font-semibold ${active ? "text-brand-deep" : "text-ink"}`}>
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 监控金额 */}
              <section>
                <div className="eyebrow">监控金额（含税总价）</div>
                <div className="mt-2 text-sm text-muted">
                  只推 <b className="text-coral-dark">¥{ceil}</b>（监控金额 ×110%）以下的机票
                </div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-2xl font-bold text-coral-dark mb-1">¥</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={100}
                    max={99999}
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(100, Number(e.target.value) || 0))}
                    className="flex-1 text-4xl font-bold tnum text-ink bg-transparent outline-none border-b-2 border-coral/40 focus:border-coral pb-1"
                  />
                  <span className="text-sm text-muted mb-2">/ 张</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {THRESHOLD_PRESETS.map((p) => {
                    const active = p === threshold;
                    return (
                      <button
                        key={p}
                        onClick={() => setThreshold(p)}
                        className={`btn-press px-3.5 py-1.5 rounded-full text-sm font-medium border ${
                          active
                            ? "border-coral bg-coral text-white"
                            : "border-line bg-card text-ink"
                        }`}
                      >
                        ¥{p}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-[12px] text-brand-deep leading-relaxed">
                  💡 小贴士：含税总价 = 票价 + 机建费（¥50）+ 燃油费。监控 500 元时，
                  会为你推 ≤550 元的机票，给你留一点抢票缓冲。
                </div>
              </section>

              {/* 保存 */}
              <button
                onClick={() => {
                  onSave({ from_code: fromCode, threshold });
                  onClose();
                }}
                className="btn-press w-full rounded-2xl bg-gradient-to-r from-brand to-brand-dark text-white font-bold py-3.5 text-base shadow-pop"
              >
                保存并刷新捡漏
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
