"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FlightDeal } from "@/lib/deal";
import type { IdType, PassengerType } from "@/lib/types";
import {
  ID_TYPE_LABELS,
  loadContact,
  loadPassengers,
  mergePassengers,
  saveContact,
  savePassengers,
  type StoredPassenger,
} from "@/lib/passengers";
import { saveOrder } from "@/lib/orders";
import { hm } from "@/lib/catalog";
import { Spinner } from "@/components/ui";

export function BookClient() {
  return (
    <Suspense fallback={null}>
      <BookInner />
    </Suspense>
  );
}

interface FormPassenger {
  name: string;
  type: PassengerType;
  id_type: IdType;
  id_number: string;
  phone: string;
  birthday: string;
  sex: 1 | 2;
}

const EMPTY_PASSENGER: FormPassenger = {
  name: "",
  type: "adult",
  id_type: "ID_CARD",
  id_number: "",
  phone: "",
  birthday: "",
  sex: 1,
};

function BookInner() {
  const router = useRouter();
  const params = useSearchParams();

  // 从 URL 读取 deal 摘要 + search_offer_id
  const deal = useMemo<Partial<FlightDeal> & { search_offer_id: string }>(() => {
    const get = (k: string) => params.get(k) ?? "";
    return {
      search_offer_id: get("soid"),
      to_city: get("to") || "目的地",
      from_city: get("from") || "出发地",
      flight_no: get("fn"),
      airline_name: get("al"),
      dep_time: get("dep"),
      arr_time: get("arr"),
      date: get("date"),
      cabin_name: get("cabin"),
      total: Number(get("total")) || 0,
    };
  }, [params]);

  const [passengers, setPassengers] = useState<FormPassenger[]>([{ ...EMPTY_PASSENGER }]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedList, setSavedList] = useState<StoredPassenger[]>([]);

  useEffect(() => {
    const list = loadPassengers();
    const contact = loadContact();
    setSavedList(list);

    // 默认填上所有常用乘机人（最多 4 个，与表单上限一致）
    if (list.length > 0) {
      setPassengers(
        list.slice(0, 4).map((sp) => ({
          name: sp.name,
          type: sp.type,
          id_type: sp.id_type,
          id_number: sp.id_number,
          phone: sp.phone,
          birthday: sp.birthday ?? "",
          sex: sp.sex ?? 1,
        }))
      );
      // 联系人：优先用独立记忆的 contact，否则用第一个乘机人
      if (contact) {
        setContactName(contact.name);
        setContactPhone(contact.phone);
      } else {
        setContactName(list[0].name);
        setContactPhone(list[0].phone);
      }
    } else if (contact) {
      // 没有常用乘机人，但有上次联系人
      setContactName(contact.name);
      setContactPhone(contact.phone);
    }
  }, []);

  const noSoid = !deal.search_offer_id;

  const updatePax = (i: number, patch: Partial<FormPassenger>) => {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const addPax = () => setPassengers((p) => (p.length < 4 ? [...p, { ...EMPTY_PASSENGER }] : p));
  const removePax = (i: number) => setPassengers((p) => p.filter((_, idx) => idx !== i));

  const fillFromSaved = (sp: StoredPassenger) => {
    const filled: FormPassenger = {
      name: sp.name,
      type: sp.type,
      id_type: sp.id_type,
      id_number: sp.id_number,
      phone: sp.phone,
      birthday: sp.birthday ?? "",
      sex: sp.sex ?? 1,
    };
    setPassengers((prev) => {
      // 若已存在该乘机人则不重复添加
      if (prev.some((p) => p.name === sp.name && p.id_number === sp.id_number)) {
        return prev;
      }
      // 优先填到第一个空行（姓名为空）
      const firstEmpty = prev.findIndex((p) => !p.name.trim());
      if (firstEmpty >= 0) {
        return prev.map((p, i) => (i === firstEmpty ? filled : p));
      }
      // 没有空行且未达上限，追加
      return prev.length < 4 ? [...prev, filled] : prev;
    });
  };

  const submit = async () => {
    setError(null);
    if (noSoid) {
      setError("订单信息缺失，请返回重新选择机票");
      return;
    }
    if (!contactName.trim() || !/^1\d{10}$/.test(contactPhone)) {
      setError("请填写正确的联系人姓名与 11 位手机号");
      return;
    }
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim() || !p.id_number.trim() || !/^1\d{10}$/.test(p.phone)) {
        setError(`请完整填写乘客 ${i + 1} 的姓名、证件号、手机号`);
        return;
      }
      if ((p.type === "child" || p.type === "infant") && !p.birthday) {
        setError(`乘客 ${i + 1} 为儿童/婴儿，需填写出生日期`);
        return;
      }
    }
    if (!agree) {
      setError("请先勾选同意服务条款");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search_offer_id: deal.search_offer_id,
          contact: { name: contactName.trim(), phone: contactPhone },
          passengers: passengers.map((p) => ({
            name: p.name.trim(),
            type: p.type,
            id_type: p.id_type,
            id_number: p.id_number.trim(),
            phone: p.phone,
            birthday: p.birthday || undefined,
            sex: p.sex,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok || !json.data?.checkout_url) {
        throw new Error(json.error || "下单失败");
      }

      // 下单成功：把本次乘机人 + 联系人记忆到本地（同步写，跳转前完成）
      const usedPassengers: StoredPassenger[] = passengers.map((p) => ({
        name: p.name.trim(),
        type: p.type,
        id_type: p.id_type,
        id_number: p.id_number.trim(),
        phone: p.phone,
        birthday: p.birthday || undefined,
        sex: p.sex,
      }));
      savePassengers(mergePassengers(savedList, usedPassengers));
      saveContact({ name: contactName.trim(), phone: contactPhone });

      // 记录本机订单（用于「我的订单」回查实时状态）
      saveOrder({
        system_no: json.data.system_no,
        out_trade_no: json.data.out_trade_no,
        created_at: Date.now(),
        from_city: deal.from_city ?? "",
        to_city: deal.to_city ?? "",
        date: deal.date ?? "",
        flight_no: deal.flight_no ?? "",
        airline_name: deal.airline_name ?? "",
        verified_total: json.data.verified_total ?? deal.total ?? 0,
      });

      // 跳转托管收银台（localStorage 已同步写入，导航不会丢失）
      window.location.href = json.data.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "下单失败，请稍后重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pb-32">
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="btn-press h-8 w-8 grid place-items-center rounded-md text-gray-900 hover:bg-gray-100"
          aria-label="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900">填写订单</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* 航班摘要 */}
        <section className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              {deal.from_city} → {deal.to_city}
            </span>
            {deal.total ? (
              <span className="text-base font-bold text-gray-900 tnum">¥{deal.total}</span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
            <span className="tnum">{deal.dep_time ? hm(deal.dep_time) : ""}</span>
            <span className="text-gray-400">→</span>
            <span className="tnum">{deal.arr_time ? hm(deal.arr_time) : ""}</span>
            <span>{deal.date}</span>
          </div>
          <div className="mt-1 text-2xs text-gray-600">
            {deal.airline_name} {deal.flight_no} · {deal.cabin_name}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-2xs text-gray-500">
            最终价格以下单时实时验价为准（含服务费）
          </div>
        </section>

        {/* 常用乘机人快捷 */}
        {savedList.length > 0 && (
          <section>
            <div className="text-2xs text-gray-600 uppercase tracking-wider mb-2">常用乘机人</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {savedList.slice(0, 6).map((sp, i) => (
                <button
                  key={i}
                  onClick={() => fillFromSaved(sp)}
                  className="btn-press shrink-0 px-3 py-1.5 rounded-md border border-gray-200 hover:border-gray-400 text-xs text-gray-900 font-medium"
                >
                  {sp.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 乘机人表单 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xs text-gray-600 uppercase tracking-wider">乘机人</div>
            <button
              onClick={addPax}
              disabled={passengers.length >= 4}
              className="btn-press text-xs font-medium text-gray-900 disabled:text-gray-400 flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              添加乘客
            </button>
          </div>
          <div className="space-y-3">
            {passengers.map((p, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3.5 space-y-3">
                {passengers.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-2xs text-gray-600">乘客 {i + 1}</span>
                    <button
                      onClick={() => removePax(i)}
                      className="btn-press text-2xs text-gray-500 hover:text-danger"
                    >
                      移除
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="col-span-2 h-10 rounded-md border border-gray-200 px-3 text-sm focus:border-gray-900 outline-none"
                    placeholder="姓名（与证件一致）"
                    value={p.name}
                    onChange={(e) => updatePax(i, { name: e.target.value })}
                  />
                  <select
                    className="h-10 rounded-md border border-gray-200 px-2 text-sm bg-white focus:border-gray-900 outline-none"
                    value={p.type}
                    onChange={(e) => updatePax(i, { type: e.target.value as PassengerType })}
                  >
                    <option value="adult">成人</option>
                    <option value="child">儿童</option>
                    <option value="infant">婴儿</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="h-10 rounded-md border border-gray-200 px-2 text-sm bg-white focus:border-gray-900 outline-none"
                    value={p.id_type}
                    onChange={(e) => updatePax(i, { id_type: e.target.value as IdType })}
                  >
                    {ID_TYPE_LABELS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="col-span-2 h-10 rounded-md border border-gray-200 px-3 text-sm focus:border-gray-900 outline-none"
                    placeholder="证件号码"
                    value={p.id_number}
                    onChange={(e) => updatePax(i, { id_number: e.target.value })}
                  />
                </div>
                <input
                  className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm focus:border-gray-900 outline-none"
                  placeholder="手机号"
                  inputMode="numeric"
                  maxLength={11}
                  value={p.phone}
                  onChange={(e) => updatePax(i, { phone: e.target.value.replace(/\D/g, "") })}
                />
                {(p.type === "child" || p.type === "infant") && (
                  <input
                    className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm focus:border-gray-900 outline-none"
                    placeholder="出生日期 YYYY-MM-DD"
                    value={p.birthday}
                    onChange={(e) => updatePax(i, { birthday: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 联系人 */}
        <section>
          <div className="text-2xs text-gray-600 uppercase tracking-wider mb-2">联系人</div>
          <div className="rounded-lg border border-gray-200 p-3.5 space-y-3">
            <input
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm focus:border-gray-900 outline-none"
              placeholder="联系人姓名"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <input
              className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm focus:border-gray-900 outline-none"
              placeholder="手机号（用于接收订单信息）"
              inputMode="numeric"
              maxLength={11}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </section>

        {/* 协议 */}
        <label className="flex items-start gap-2.5 px-1">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gray-900"
          />
          <span className="text-2xs text-gray-600 leading-relaxed">
            我已阅读并同意《机票预订服务条款》，确认乘机人信息准确无误。
            价格为实时验价结果，最终以支付页为准。
          </span>
        </label>

        {error && (
          <div className="rounded-md bg-danger-soft px-3.5 py-2.5 text-xs text-danger">{error}</div>
        )}
      </div>

      {/* 底部提交栏 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-h5 bg-white border-t border-gray-200 px-4 py-3 bar-safe flex items-center gap-3 z-30">
        <div className="min-w-0">
          <div className="text-2xs text-gray-600">含税实时价（验价后确定）</div>
          {deal.total ? (
            <div className="text-lg font-bold text-gray-900 tnum">
              ¥{deal.total}<span className="text-2xs font-normal text-gray-500"> 起</span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-gray-900">验价后显示</div>
          )}
        </div>
        <button
          onClick={submit}
          disabled={submitting || noSoid}
          className="btn-press ml-auto flex items-center gap-2 rounded-md bg-gray-900 text-white font-medium px-6 h-11 text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Spinner className="text-white" /> 提交中…
            </>
          ) : (
            "去支付"
          )}
        </button>
      </div>
    </main>
  );
}
