"use client";

import type { FlightDeal } from "@/lib/deal";
import { dateLabel, hm } from "@/lib/catalog";
import { Sheet } from "./ui";

function durationLabel(min?: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}小时${m}分` : `${h}小时`;
}

/** 官方下单入口：验价 / 直下需调用平台收银台；此处引导到龙虾出行 App / 小程序 */
const OFFICIAL_BOOKING_URL = "https://open.longxiachuxing.com/";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-line/60 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-ink font-medium text-right max-w-[65%]">{value}</span>
    </div>
  );
}

export function DealDetailSheet({
  deal,
  onClose,
}: {
  deal: FlightDeal | null;
  onClose: () => void;
}) {
  if (!deal) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const seat =
    deal.seat_status === "few"
      ? "余票紧张"
      : deal.seat_status === "enough"
      ? "充足"
      : deal.seat_status === "sold_out"
      ? "已售罄"
      : "—";

  return (
    <Sheet open={!!deal} onClose={onClose} title={`${deal.from_city} → ${deal.to_city}`}>
      {/* 价格大卡 */}
      <div className="mt-2 rounded-2xl bg-gradient-to-br from-coral to-coral-dark text-white px-5 py-4">
        <div className="text-xs opacity-90">含税总价</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-lg font-semibold">¥</span>
          <span className="text-4xl font-bold tnum">{deal.total}</span>
          <span className="text-xs opacity-90 ml-2">/ 单程成人价</span>
        </div>
        <div className="mt-2 flex gap-2 text-[11px]">
          <span className="bg-white/20 rounded-full px-2 py-0.5">机票 ¥{deal.adult_price}</span>
          <span className="bg-white/20 rounded-full px-2 py-0.5">机建 ¥{deal.airport_tax}</span>
          <span className="bg-white/20 rounded-full px-2 py-0.5">燃油 ¥{deal.fuel_tax}</span>
        </div>
      </div>

      {/* 航线时间轴 */}
      <div className="mt-4 rounded-2xl bg-card border border-line/60 p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-ink tnum">{hm(deal.dep_time)}</div>
            <div className="text-xs text-muted mt-0.5">{deal.dep_airport_name} {deal.dep_terminal}</div>
          </div>
          <div className="flex-1 mx-3 text-center">
            <div className="text-[11px] text-muted">
              {durationLabel(deal.duration_minutes)}
            </div>
            <div className="relative my-1 h-px bg-line">
              <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-xs">✈️</span>
            </div>
            <div className="text-[11px] font-medium text-brand-deep">
              {deal.stop_count ? `经停${deal.stop_count}次` : "直飞"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-ink tnum">{hm(deal.arr_time)}</div>
            <div className="text-xs text-muted mt-0.5">{deal.arr_airport_name} {deal.arr_terminal}</div>
          </div>
        </div>
        <div className="mt-3 text-center text-sm text-ink">
          {deal.airline_name} {deal.flight_no} · {deal.aircraft_type ? `机型 ${deal.aircraft_type} · ` : ""}
          {deal.cabin_name}
        </div>
      </div>

      {/* 费用明细 */}
      <div className="mt-4">
        <div className="eyebrow mb-1">费用明细</div>
        <div className="rounded-2xl bg-card border border-line/60 px-4">
          <Row label="成人票价" value={`¥${deal.adult_price}`} />
          <Row label="机场建设费" value={`¥${deal.airport_tax}`} />
          <Row label="燃油附加费" value={`¥${deal.fuel_tax}`} />
          <Row label="座位状态" value={seat} />
        </div>
      </div>

      {/* 退改规则 */}
      <div className="mt-4">
        <div className="eyebrow mb-1">行李与退改</div>
        <div className="rounded-2xl bg-card border border-line/60 px-4">
          <Row label="行李额度" value={deal.baggage_rule ? "已含（详见说明）" : "—"} />
          {deal.refund_rule && <Row label="退票" value={deal.refund_rule} />}
          {deal.change_rule && <Row label="改签" value={deal.change_rule} />}
        </div>
      </div>

      {/* 下单入口 */}
      <a
        href={deal.booking_url || OFFICIAL_BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-press mt-5 flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-coral to-coral-dark text-white font-bold py-3.5 text-base shadow-pop"
      >
        立即去抢票
        <span className="text-base">→</span>
      </a>
      <p className="mt-2 text-center text-[11px] text-muted leading-relaxed">
        价格为参考价，以下单时实时验价为准。<br />
        下单由龙虾出行开放平台提供，跳转其收银台完成。
      </p>
    </Sheet>
  );
}
