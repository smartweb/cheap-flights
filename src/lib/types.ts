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

/* ------------------------------------------------------------------ */
/* 验价 / 下单 / 支付                                                  */
/* ------------------------------------------------------------------ */
export type IdType =
  | "ID_CARD"
  | "PASSPORT"
  | "HK_MACAO_PERMIT"
  | "RETURN_HOME_PERMIT"
  | "TAIWAN_PERMIT"
  | "TAIWAN_COMPATRIOT_PERMIT"
  | "SOLDIER_CARD"
  | "FOREIGN_PERMANENT_RESIDENCE_ID"
  | "HK_MACAO_TAIWAN_RESIDENCE_PERMIT"
  | "HOUSEHOLD_REGISTER"
  | "BIRTH_CERTIFICATE"
  | "OTHER";

export type PassengerType = "adult" | "child" | "infant";

export interface LxContactInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface LxPassengerInfo {
  name: string;
  name_en?: string;
  phone: string;
  type: PassengerType;
  id_type: IdType;
  id_number: string;
  birthday?: string; // YYYY-MM-DD，儿童/婴儿必填
  sex?: 1 | 2; // 1男 2女
  nationality_code?: string; // 国际航班必填
  card_valid_end_date?: string; // 护照/港澳台证件必填
}

/* ---- 验价 ---- */
export interface LxFlightPricingRequest {
  search_offer_id: string;
  return_search_offer_id?: string;
  passengers: LxPassengerInfo[];
}

export interface LxPassengerFare {
  passenger_type: PassengerType;
  base_fare: number;
  airport_tax: number;
  fuel_tax: number;
  service_fee?: number;
  total: number;
}

export interface LxFlightPricingResponse {
  offer_id: string;
  return_offer_id?: string;
  total_fare: number;
  price_changed?: boolean;
  expired_at?: string;
  baggage_rule?: string;
  refund_rule?: string;
  change_rule?: string;
  passenger_fares?: LxPassengerFare[];
}

/* ---- 下单 ---- */
export type PayMode = "user_pay" | "enterprise_credit" | "monthly_settle";

export interface LxFlightOrderCreateRequest {
  out_trade_no: string; // 商户订单号（幂等键，必填）
  offer_id: string; // 验价返回的 offer_id（10分钟有效）
  return_offer_id?: string;
  contact: LxContactInfo;
  passengers: LxPassengerInfo[];
  pay_mode: PayMode;
  return_url?: string; // 支付成功跳转（user_pay 必填）
  callback_url?: string; // 状态回调
}

export interface LxFlightOrderCreateResponse {
  /** 托管收银台地址（pay_mode=user_pay 时返回） */
  checkout_url?: string;
  system_no?: string; // 平台订单号
  out_trade_no?: string;
  status?: string; // 如 pending_pay
  total_amount?: number;
  pay_expire_time?: string;
  pay_mode?: string;
  pnr?: string;
}

/* ---- 发起支付（原生渠道，可选；user_pay 走 checkout_url 即可） ---- */
export type FlightPayType =
  | "wechat_h5"
  | "wechat_jsapi"
  | "wechat_native"
  | "wechat_app"
  | "wechat_mini"
  | "alipay_app"
  | "alipay_h5";

export interface LxFlightOrderPayRequest {
  system_no: string;
  pay_type: FlightPayType;
  client_ip?: string;
  openid?: string;
  return_url?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface LxFlightOrderPayResponse {
  pay_type?: string;
  /** 支付参数（按 pay_type 不同，如 pay_url / qrcode / wx jsapi 参数） */
  pay_params?: Record<string, string>;
}

/* ---- 订单详情 ---- */
export interface LxFlightOrderDetailRequest {
  system_no?: string;
  out_trade_no?: string;
}

export interface LxFlightOrderInfo {
  airline_name?: string;
  flight_no?: string;
  dep_city?: string;
  arr_city?: string;
  dep_airport_name?: string;
  arr_airport_name?: string;
  dep_terminal?: string;
  arr_terminal?: string;
  dep_time?: string;
  arr_time?: string;
  cabin_class?: string;
}

export interface LxFlightOrderDetailResponse {
  system_no?: string;
  out_trade_no?: string;
  status?: string; // 如 completed
  status_text?: string; // 如 已完成
  pay_status?: string; // 如 paid
  pay_status_text?: string;
  flight_status?: string;
  flight_status_text?: string;
  total_amount?: number;
  created_at?: string;
  paid_at?: string;
  issued_at?: string;
  pnr?: string;
  ticket_nos?: string[];
  contact?: LxContactInfo;
  flight_info?: LxFlightOrderInfo;
  passengers?: LxPassengerInfo[];
  can_cancel?: boolean;
  can_refund?: boolean;
  estimated_refund_fee?: number;
}


