"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ORIGIN_MAP, DESTINATION_MAP, dateLabel } from "@/lib/catalog";
import { DEFAULT_SETTINGS, useUserSettings } from "@/lib/settings";
import { Spinner, EmptyState, Badge } from "@/components/ui";
import { SubscriptionSheet } from "@/components/SubscriptionSheet";

interface Subscription {
  id: string;
  from_code: string;
  to_code: string;
  date_start: string;
  date_end: string;
  threshold: number;
  cabin_class: string;
  adult: number;
  enabled: boolean;
  created_at: number;
  last_alert_total: number | null;
  last_alert_at: number | null;
}

function spanDays(s: Subscription): number {
  return Math.round(
    (new Date(s.date_end + "T00:00:00").getTime() -
      new Date(s.date_start + "T00:00:00").getTime()) /
      86400000
  ) + 1;
}

export function SubscriptionsClient() {
  const router = useRouter();
  const { settings } = useUserSettings(DEFAULT_SETTINGS);

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    hit: number;
    pushed: number;
  } | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setSubs(json.data as Subscription[]);
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onScanNow = async () => {
    if (scanning) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/monitor", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setScanResult({
          hit: json.data.hit ?? 0,
          pushed: json.data.pushed ?? 0,
        });
        await reload();
      } else {
        setScanResult({ hit: 0, pushed: 0 });
      }
    } catch {
      setScanResult({ hit: 0, pushed: 0 });
    } finally {
      setScanning(false);
    }
  };

  const onAdd = async (d: {
    from_code: string;
    to_code: string;
    date_start: string;
    date_end: string;
    threshold: number;
  }) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "添加失败");
    await reload();
  };

  const onToggle = async (s: Subscription) => {
    setBusyId(s.id);
    try {
      await fetch(`/api/subscriptions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (s: Subscription) => {
    if (!confirm(`删除监控「${DESTINATION_MAP[s.to_code]?.city ?? s.to_code}」？`)) return;
    setBusyId(s.id);
    try {
      await fetch(`/api/subscriptions/${s.id}`, { method: "DELETE" });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="btn-press h-8 w-8 grid place-items-center rounded-md text-gray-900 hover:bg-gray-100"
          aria-label="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900">航线监控</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onScanNow}
            disabled={scanning}
            className="btn-press h-8 px-3 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {scanning ? (
              <>
                <Spinner className="text-white" />
                扫描中
              </>
            ) : (
              "立即扫描"
            )}
          </button>
          <button
            onClick={() => router.push("/alerts")}
            className="btn-press h-8 px-3 rounded-md border border-gray-200 hover:border-gray-400 text-xs font-medium text-gray-900"
          >
            告警记录
          </button>
        </div>
      </header>

      {/* 扫描结果提示 */}
      {scanResult && !scanning && (
        <div
          className={`mx-4 mt-3 rounded-md px-3.5 py-3 text-xs fade-in flex items-center justify-between ${
            scanResult.hit > 0
              ? "bg-success-soft text-success-green"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <span>
            {scanResult.hit > 0
              ? `扫到 ${scanResult.hit} 条新低价${
                  scanResult.pushed > 0 ? ` · 已推送 ${scanResult.pushed} 条` : ""
                }`
              : "本轮暂无新低价（订阅的航线都还在阈值之上）"}
          </span>
          {scanResult.hit > 0 && (
            <button
              onClick={() => router.push("/alerts")}
              className="btn-press font-medium underline underline-offset-2"
            >
              查看 →
            </button>
          )}
        </div>
      )}

      <div className="px-4 py-3 space-y-2.5">
        {ready && subs.length === 0 && (
          <EmptyState
            title="还没有监控的航线"
            desc="添加一条想去的航线，跌破你的价格预期时立刻通知你。"
          />
        )}

        {subs.map((s) => {
          const fromName = ORIGIN_MAP[s.from_code]?.name ?? s.from_code;
          const dest = DESTINATION_MAP[s.to_code];
          const toName = dest?.city ?? s.to_code;
          return (
            <div
              key={s.id}
              className={`rounded-lg border p-4 fade-in ${
                s.enabled ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {dest && <span className="text-base">{dest.emoji}</span>}
                    {fromName} → {toName}
                  </div>
                  <div className="text-2xs text-gray-600 mt-0.5">
                    {dest?.vibe}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span className="text-xs font-medium text-gray-900">≤¥</span>
                    <span className="text-xl font-bold text-gray-900 tnum">
                      {s.threshold}
                    </span>
                  </div>
                  {s.enabled ? (
                    <Badge tone="green">监控中</Badge>
                  ) : (
                    <Badge tone="neutral">已暂停</Badge>
                  )}
                </div>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                <span className="tnum">
                  {dateLabel(s.date_start)} – {dateLabel(s.date_end)} · {spanDays(s)}天
                </span>
                {s.last_alert_at && (
                  <span className="text-2xs text-gray-400">
                    上次命中 ¥{s.last_alert_total}
                  </span>
                )}
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-end gap-3">
                {busyId === s.id ? (
                  <Spinner className="text-gray-400" />
                ) : (
                  <>
                    <button
                      onClick={() => onToggle(s)}
                      className="btn-press text-2xs text-gray-500 hover:text-gray-900"
                    >
                      {s.enabled ? "暂停" : "启用"}
                    </button>
                    <button
                      onClick={() => onDelete(s)}
                      className="btn-press text-2xs text-gray-500 hover:text-danger"
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部添加按钮 */}
      <div className="fixed bottom-0 inset-x-0 bar-safe bg-white/95 backdrop-blur border-t border-gray-100">
        <div className="max-w-h5 mx-auto px-4 py-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="btn-press w-full rounded-md bg-gray-900 text-white font-medium py-3 text-sm hover:bg-gray-700 transition-colors"
          >
            + 新建监控航线
          </button>
        </div>
      </div>

      <SubscriptionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={onAdd}
        defaultFromCode={settings.from_code}
      />
    </main>
  );
}
