/**
 * 龙虾出行 — 机票业务封装（服务端，真实接口）
 */
import { callApi } from "./client";
import type { LxFlightSearchRequest, LxFlightSearchResponse } from "./types";

export function searchFlights(req: LxFlightSearchRequest) {
  return callApi<LxFlightSearchResponse>("/open/v1/flight/search", {
    method: "POST",
    body: { ...req, trip_mode: req.trip_mode ?? "domestic" },
  });
}
