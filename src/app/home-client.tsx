"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FlightDeal } from "@/lib/deal";
import {
  DEFAULT_ORIGIN_CODE,
  DEFAULT_THRESHOLD,
  ORIGIN_MAP,
  pushCeil,
} from "@/lib/catalog";
import { useUserSettings } from "@/lib/settings";
import { DealCard } from "@/components/DealCard";
import { DealDetailSheet } from "@/components/DealDetailSheet";
import { SettingsSheet } from "@/components/SettingsSheet";
import { Spinner, EmptyState, Badge } from "@/components/ui";

interface ScanMeta {
  from_code: string;
  threshold: number;
  ceil: number;
  total_deals: number;
  destinations_scanned: number;
  auth_error: boolean;
}

type SortKey = "price" | "time" | "duration";

export function HomeClient() {
  const { settings, setSettings, ready } = useUserSettings({
    from_code: DEFAULT_ORIGIN_CODE,
    threshold: DEFAULT_THRESHOLD,
  });

  const [deals, setDeals] = useState<FlightDeal[]>([]);
  const [meta, setMeta] = useState<ScanMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<FlightDeal | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("price");
  const inFlight = useRef(false);
  const router = useRouter();

  const ceil = pushCeil(settings.threshold);
  const origin = ORIGIN_MAP[settings.from_code];

  const sortDeals = useCallback((arr: FlightDeal[], key: SortKey): FlightDeal[] => {
    const out = [...arr];
    if (key === "price") out.sort((a, b) => a.total - b.total);
    else if (key === "time") out.sort((a, b) => a.dep_time.localeCompare(b.dep_time));
    else out.sort((a, b) => (a.duration_minutes ?? 9e9) - (b.duration_minutes ?? 9e9));
    return out;
  }, []);

  const runScan = useCallback(
    async (s: { from_code: string; threshold: number }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from_code: s.from_code, threshold: s.threshold }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "扫描失败");
        setDeals(sortDeals(json.data.deals as FlightDeal[], sort));
        setMeta(json.data.meta as ScanMeta);
        setLastUpdated(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : "扫描失败，请稍后重试");
        setDeals([]);
      } finally {
        setLoading(false);
        inFlight.current = false;
      }
    },
    [sort, sortDeals]
  );

  useEffect(() => {
    if (ready) runScan(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const onSort = (key: SortKey) => {
    setSort(key);
    setDeals((prev) => sortDeals(prev, key));
  };

  // 进入下单流程：携带 deal 摘要 + search_offer_id 跳转 /book
  const goBook = useCallback(
    (deal: FlightDeal) => {
      const q = new URLSearchParams({
        soid: deal.search_offer_id,
        from: deal.from_city,
        to: deal.to_city,
        fn: deal.flight_no,
        al: deal.airline_name,
        dep: deal.dep_time,
        arr: deal.arr_time,
        date: deal.date,
        cabin: deal.cabin_name,
        total: String(deal.total),
      });
      setActiveDeal(null);
      router.push(`/book?${q.toString()}`);
    },
    [router]
  );

  const belowBudgetCount = useMemo(
    () => deals.filter((d) => d.total <= settings.threshold).length,
    [deals, settings.threshold]
  );

  return (
    <main className="min-h-screen pb-safe">
      {/* 顶部：极简品牌头 */}
      <header className="px-5 pt-[calc(20px+var(--safe-top))] pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tighter">特价机票</h1>
            <p className="text-2xs text-gray-600 mt-0.5">低于预算就推送 · 龙虾出行数据</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="btn-press h-8 px-3 rounded-md border border-gray-200 hover:border-gray-400 text-xs font-medium text-gray-900 flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            设置
          </button>
        </div>

        {/* 状态条：出发地 + 阈值 */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="btn-press mt-4 w-full bg-white rounded-lg border border-gray-200 hover:border-gray-400 px-4 py-3 flex items-center divide-x divide-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2 pr-4">
            <span className="text-2xs text-gray-600">出发</span>
            <span className="text-sm font-semibold text-gray-900">{origin?.name ?? "深圳"}</span>
          </div>
          <div className="flex items-center gap-2 px-4 flex-1">
            <span className="text-2xs text-gray-600">监控</span>
            <span className="text-sm font-semibold text-gray-900 tnum">¥{settings.threshold}</span>
            <span className="text-2xs text-gray-500">推 ≤ ¥{ceil}</span>
          </div>
          <svg className="text-gray-400 ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* 工具条：刷新 + 排序 */}
      <div className="px-5 py-2.5 flex items-center gap-2 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-20">
        <button
          onClick={() => runScan(settings)}
          disabled={loading}
          className="btn-press flex items-center gap-1.5 px-3 h-7 rounded-md border border-gray-200 hover:border-gray-400 text-xs font-medium text-gray-900 disabled:opacity-50"
        >
          {loading ? <Spinner /> : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {loading ? "扫描中" : "刷新"}
        </button>
        <div className="ml-auto flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
          {(["price", "time", "duration"] as const).map((k) => (
            <button
              key={k}
              onClick={() => onSort(k)}
              className={`px-2.5 h-6 rounded text-2xs font-medium transition ${
                sort === k ? "bg-white text-gray-900 shadow-xs" : "text-gray-600"
              }`}
            >
              {k === "price" ? "价格" : k === "time" ? "时间" : "时长"}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <section className="px-4 py-3 space-y-2.5">
        {loading && deals.length === 0 && (
          <>
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 text-xs text-gray-900 font-medium">
                <Spinner className="text-gray-900" />
                正在扫描未来 7 天特价…
              </div>
            </div>
            <DealSkeletons />
          </>
        )}

        {!loading && error && (
          <EmptyState
            title="扫描出错了"
            desc={error}
          />
        )}

        {!loading && !error && deals.length === 0 && (
          <EmptyState
            title={`暂无低于 ¥${ceil} 的机票`}
            desc={`从${origin?.name ?? "深圳"}出发的各目的地含税价都高于 ¥${ceil}。可调高监控金额，或过几天再来。`}
          />
        )}

        {deals.length > 0 && (
          <>
            <div className="px-1 flex items-center gap-2 text-2xs text-gray-600">
              <span className="text-gray-900 font-semibold">{deals.length} 张特价</span>
              {belowBudgetCount > 0 && (
                <Badge tone="green">{belowBudgetCount} 张低于预算</Badge>
              )}
              {lastUpdated && (
                <span className="ml-auto text-gray-500">
                  {new Date(lastUpdated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {deals.map((d, i) => (
              <DealCard
                key={d.id}
                deal={d}
                threshold={settings.threshold}
                index={i}
                onClick={() => setActiveDeal(d)}
              />
            ))}
          </>
        )}
      </section>

      <footer className="mt-4 px-5 py-6 border-t border-gray-100">
        <p className="text-center text-2xs text-gray-500 leading-relaxed">
          价格含机建燃油，为参考价；以下单时实时验价为准。<br />
          数据由龙虾出行开放平台提供，仅支持北上广深出发。
        </p>
      </footer>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={(s) => {
          setSettings(s);
          runScan(s);
        }}
      />
      <DealDetailSheet deal={activeDeal} onClose={() => setActiveDeal(null)} onBook={goBook} />
    </main>
  );
}

function DealSkeletons() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-3 w-32" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-6 w-16" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
          <div className="my-3 h-px bg-gray-100" />
          <div className="flex justify-between">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}
