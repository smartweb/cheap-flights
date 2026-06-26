"use client";

import type { FlightDeal } from "@/lib/deal";
import { DESTINATION_MAP, dateLabel, hm, pushCeil } from "@/lib/catalog";

function durationLabel(min?: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}时${m}分` : `${h}时`;
}

function seatTag(status?: string): { label: string; cls: string } | null {
  if (status === "few") return { label: "余票紧张", cls: "bg-coral-soft text-coral-dark" };
  if (status === "enough") return { label: "有票", cls: "bg-brand-soft text-brand-deep" };
  return null;
}

export function DealCard({
  deal,
  threshold,
  index,
  onClick,
}: {
  deal: FlightDeal;
  threshold: number;
  index: number;
  onClick: () => void;
}) {
  const dest = DESTINATION_MAP[deal.to_code];
  const seat = seatTag(deal.seat_status);
  const belowBudget = deal.total <= threshold;
  const ceil = pushCeil(threshold);

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      className="pop-in btn-press w-full text-left bg-card rounded-xl2 shadow-card overflow-hidden border border-line/60"
    >
      {/* 顶部：城市与价格 */}
      <div className="flex items-stretch">
        {/* 左：目的地 */}
        <div className="flex-1 px-4 py-3.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{dest?.emoji ?? "✈️"}</span>
            <span className="text-lg font-bold text-ink truncate">{deal.to_city}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted truncate">
            {dest?.vibe ?? "说走就走"}
          </div>
          {belowBudget ? (
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-deep bg-brand-soft px-2 py-0.5 rounded-full">
              🎯 低于预算 ¥{threshold}
            </span>
          ) : (
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-coral-dark bg-coral-soft px-2 py-0.5 rounded-full">
              🔥 捡漏价
            </span>
          )}
        </div>
        {/* 右：价格 */}
        <div className="w-[42%] bg-gradient-to-br from-coral to-coral-dark text-white px-4 py-3.5 flex flex-col justify-center items-end">
          <div className="text-[10px] opacity-90 tracking-wide">含税总价</div>
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-base font-semibold mr-0.5">¥</span>
            <span className="text-3xl font-bold tnum">{deal.total}</span>
          </div>
          <div className="mt-0.5 text-[10px] opacity-85 tnum">
            票{deal.adult_price}+税{deal.airport_tax + deal.fuel_tax}
          </div>
        </div>
      </div>

      {/* 底部：航班信息 */}
      <div className="px-4 py-2.5 border-t border-line/60 bg-canvas/40">
        <div className="flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-ink tnum">{hm(deal.dep_time)}</span>
            <span className="text-muted text-[11px]">{deal.dep_airport_name?.replace(/机场$/, "") ?? ""}</span>
          </div>
          <div className="flex-1 mx-2 flex flex-col items-center">
            <span className="text-[10px] text-muted">
              {durationLabel(deal.duration_minutes)}
              {deal.stop_count ? ` · 经停${deal.stop_count}次` : " · 直飞"}
            </span>
            <div className="relative w-full h-px bg-line my-0.5">
              <span className="absolute left-0 -top-[3px] text-[8px]">✈</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span className="text-muted text-[11px]">{deal.arr_airport_name?.replace(/机场$/, "") ?? ""}</span>
            <span className="font-semibold text-ink tnum">{hm(deal.arr_time)}</span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="font-medium text-ink/70">{deal.airline_name} {deal.flight_no}</span>
          <span>·</span>
          <span>{deal.cabin_name}</span>
          {seat && (
            <span className={`ml-auto px-1.5 py-0.5 rounded-full font-medium ${seat.cls}`}>
              {seat.label}
            </span>
          )}
        </div>
        <div className="mt-1 text-[10px] text-muted/80">
          {dateLabel(deal.date)} 出发 · 限价 ¥{ceil} 以内
        </div>
      </div>
    </button>
  );
}
