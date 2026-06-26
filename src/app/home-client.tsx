"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlightDeal } from "@/lib/deal";
import {
  DEFAULT_ORIGIN_CODE,
  DEFAULT_THRESHOLD,
  ORIGIN_MAP,
  dateLabel,
  pushCeil,
} from "@/lib/catalog";
import { useUserSettings } from "@/lib/settings";
import { DealCard } from "@/components/DealCard";
import { DealDetailSheet } from "@/components/DealDetailSheet";
import { SettingsSheet } from "@/components/SettingsSheet";
import { Spinner, EmptyState } from "@/components/ui";

interface ScanMeta {
  from_code: string;
  threshold: number;
  ceil: number;
  total_deals: number;
  destinations_scanned: number;
  auth_error: boolean;
}

/** 未来 7 天日期条 */
function buildDateStrip(): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
  }
  return out;
}

export function HomeClient() {
  const { settings, setSettings, ready } = useUserSettings({
    from_code: DEFAULT_ORIGIN_CODE,
    threshold: DEFAULT_THRESHOLD,
  });

  const [dateStrip] = useState<string[]>(() => buildDateStrip());
  const [deals, setDeals] = useState<FlightDeal[]>([]);
  const [meta, setMeta] = useState<ScanMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<FlightDeal | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const inFlight = useRef(false);

  const ceil = pushCeil(settings.threshold);
  const origin = ORIGIN_MAP[settings.from_code];

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
        setDeals(json.data.deals as FlightDeal[]);
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
    []
  );

  // 设置就绪后首次扫描
  useEffect(() => {
    if (ready) runScan(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const onSort = (key: "price" | "time" | "duration") => {
    setDeals((prev) => {
      const arr = [...prev];
      if (key === "price") arr.sort((a, b) => a.total - b.total);
      else if (key === "time") arr.sort((a, b) => a.dep_time.localeCompare(b.dep_time));
      else arr.sort((a, b) => (a.duration_minutes ?? 9e9) - (b.duration_minutes ?? 9e9));
      return arr;
    });
  };

  const belowBudgetCount = useMemo(
    () => deals.filter((d) => d.total <= settings.threshold).length,
    [deals, settings.threshold]
  );

  return (
    <main className="min-h-screen pb-safe">
      {/* 顶部品牌区 */}
      <header className="px-5 pt-[calc(16px+var(--safe-top))] pb-4 bg-gradient-to-b from-brand-soft/70 to-canvas">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦞</span>
            <div>
              <h1 className="text-lg font-bold text-ink leading-tight">捡漏机票</h1>
              <p className="text-[11px] text-muted leading-tight">龙虾出行 · 特价监控</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="btn-press h-9 px-3 rounded-full bg-card border border-line shadow-soft flex items-center gap-1.5 text-sm font-medium text-ink"
          >
            <span className="text-base">⚙️</span>
            <span className="hidden sm:inline">设置</span>
          </button>
        </div>

        {/* 出发地 + 阈值胶囊 */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="btn-press mt-3 w-full bg-card rounded-xl2 border border-line/70 shadow-soft px-4 py-2.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{origin?.emoji ?? "🏙️"}</span>
            <div className="text-left">
              <div className="text-[11px] text-muted leading-none">出发</div>
              <div className="text-sm font-bold text-ink mt-0.5">{origin?.name ?? "深圳"}出发</div>
            </div>
          </div>
          <div className="h-8 w-px bg-line mx-2" />
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">🎯</span>
            <div className="text-left">
              <div className="text-[11px] text-muted leading-none">监控金额</div>
              <div className="text-sm font-bold text-coral-dark mt-0.5 tnum">
                ¥{settings.threshold} <span className="text-[11px] font-normal text-muted">· 推 ≤¥{ceil}</span>
              </div>
            </div>
          </div>
          <span className="text-muted text-sm ml-2">›</span>
        </button>
      </header>

      {/* 操作条 */}
      <div className="px-5 sticky top-0 z-20 bg-canvas/90 backdrop-blur py-2.5 flex items-center gap-2 border-b border-line/60">
        <button
          onClick={() => runScan(settings)}
          disabled={loading}
          className="btn-press flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand text-white text-sm font-semibold disabled:opacity-60"
        >
          {loading ? <Spinner className="text-white" /> : <span>🔄</span>}
          {loading ? "扫描中" : "刷新"}
        </button>
        <div className="ml-auto flex items-center gap-1 bg-card border border-line rounded-full p-0.5">
          {(["price", "time", "duration"] as const).map((k) => (
            <SortBtn key={k} k={k} onSort={onSort} />
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <section className="px-4 pt-3 space-y-3">
        {loading && deals.length === 0 && (
          <>
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 text-sm text-brand-deep font-medium">
                <Spinner className="text-brand" />
                正在全网捡漏，约 10 秒…
              </div>
              <div className="mt-1 text-[11px] text-muted">扫描未来 7 天 × 全国热门目的地</div>
            </div>
            <DealSkeletons />
          </>
        )}

        {!loading && error && (
          <EmptyState
            emoji="😵‍💫"
            title="扫描出错了"
            desc={error + "（已检查 IP 白名单与 token 后重试）"}
          />
        )}

        {!loading && !error && deals.length === 0 && (
          <EmptyState
            emoji="🛫"
            title={`最近 7 天暂无低于 ¥${ceil} 的机票`}
            desc={`从${origin?.name ?? "深圳"}出发的各目的地含税价都高于 ¥${ceil}。可以调高监控金额，或过几天再来碰碰运气～`}
          />
        )}

        {deals.length > 0 && (
          <>
            <div className="px-1 text-[12px] text-muted flex items-center gap-1.5">
              <span className="text-brand-deep font-semibold">共 {deals.length} 张</span>
              {belowBudgetCount > 0 && (
                <span className="text-coral-dark font-semibold">· {belowBudgetCount} 张低于预算 🎯</span>
              )}
              {lastUpdated && (
                <span className="ml-auto text-[11px]">
                  更新于 {new Date(lastUpdated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
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

      {/* 底部说明 */}
      <footer className="mt-6 px-5 py-6 text-center">
        <p className="text-[11px] text-muted/80 leading-relaxed">
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
      <DealDetailSheet deal={activeDeal} onClose={() => setActiveDeal(null)} />
    </main>
  );
}

function SortBtn({ k, onSort }: { k: "price" | "time" | "duration"; onSort: (k: "price" | "time" | "duration") => void }) {
  const [active, setActive] = useState<"price" | "time" | "duration">("price");
  const label = k === "price" ? "价格" : k === "time" ? "时间" : "时长";
  return (
    <button
      onClick={() => {
        setActive(k);
        onSort(k);
      }}
      className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition ${
        active === k ? "bg-ink text-white" : "text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function DealSkeletons() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl2 overflow-hidden border border-line/60 bg-card">
          <div className="flex">
            <div className="flex-1 p-4 space-y-2">
              <div className="skeleton h-6 w-24" />
              <div className="skeleton h-3 w-32" />
              <div className="skeleton h-4 w-20 rounded-full" />
            </div>
            <div className="w-[42%] p-4 space-y-2">
              <div className="skeleton h-3 w-14 ml-auto" />
              <div className="skeleton h-8 w-24 ml-auto" />
              <div className="skeleton h-3 w-20 ml-auto" />
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}
