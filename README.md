# 🦞 捡漏机票 · 特价监控（移动端 H5）

基于**龙虾出行开放平台**接口实现的特价机票监控 + 下单应用。从北上广深出发（默认深圳），设置一个监控金额（默认 ¥500），App 自动扫描未来 7 天 × 全国热门目的地，只把**含税总价 ≤ 监控金额 × 110%**（含机建燃油）的机票推给你；选中即可**实时验价 → 创建订单 → 跳转收银台支付**。

> 给年轻人的「捡漏」工具：Geist 设计语言，价格、出发地、阈值都能自定义，选中心仪机票即走真实下单流程。

## ✨ 核心功能

- **北上广深出发**（默认深圳），出发地一键切换并本地记忆。
- **监控金额可调**（默认 ¥500），只推 `监控金额 × 110%`（含机建燃油）以下的机票。
  - 例：监控 ¥500 → 只推 ≤ ¥550 的机票，留一点抢票缓冲。
- **含税总价透明**：`票价 + 机建费（¥50）+ 燃油费`，绝不玩「不含税」套路。
- **7 天 × 25 个目的地** 自动并发扫描，按价格 / 时间 / 时长排序。
- **真实下单支付**：选机票 → 填乘机人 → 服务端实时验价 → 创建订单 → 跳转龙虾出行托管收银台完成支付。
- **Geist 设计**：Vercel 设计语言，灰阶骨架 + 单色排版 + tabular 数字，克制专注。

## 🧱 技术栈

- **Next.js 14**（App Router）+ **React 18** + **TypeScript**
- **Tailwind CSS**（自定义年轻活力配色：青柠 + 珊瑚红）
- 龙虾出行开放平台 `/open/v1/flight/search` 真实接口（服务端代理，token 不进前端）

## 🚀 本地开发

```bash
npm install
cp .env.example .env.local   # 填入你的 LX_API_TOKEN
npm run dev                  # http://localhost:3000
```

环境变量：

| 变量 | 说明 |
|---|---|
| `LX_API_TOKEN` | 龙虾出行开放平台 Bearer Token（`rdak_live_*`） |
| `LX_API_BASE` | 上游网关，默认 `https://api.longxiachuxing.com` |

## ☁️ 部署到 Vercel

1. 推送到 GitHub 仓库。
2. 在 Vercel 导入该仓库。
3. 在 Project Settings → Environment Variables 添加：
   - `LX_API_TOKEN` = `rdak_live_...`
   - `LX_API_BASE` = `https://api.longxiachuxing.com`（可选）
4. Deploy。

> ⚠️ Token 是服务端变量，仅用于 `/api/*` 路由，不会进入前端 bundle。

## 📁 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── scan/route.ts      # 特价扫描：并发扇出 + 阈值过滤
│   │   ├── book/route.ts      # 下单：验价 → 创建订单 → 返回收银台 URL
│   │   └── health/route.ts    # 健康检查
│   ├── book/                  # 下单填表页（乘机人/联系人）
│   ├── layout.tsx             # 移动端 H5 容器（Geist 字体）
│   ├── page.tsx               # 首页入口
│   └── home-client.tsx        # 首页交互（设置/扫描/列表）
├── components/
│   ├── DealCard.tsx           # 特价卡片
│   ├── DealDetailSheet.tsx    # 航班详情弹层（去抢票入口）
│   ├── SettingsSheet.tsx      # 出发地/阈值设置
│   └── ui.tsx                 # 通用组件（Geist）
└── lib/
    ├── client.ts              # 龙虾出行 HTTP 客户端（Bearer 鉴权）
    ├── flight.ts              # 机票业务封装（搜索/验价/下单/支付）
    ├── types.ts               # 接口类型（搜索/验价/下单/支付）
    ├── catalog.ts             # 出发城市/目的地目录 + 价格工具
    ├── deal.ts                # 特价数据结构
    ├── settings.ts            # localStorage 设置持久化
    └── passengers.ts          # 乘机人信息本地记忆
```

## 💳 下单支付流程

完整接入龙虾出行开放平台真实下单链路（不依赖跳转网页，走接口创建订单）：

```
选机票 → 填乘机人/联系人 → 服务端 [验价 + 下单] → 跳转收银台支付
```

1. **验价** `POST /open/v1/flight/pricing`
   用 `search_offer_id` + 乘机人换取**最新 offer_id**（10 分钟有效）+ 锁定实时总价（含服务费）。
2. **创建订单** `POST /open/v1/flight/order/create`
   用 `offer_id` + 联系人 + 乘机人 + `pay_mode: user_pay` 创建订单，返回 `checkout_url`（托管收银台）+ `system_no`。
3. **支付**
   前端跳转 `checkout_url`，由龙虾出行收银台完成支付（微信/支付宝）。

> `/api/book` 在服务端串联「验价 → 下单」，身份证/手机号等敏感数据仅服务端流转，不进前端 bundle、不写日志。下单接口有 IP 维度限流（10 秒内 ≤ 2 次）。
> ⚠️ 使用生产 token（`rdak_live`）时，下单成功会创建真实订单；支付在收银台完成后才扣费。

## 🔍 价格规则说明

- **含税总价** = `adult_price + airport_tax + fuel_tax`（机建费 + 燃油费）。
- **推送阈值** = `监控金额 × 110%`，仅推送 ≤ 该阈值的舱位。
- 价格为搜索阶段参考价，最终以下单时实时验价为准。
- 下单由龙虾出行开放平台收银台完成。
