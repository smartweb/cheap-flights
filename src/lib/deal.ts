/**
 * 「特价机票」统一数据结构（API <-> 前端共享）
 */
import type { LxCabinFare, LxFlightItem } from "./types";

/** 扁平化后的单条特价（一个航班 × 一个舱位 = 一条 deal） */
export interface FlightDeal {
  id: string; // 前端 key
  from_code: string;
  from_city: string;
  to_code: string;
  to_city: string;

  date: string; // YYYY-MM-DD

  flight_no: string;
  airline_name: string;
  airline_code?: string;
  aircraft_type?: string;

  dep_time: string; // 完整时间串
  arr_time: string;
  dep_airport_name?: string;
  arr_airport_name?: string;
  dep_terminal?: string;
  arr_terminal?: string;
  duration_minutes?: number;
  stop_count?: number;

  cabin_class: string;
  cabin_name: string;
  cabin_code: string;
  adult_price: number;
  airport_tax: number;
  fuel_tax: number;
  total: number; // 含税总价（含基建燃油）

  seat_status?: "enough" | "few" | "sold_out";
  baggage_rule?: string;
  change_rule?: string;
  refund_rule?: string;
  discount_rate?: number;

  /** 搜索阶段令牌（下单前需先验价） */
  search_offer_id: string;
  /** 可直下令牌（可能为空） */
  offer_id?: string;

  /** 下单链接（验价后由平台返回的收银台；如无则跳官方 App/小程序） */
  booking_url?: string;
}

/** 把航班 + 舱位扁平化成 deal */
export function toDeal(
  flight: LxFlightItem,
  cabin: LxCabinFare,
  date: string
): FlightDeal {
  const adult_price = Number(cabin.adult_price) || 0;
  const airport_tax = Number(cabin.airport_tax) || 0;
  const fuel_tax = Number(cabin.fuel_tax) || 0;
  return {
    id: `${flight.flight_id}_${cabin.search_offer_id}_${date}`.slice(0, 120),
    from_code: flight.dep_city_code ?? flight.dep_airport_code,
    from_city: flight.dep_city_name ?? flight.dep_airport_code,
    to_code: flight.arr_city_code ?? flight.arr_airport_code,
    to_city: flight.arr_city_name ?? flight.arr_airport_code,
    date,
    flight_no: flight.flight_no,
    airline_name: flight.airline_name ?? "",
    airline_code: flight.airline_code,
    aircraft_type: flight.aircraft_type,
    dep_time: flight.dep_time,
    arr_time: flight.arr_time,
    dep_airport_name: flight.dep_airport_name,
    arr_airport_name: flight.arr_airport_name,
    dep_terminal: flight.dep_terminal,
    arr_terminal: flight.arr_terminal,
    duration_minutes: flight.duration_minutes,
    stop_count: flight.stop_count,
    cabin_class: cabin.cabin_class,
    cabin_name: cabin.cabin_name,
    cabin_code: cabin.cabin_code,
    adult_price,
    airport_tax,
    fuel_tax,
    total: adult_price + airport_tax + fuel_tax,
    seat_status: cabin.seat_status,
    baggage_rule: cabin.baggage_rule,
    change_rule: cabin.change_rule,
    refund_rule: cabin.refund_rule,
    discount_rate: cabin.discount_rate,
    search_offer_id: cabin.search_offer_id,
    offer_id: cabin.offer_id,
  };
}
