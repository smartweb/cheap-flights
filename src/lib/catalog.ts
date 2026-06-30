/**
 * 出发城市 & 目的地目录 + 价格 / 阈值工具
 *
 * 出发城市：仅北上广深（需求约束）。
 * 目的地：精选热门城市（三字码），覆盖度假 / 美食 / 人文 / 出片等年轻人偏好。
 *        按 scope 分国内（domestic）/ 东南亚（international），下游据此决定 trip_mode。
 */

/** 出发城市（北上广深） */
export interface OriginCity {
  code: string; // 三字码
  name: string; // 短名
  emoji: string;
}

export const ORIGIN_CITIES: OriginCity[] = [
  { code: "SZX", name: "深圳", emoji: "🏙️" },
  { code: "CAN", name: "广州", emoji: "🌉" },
  { code: "PEK", name: "北京", emoji: "🏛️" },
  { code: "SHA", name: "上海", emoji: "🌃" },
];

/** 默认出发城市：深圳 */
export const DEFAULT_ORIGIN_CODE = "SZX";

/** 默认监控金额（元）— 国内 */
export const DEFAULT_THRESHOLD = 500;

/** 默认监控金额（元）— 东南亚（含税特价常见区间） */
export const DEFAULT_SEA_THRESHOLD = 1200;

/** 推送上限系数：仅推 threshold × 110% 以下（含）的机票 */
export const PUSH_RATIO = 1.1;

/**
 * 推送阈值上限 = 监控金额 × 110%
 * 例：监控 500 元 → 仅推送 ≤ 550 元（含基建燃油）的机票
 */
export function pushCeil(threshold: number): number {
  return Math.round(threshold * PUSH_RATIO);
}

/** 目的地归属：国内 or 国际（东南亚） */
export type DestScope = "domestic" | "international";

/** 目的地（年轻人向，含一句话理由 + emoji） */
export interface Destination {
  code: string; // 三字码
  city: string;
  emoji: string;
  vibe: string; // 一句话理由
  region: "华北" | "华东" | "华南" | "华中" | "西南" | "西北" | "东北" | "东南亚";
  scope: DestScope; // 决定调用上游时用 domestic / international
}

export const DESTINATIONS: Destination[] = [
  // 华南 / 度假
  { code: "SYX", city: "三亚", emoji: "🌴", vibe: "椰风海韵·冲浪潜水", region: "华南", scope: "domestic" },
  { code: "HAK", city: "海口", emoji: "🥥", vibe: "骑楼老街·慢生活", region: "华南", scope: "domestic" },
  { code: "BHY", city: "北海", emoji: "🏖️", vibe: "银滩落日·涠洲岛", region: "华南", scope: "domestic" },
  { code: "KWL", city: "桂林", emoji: "⛰️", vibe: "山水甲天下", region: "华南", scope: "domestic" },
  { code: "NNG", city: "南宁", emoji: "🍜", vibe: "老友粉·青秀山", region: "华南", scope: "domestic" },
  // 西南 / 出片
  { code: "KMG", city: "昆明", emoji: "🌸", vibe: "春城花海·过桥米线", region: "西南", scope: "domestic" },
  { code: "LJG", city: "丽江", emoji: "🎐", vibe: "古城雪山·风花雪月", region: "西南", scope: "domestic" },
  { code: "DLU", city: "大理", emoji: "🌾", vibe: "苍山洱海·风慢些", region: "西南", scope: "domestic" },
  { code: "CTU", city: "成都", emoji: "🐼", vibe: "火锅熊猫·太古里", region: "西南", scope: "domestic" },
  { code: "CKG", city: "重庆", emoji: "🌶️", vibe: "8D 魔幻·洪崖洞", region: "西南", scope: "domestic" },
  { code: "KWE", city: "贵阳", emoji: "🍃", vibe: "酸汤鱼·黄果树", region: "西南", scope: "domestic" },
  { code: "JHG", city: "西双版纳", emoji: "🐘", vibe: "热带雨林·傣味夜市", region: "西南", scope: "domestic" },
  // 华东 / 人文
  { code: "HGH", city: "杭州", emoji: "🍵", vibe: "西湖龙井·良渚", region: "华东", scope: "domestic" },
  { code: "NKG", city: "南京", emoji: "🍁", vibe: "梧桐颐和·鸭血粉丝", region: "华东", scope: "domestic" },
  { code: "XMN", city: "厦门", emoji: "🌊", vibe: "鼓浪屿·沙坡尾", region: "华东", scope: "domestic" },
  { code: "WNZ", city: "温州", emoji: "🛶", vibe: "雁荡山·海岛渔村", region: "华东", scope: "domestic" },
  { code: "TAO", city: "青岛", emoji: "🍺", vibe: "红瓦绿树·啤酒海鲜", region: "华东", scope: "domestic" },
  // 华中 / 华北
  { code: "WUH", city: "武汉", emoji: "🌺", vibe: "樱花热干面·东湖", region: "华中", scope: "domestic" },
  { code: "CSX", city: "长沙", emoji: "🦞", vibe: "茶颜悦色·文和友", region: "华中", scope: "domestic" },
  { code: "CGO", city: "郑州", emoji: "🏯", vibe: "中原腹地·少林寺", region: "华中", scope: "domestic" },
  { code: "TSN", city: "天津", emoji: "🥟", vibe: "煎饼果子·相声码头", region: "华北", scope: "domestic" },
  // 西北
  { code: "XIY", city: "西安", emoji: "🏺", vibe: "兵马俑·大唐不夜城", region: "西北", scope: "domestic" },
  { code: "LHW", city: "兰州", emoji: "🐏", vibe: "牛肉面·黄河铁桥", region: "西北", scope: "domestic" },
  // 东北
  { code: "HRB", city: "哈尔滨", emoji: "❄️", vibe: "冰雪大世界·中央大街", region: "东北", scope: "domestic" },
  { code: "DLC", city: "大连", emoji: "⛵", vibe: "星海广场·滨海路", region: "东北", scope: "domestic" },

  /* ---------- 东南亚（国际）核心 5 国 ---------- */

  // 🇹🇭 泰国
  { code: "BKK", city: "曼谷", emoji: "🛕", vibe: "夜市寺庙·冬阴功", region: "东南亚", scope: "international" },
  { code: "HKT", city: "普吉岛", emoji: "🏝️", vibe: "安达曼海·跳岛潜水", region: "东南亚", scope: "international" },
  { code: "CNX", city: "清迈", emoji: "🐘", vibe: "古城夜市·丛林飞跃", region: "东南亚", scope: "international" },
  // 🇸🇬 新加坡
  { code: "SIN", city: "新加坡", emoji: "🦁", vibe: "鱼尾狮·环球影城", region: "东南亚", scope: "international" },
  // 🇲🇾 马来西亚
  { code: "KUL", city: "吉隆坡", emoji: "🏙️", vibe: "双子塔·肉骨茶", region: "东南亚", scope: "international" },
  { code: "PEN", city: "槟城", emoji: "🍜", vibe: "乔治市壁画·炒粿条", region: "东南亚", scope: "international" },
  // 🇻🇳 越南
  { code: "SGN", city: "胡志明", emoji: "🛵", vibe: "法式风情·湄公河", region: "东南亚", scope: "international" },
  { code: "HAN", city: "河内", emoji: "🌾", vibe: "还剑湖·下龙湾中转", region: "东南亚", scope: "international" },
  { code: "DAD", city: "岘港", emoji: "🏖️", vibe: "巴拿山·美溪海滩", region: "东南亚", scope: "international" },
  // 🇮🇩 印度尼西亚
  { code: "DPS", city: "巴厘岛", emoji: "🌺", vibe: "神庙梯田·冲浪日落", region: "东南亚", scope: "international" },
  { code: "CGK", city: "雅加达", emoji: "🌆", vibe: "千岛之国门户", region: "东南亚", scope: "international" },
];

/** 国内目的地（按 scope 切片） */
export const DOMESTIC_DESTINATIONS: Destination[] = DESTINATIONS.filter(
  (d) => d.scope === "domestic"
);

/** 东南亚目的地（按 scope 切片） */
export const SEA_DESTINATIONS: Destination[] = DESTINATIONS.filter(
  (d) => d.scope === "international"
);

/** 目的地 code -> Destination 查找表（国内 + 国际全量） */
export const DESTINATION_MAP: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.code, d])
);

/** 出发 code -> OriginCity 查找表 */
export const ORIGIN_MAP: Record<string, OriginCity> = Object.fromEntries(
  ORIGIN_CITIES.map((o) => [o.code, o])
);

/** 根据 code 推断 scope，未知 code 默认 domestic（向后兼容） */
export function scopeOf(code: string): DestScope {
  return DESTINATION_MAP[code]?.scope ?? "domestic";
}

/** scope -> 默认阈值 */
export function defaultThresholdOf(scope: DestScope): number {
  return scope === "international" ? DEFAULT_SEA_THRESHOLD : DEFAULT_THRESHOLD;
}

/* ------------------------------------------------------------------ */
/* 价格工具                                                            */
/* ------------------------------------------------------------------ */

/** 计算舱位含税总价（含基建燃油） */
export function cabinTotal(
  cabin: { adult_price: number; airport_tax?: number; fuel_tax?: number }
): number {
  return (
    (Number(cabin.adult_price) || 0) +
    (Number(cabin.airport_tax) || 0) +
    (Number(cabin.fuel_tax) || 0)
  );
}

/** 判断某含税总价是否在推送阈值内（threshold × 110%） */
export function withinPush(total: number, threshold: number): boolean {
  return total > 0 && total <= pushCeil(threshold);
}

/** 距离发车 / 出发的天数标签（"今天"/"明天"/"周X"/"M/D"） */
export function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "后天";
  if (diff > 0 && diff < 7) return `周${week}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "2026-07-03 08:00" -> "08:00" */
export function hm(timeStr: string): string {
  const m = /(\d{2}:\d{2})/.exec(timeStr);
  return m ? m[1] : timeStr;
}
