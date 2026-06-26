"use client";

import type { FlightDeal } from "@/lib/deal";
import { DESTINATION_MAP, dateLabel, hm, pushCeil } from "@/lib/catalog";
import { Badge } from "./ui";

function durationLabel(min?: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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
  const belowBudget = deal.total <= threshold;
  const ceil = pushCeil(threshold);

  return (
    <button
      onClick={onClick}
      className="fade-in btn-press group w-full text-left bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-colors p-4"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      {/* 顶行：航线 + 价格 */}
      <div className="flex items-start justify-between gap-3">
        {/* 左：目的地 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900 tracking-tightish truncate">
              {deal.to_city}
            </span>
            {belowBudget ? (
              <Badge tone="green">低于预算</Badge>
            ) : (
              <Badge tone="amber">捡漏</Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-gray-600 truncate">
            {dest?.vibe ?? "特价航线"}
          </div>
        </div>
        {/* 右：价格（单色大字，Geist 数字感） */}
        <div className="text-right shrink-0">
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className="text-xs font-medium text-gray-900">¥</span>
            <span className="text-2xl font-bold text-gray-900 tnum tracking-tighter">
              {deal.total}
            </span>
          </div>
          <div className="text-2xs text-gray-600 tnum mt-0.5">
            含税 · 票{deal.adult_price}+{deal.airport_tax + deal.fuel_tax}
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="my-3 h-px bg-gray-100" />

      {/* 底行：航班时间轴 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-900 tnum">{hm(deal.dep_time)}</span>
          <span className="text-2xs text-gray-600 clamp-1">{shortAirport(deal.dep_airport_name)}{deal.dep_terminal ? ` ${deal.dep_terminal}` : ""}</span>
        </div>
        <div className="flex flex-col items-center px-2">
          <span className="text-2xs text-gray-600 whitespace-nowrap">
            {durationLabel(deal.duration_minutes)}
            {deal.stop_count ? ` · 经停` : " · 直飞"}
          </span>
          <div className="relative w-10 h-px bg-gray-300 my-1">
            <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 text-2xs text-gray-400">›</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xs text-gray-600 clamp-1">{shortAirport(deal.arr_airport_name)}{deal.arr_terminal ? ` ${deal.arr_terminal}` : ""}</span>
          <span className="text-sm font-semibold text-gray-900 tnum">{hm(deal.arr_time)}</span>
        </div>
      </div>

      {/* 元信息 */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-2xs text-gray-600">
          <span className="text-gray-900 font-medium">{deal.airline_name} {deal.flight_no}</span>
          <span className="text-gray-400">·</span>
          <span>{deal.cabin_name}</span>
          {deal.seat_status === "few" && <Badge tone="red">余票紧张</Badge>}
        </div>
        <div className="text-2xs text-gray-500">{dateLabel(deal.date)}</div>
      </div>
    </button>
  );
}

function shortAirport(name?: string): string {
  if (!name) return "";
  return name.replace(/国际机场$/, "").replace(/机场$/, "").replace(/Terminal\s*\d+/i, "").trim();
}
