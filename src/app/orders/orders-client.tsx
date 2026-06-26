"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LxFlightOrderDetailResponse } from "@/lib/types";
import { loadOrders, removeOrder, type LocalOrder } from "@/lib/orders";
import { hm } from "@/lib/catalog";
import { Spinner, EmptyState, Badge } from "@/components/ui";

interface OrderRow extends LocalOrder {
  detail?: LxFlightOrderDetailResponse;
  loading?: boolean;
  error?: boolean;
}

function statusBadge(detail?: LxFlightOrderDetailResponse) {
  if (!detail) return null;
  // 优先用稳定的中文文本字段判定（实测 detail 返回数字状态码 + 文本）
  const statusText = detail.status_text || "";
  const payText = detail.pay_status_text || "";
  const flightText = detail.flight_status_text || "";

  let tone: "green" | "amber" | "neutral" | "red" = "neutral";
  if (statusText.includes("取消") || statusText.includes("退")) tone = "red";
  else if (payText.includes("已支付") || flightText.includes("出票") || statusText.includes("完成")) tone = "green";
  else if (payText.includes("待支付") || payText.includes("未支付")) tone = "amber";

  return (
    <div className="flex flex-wrap gap-1">
      {statusText && <Badge tone={tone}>{statusText}</Badge>}
      {flightText && <Badge tone="neutral">{flightText}</Badge>}
    </div>
  );
}

export function OrdersClient() {
  const router = useRouter();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = loadOrders();
    setRows(list.map((o) => ({ ...o, loading: true })));
    setReady(true);
    // 并发拉取每个订单的实时详情
    list.forEach((o, i) => {
      fetch("/api/order/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_no: o.system_no }),
      })
        .then((r) => r.json())
        .then((json) => {
          setRows((prev) =>
            prev.map((row, idx) =>
              idx === i
                ? { ...row, loading: false, detail: json.ok ? json.data : undefined, error: !json.ok }
                : row
            )
          );
        })
        .catch(() => {
          setRows((prev) =>
            prev.map((row, idx) => (idx === i ? { ...row, loading: false, error: true } : row))
          );
        });
    });
  }, []);

  const onDelete = (systemNo: string) => {
    removeOrder(systemNo);
    setRows((prev) => prev.filter((r) => r.system_no !== systemNo));
  };

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="btn-press h-8 w-8 grid place-items-center rounded-md text-gray-900 hover:bg-gray-100"
          aria-label="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900">我的订单</h1>
      </header>

      <div className="px-4 py-3 space-y-2.5">
        {ready && rows.length === 0 && (
          <EmptyState
            title="还没有订单"
            desc="去首页挑一张特价机票，下单后会出现在这里。"
          />
        )}

        {rows.map((row) => {
          const d = row.detail;
          const depCity = d?.flight_info?.dep_city ?? row.from_city;
          const arrCity = d?.flight_info?.arr_city ?? row.to_city;
          const depTime = d?.flight_info?.dep_time ?? "";
          const arrTime = d?.flight_info?.arr_time ?? "";
          const flightNo = d?.flight_info?.flight_no ?? row.flight_no;
          const airline = d?.flight_info?.airline_name ?? row.airline_name;
          const total = d?.total_amount ?? row.verified_total;
          return (
            <div
              key={row.system_no}
              className="rounded-lg border border-gray-200 p-4 fade-in"
            >
              {/* 顶行：航线 + 金额 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {depCity} → {arrCity}
                  </div>
                  <div className="text-2xs text-gray-600 mt-0.5">
                    {airline} {flightNo}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span className="text-xs font-medium text-gray-900">¥</span>
                    <span className="text-xl font-bold text-gray-900 tnum">{total}</span>
                  </div>
                </div>
              </div>

              {/* 状态 */}
              <div className="mt-2.5 flex items-center gap-2 min-h-[20px]">
                {row.loading ? (
                  <span className="inline-flex items-center gap-1.5 text-2xs text-gray-600">
                    <Spinner className="text-gray-500" /> 查询状态…
                  </span>
                ) : row.error ? (
                  <Badge tone="neutral">状态查询失败</Badge>
                ) : (
                  statusBadge(d)
                )}
              </div>

              {/* 时间 */}
              {(depTime || arrTime) && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <span className="tnum">{depTime ? hm(depTime) : ""}</span>
                  <span className="text-gray-400">→</span>
                  <span className="tnum">{arrTime ? hm(arrTime) : ""}</span>
                </div>
              )}

              {/* 底部：订单号 + 操作 */}
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-2xs text-gray-500 tnum clamp-1">{row.system_no}</span>
                <div className="flex items-center gap-3">
                  {/* 待支付可继续支付：复用收银台（若有 checkout 信息则在详情里） */}
                  {d?.pay_status_text?.includes("待支付") && (
                    <span className="text-2xs text-amber-600">待支付</span>
                  )}
                  <button
                    onClick={() => onDelete(row.system_no)}
                    className="btn-press text-2xs text-gray-500 hover:text-danger"
                  >
                    删除记录
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {ready && rows.length > 0 && (
          <p className="text-center text-2xs text-gray-400 pt-2">
            共 {rows.length} 笔订单 · 状态为实时查询结果
          </p>
        )}
      </div>
    </main>
  );
}
