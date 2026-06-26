"use client";

import { useEffect } from "react";

/** 底部弹层容器：遮罩 + 上滑卡片 + 关闭交互 */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-h5 bg-canvas rounded-t-[28px] sheet-up bar-safe max-h-[88vh] overflow-y-auto no-scrollbar">
        <div className="sticky top-0 bg-canvas/95 backdrop-blur px-5 pt-3 pb-2 z-10 rounded-t-[28px]">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          {title && (
            <div className="mt-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <button
                onClick={onClose}
                className="btn-press h-8 w-8 grid place-items-center rounded-full bg-line/60 text-muted"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

/** 旋转加载图标 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`spin ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 空状态插画（emoji 风） */
export function EmptyState({
  emoji = "🛫",
  title,
  desc,
}: {
  emoji?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="fade-up text-center py-14 px-6">
      <div className="text-5xl mb-3">{emoji}</div>
      <div className="text-base font-semibold text-ink">{title}</div>
      {desc && <div className="mt-1.5 text-sm text-muted leading-relaxed">{desc}</div>}
    </div>
  );
}
