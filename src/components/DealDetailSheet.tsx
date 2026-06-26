"use client";

import type { FlightDeal } from "@/lib/deal";
import { dateLabel, hm } from "@/lib/catalog";
import { Sheet, Badge } from "./ui";

function durationLabel(min?: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}小时${m}分` : `${h}小时`;
}

function shortAirport(name?: string): string {
  if (!name) return "";
  return name.replace(/国际机场$/, "").replace(/机场$/, "").trim();
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs text-gray-900 font-medium text-right max-w-[65%]">{value}</span>
    </div>
  );
}

export function DealDetailSheet({
  deal,
  onClose,
  onBook,
}: {
  deal: FlightDeal | null;
  onClose: () => void;
  onBook?: (deal: FlightDeal) => void;
}) {
  if (!deal) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const seatMap: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
    few: { label: "余票紧张", tone: "red" },
    enough: { label: "充足", tone: "green" },
    sold_out: { label: "已售罄", tone: "neutral" },
  };
  const seat = deal.seat_status ? seatMap[deal.seat_status] : null;

  return (
    <Sheet open={!!deal} onClose={onClose} title={`${deal.from_city} → ${deal.to_city}`}>
      {/* 价格块：单色大字 */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="text-2xs text-gray-600 uppercase tracking-wider">含税总价</div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-base font-semibold text-gray-900">¥</span>
          <span className="text-4xl font-bold text-gray-900 tnum tracking-tighter">{deal.total}</span>
          <span className="text-xs text-gray-600 ml-2">/ 单程成人价</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          <Badge tone="neutral">机票 ¥{deal.adult_price}</Badge>
          <Badge tone="neutral">机建 ¥{deal.airport_tax}</Badge>
          <Badge tone="neutral">燃油 ¥{deal.fuel_tax}</Badge>
        </div>
      </div>

      {/* 航线时间轴 */}
      <div className="mt-3 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 tnum">{hm(deal.dep_time)}</div>
            <div className="text-2xs text-gray-600 mt-1">{shortAirport(deal.dep_airport_name)} {deal.dep_terminal}</div>
          </div>
          <div className="flex-1 mx-3 text-center">
            <div className="text-2xs text-gray-600">{durationLabel(deal.duration_minutes)}</div>
            <div className="relative my-1.5 h-px bg-gray-200">
              <span className="absolute left-1/2 -translate-x-1/2 -top-[7px] text-2xs text-gray-400">›</span>
            </div>
            <div className="text-2xs font-medium text-gray-900">
              {deal.stop_count ? `经停${deal.stop_count}次` : "直飞"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 tnum">{hm(deal.arr_time)}</div>
            <div className="text-2xs text-gray-600 mt-1">{shortAirport(deal.arr_airport_name)} {deal.arr_terminal}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 text-center text-xs text-gray-900">
          {deal.airline_name} {deal.flight_no}
          {deal.aircraft_type ? ` · 机型 ${deal.aircraft_type}` : ""}
          <span className="text-gray-400"> · </span>
          {deal.cabin_name}
        </div>
      </div>

      {/* 费用明细 */}
      <div className="mt-3">
        <div className="text-2xs text-gray-600 uppercase tracking-wider mb-1">费用明细</div>
        <div className="rounded-lg border border-gray-200 px-4">
          <Row label="成人票价" value={`¥${deal.adult_price}`} />
          <Row label="机场建设费" value={`¥${deal.airport_tax}`} />
          <Row label="燃油附加费" value={`¥${deal.fuel_tax}`} />
          <Row label="出发日期" value={dateLabel(deal.date)} />
          {seat && <Row label="座位状态" value={<Badge tone={seat.tone}>{seat.label}</Badge>} />}
        </div>
      </div>

      {/* 退改规则 */}
      {(deal.baggage_rule || deal.refund_rule || deal.change_rule) && (
        <div className="mt-3">
          <div className="text-2xs text-gray-600 uppercase tracking-wider mb-1">行李与退改</div>
          <div className="rounded-lg border border-gray-200 px-4">
            {deal.baggage_rule && <Row label="行李额度" value="已含" />}
            {deal.refund_rule && <Row label="退票" value={deal.refund_rule} />}
            {deal.change_rule && <Row label="改签" value={deal.change_rule} />}
          </div>
        </div>
      )}

      {/* 下单入口：进入订单填写 → 验价 → 收银台 */}
      <button
        onClick={() => onBook?.(deal)}
        className="btn-press mt-4 flex items-center justify-center gap-2 w-full rounded-md bg-gray-900 text-white font-medium py-3 text-sm hover:bg-gray-700 transition-colors"
      >
        去抢票
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p className="mt-2 text-center text-2xs text-gray-500 leading-relaxed">
        点击后实时验价并创建订单，跳转龙虾出行收银台完成支付。<br />
        最终价格以验价为准（含服务费）。
      </p>
    </Sheet>
  );
}
