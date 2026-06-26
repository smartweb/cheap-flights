"use client";

import { useEffect } from "react";

/** 底部弹层：发丝遮罩 + 上滑卡片（Geist 弹层规范） */
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
        className="absolute inset-0 bg-black/40 overlay-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-h5 bg-white rounded-t-xl sheet-up bar-safe max-h-[90vh] overflow-y-auto no-scrollbar border-t border-gray-200">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-4 pb-3 z-10 border-b border-gray-100">
          <div className="mx-auto h-1 w-8 rounded-full bg-gray-200 mb-3" />
          {title && (
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 tracking-tightish">
                {title}
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
          )}
        </div>
        <div className="px-5 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

/** 加载图标（细线） */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 空状态：极简、低饱和 */
export function EmptyState({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="fade-in text-center py-20 px-6">
      <div className="mx-auto mb-5 h-12 w-12 grid place-items-center rounded-lg bg-gray-100 text-gray-400">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 16l5-2 4-8 4 8 5 2v2H3v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {desc && <div className="mt-1.5 text-xs text-gray-600 leading-relaxed max-w-[280px] mx-auto">{desc}</div>}
    </div>
  );
}

/** 小标签（状态用） */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-success-soft text-success-green",
    amber: "bg-warning-soft text-warning",
    red: "bg-danger-soft text-danger",
  };
  return (
    <span className={`inline-flex items-center text-2xs font-medium px-1.5 py-0.5 rounded ${tones[tone]}`}>
      {children}
    </span>
  );
}
