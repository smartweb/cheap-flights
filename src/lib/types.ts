/**
 * 龙虾出行开放平台 — 类型定义（与真实接口字段对齐）
 * 文档：https://docs.longxiachuxing.com
 *
 * 字段命名严格按线上接口（Go struct → snake_case）。
 * 机票：trip_mode/trip_type/from_code/to_code/passengers，价格在 flights[].cabins[]
 * 含税总价 = adult_price + airport_tax + fuel_tax（机建费 + 燃油费）
 */

/** 平台统一响应外壳：code === 0 表示成功 */
export interface LxEnvelope<T> {
  code: number;
  message?: string;
  request_id?: string;
  data?: T;
}

/* ------------------------------------------------------------------ */
/* 机票                                                                */
/* ------------------------------------------------------------------ */
export type TripMode = "domestic" | "international";
export type TripType = "oneway" | "roundtrip";
export type CabinClass = "economy" | "business" | "first";
export type FlightSortBy = "price" | "depart_time" | "duration" | "arrival_time";

export interface LxPassengers {
  adult: number;
  child?: number;
  infant?: number;
}

export interface LxFlightSearchRequest {
  trip_mode: TripMode;
  trip_type: TripType;
  from_code: string; // 出发城市三字码
  to_code: string; // 到达城市三字码
  cabin_class?: CabinClass;
  depart_date: string; // YYYY-MM-DD
  return_date?: string; // 往返时的返程日期
  flight_no?: string;
  passengers: LxPassengers;
  page?: number;
  page_size?: number;
  sort_by?: FlightSortBy;
}

/** 舱位价格项（可下单令牌在此） */
export interface LxCabinFare {
  cabin_class: string;
  cabin_code: string;
  cabin_name: string;
  discount_rate?: number;
  adult_price: number; // 成人票价（元）
  child_price?: number; // 儿童票价（元）
  airport_tax?: number; // 机建费
  fuel_tax?: number; // 燃油费
  lowest_price?: number;
  seat_status?: "enough" | "few" | "sold_out";
  baggage_rule?: string;
  change_rule?: string;
  refund_rule?: string;
  price_type?: "reference" | "realtime";
  /** 是否需要先调验价再下单 */
  pricing_required?: boolean;
  /** 搜索阶段令牌（每个 cabin 始终返回） */
  search_offer_id: string;
  /** 可直下令牌；为空时需先验价 */
  offer_id?: string;
}

/** 航段信息 */
export interface LxFlightItem {
  flight_id: string;
  flight_no: string;
  airline_code?: string;
  airline_name?: string;
  aircraft_type?: string;
  dep_airport_code: string;
  dep_airport_name?: string;
  dep_city_code?: string;
  dep_city_name?: string;
  dep_terminal?: string;
  dep_time: string; // 如 "2026-07-03 08:00"
  arr_airport_code: string;
  arr_airport_name?: string;
  arr_city_code?: string;
  arr_city_name?: string;
  arr_terminal?: string;
  arr_time: string;
  duration_minutes?: number;
  stop_count?: number;
  meal?: string;
  cabins: LxCabinFare[];
}

export interface LxFlightSearchResponse {
  search_id: string;
  total: number;
  page?: number;
  page_size?: number;
  /** 去程航班 */
  flights: LxFlightItem[];
  /** 返程航班（往返时返回） */
  return_flights?: LxFlightItem[];
}
