/**
 * 龙虾出行 — 机票业务封装（服务端，真实接口）
 *
 * 流程：search（search_offer_id）→ pricing（offer_id, 10分钟有效）→
 *      order/create（checkout_url 托管收银台）→ 用户在收银台完成支付
 *
 * 文档：
 *  - 验价  POST /open/v1/flight/pricing
 *  - 下单  POST /open/v1/flight/order/create
 *  - 支付  POST /open/v1/flight/order/pay （原生渠道，user_pay 走 checkout_url 即可）
 */
import { callApi } from "./client";
import type {
  LxFlightOrderPayRequest,
  LxFlightOrderPayResponse,
  LxFlightOrderCreateRequest,
  LxFlightOrderCreateResponse,
  LxFlightPricingRequest,
  LxFlightPricingResponse,
  LxFlightSearchRequest,
  LxFlightSearchResponse,
} from "./types";

export function searchFlights(req: LxFlightSearchRequest) {
  return callApi<LxFlightSearchResponse>("/open/v1/flight/search", {
    method: "POST",
    body: { ...req, trip_mode: req.trip_mode ?? "domestic" },
  });
}

/** 机票验价：用 search_offer_id + 乘客信息换取可下单 offer_id（10分钟有效） */
export function priceFlight(req: LxFlightPricingRequest) {
  return callApi<LxFlightPricingResponse>("/open/v1/flight/pricing", {
    method: "POST",
    body: req,
  });
}

/** 创建机票订单：基于 offer_id + 乘客 + 联系人；user_pay 返回 checkout_url */
export function createFlightOrder(req: LxFlightOrderCreateRequest) {
  return callApi<LxFlightOrderCreateResponse>("/open/v1/flight/order/create", {
    method: "POST",
    body: { ...req, pay_mode: req.pay_mode ?? "user_pay" },
  });
}

/** 发起支付：原生渠道（wechat_h5 / alipay_h5 等返回 pay_params）；user_pay 通常无需调用 */
export function payFlightOrder(req: LxFlightOrderPayRequest) {
  return callApi<LxFlightOrderPayResponse>("/open/v1/flight/order/pay", {
    method: "POST",
    body: req,
  });
}
