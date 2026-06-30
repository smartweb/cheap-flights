"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ORIGIN_MAP, DESTINATION_MAP, dateLabel, hm } from "@/lib/catalog";
import { Spinner, EmptyState, Badge } from "@/components/ui";

interface Alert {
  id: number;
  subscription_id: string;
  from_code: string;
  to_code: string;
  from_city: string | null;
  to_city: string | null;
  date: string;
  flight_no: string;
  airline_name: string | null;
  total: number;
  dep_time: string | null;
  arr_time: string | null;
  duration_minutes: number | null;
  cabin_name: string | null;
  search_offer_id: string | null;
  pushed: boolean;
  seen: boolean;
  created_at: number;
}

export function AlertsClient() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setAlerts(json.data as Alert[]);
    } catch {
      /* ignore */
    } finally {
      setReady(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // 进入页面即标记全部已读（消除首页红点）
    fetch("/api/alerts", { method: "POST" }).catch(() => {});
  }, [reload]);

  // 下单：跳 /book，复用首页 goBook 的参数约定
  const goBook = useCallback(
    (a: Alert) => {
      if (!a.search_offer_id) return;
      const fromName = a.from_city ?? ORIGIN_MAP[a.from_code]?.name ?? a.from_code;
      const toName = a.to_city ?? DESTINATION_MAP[a.to_code]?.city ?? a.to_code;
      const q = new URLSearchParams({
        soid: a.search_offer_id,
        from: fromName,
        to: toName,
        fn: a.flight_no,
        al: a.airline_name ?? "",
        dep: a.dep_time ?? "",
        arr: a.arr_time ?? "",
        date: a.date,
        cabin: a.cabin_name ?? "",
        total: String(a.total),
      });
      router.push(`/book?${q.toString()}`);
    },
    [router]
  );

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => router.push("/subscriptions")}
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
        <h1 className="text-base font-semibold text-gray-900">告警记录</h1>
        <button
          onClick={reload}
          disabled={loading}
          className="btn-press ml-auto h-8 px-3 rounded-md border border-gray-200 hover:border-gray-400 text-xs font-medium text-gray-900 disabled:opacity-50"
        >
          {loading ? "…" : "刷新"}
        </button>
      </header>

      <div className="px-4 py-3 space-y-2.5">
        {ready && alerts.length === 0 && !loading && (
          <EmptyState
            title="还没有命中记录"
            desc="后台监控会定时扫描你订阅的航线，跌破阈值时会出现在这里。"
          />
        )}

        {alerts.map((a) => {
          const fromName = a.from_city ?? ORIGIN_MAP[a.from_code]?.name ?? a.from_code;
          const toName = a.to_city ?? DESTINATION_MAP[a.to_code]?.city ?? a.to_code;
          return (
            <div
              key={a.id}
              className="rounded-lg border border-gray-200 p-4 fade-in cursor-pointer btn-press"
              onClick={() => goBook(a)}
            >
              {/* 顶行：航线 + 金额 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {fromName} → {toName}
                    {!a.seen && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
                  </div>
                  <div className="text-2xs text-gray-600 mt-0.5">
                    {a.airline_name} {a.flight_no}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span className="text-xs font-medium text-gray-900">¥</span>
                    <span className="text-xl font-bold text-gray-900 tnum">{a.total}</span>
                  </div>
                  <div className="mt-0.5">
                    {a.pushed ? (
                      <Badge tone="green">已推送</Badge>
                    ) : (
                      <Badge tone="neutral">记录</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 时间 */}
              {(a.dep_time || a.arr_time) && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <span className="tnum">
                    {dateLabel(a.date)} {a.dep_time ? hm(a.dep_time) : ""}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="tnum">{a.arr_time ? hm(a.arr_time) : ""}</span>
                </div>
              )}

              {/* 底部：去抢票 */}
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-2xs text-gray-400 tnum">
                  {new Date(a.created_at).toLocaleString("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {a.search_offer_id ? (
                  <span className="text-2xs text-gray-900 font-medium">去抢票 →</span>
                ) : (
                  <span className="text-2xs text-gray-400">已过期</span>
                )}
              </div>
            </div>
          );
        })}

        {ready && alerts.length > 0 && (
          <p className="text-center text-2xs text-gray-400 pt-2">
            共 {alerts.length} 条命中 · 点击卡片可继续下单
          </p>
        )}
      </div>
    </main>
  );
}
