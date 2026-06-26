# 🦞 捡漏机票 · 特价监控（移动端 H5）

基于**龙虾出行开放平台**接口实现的特价机票监控应用。从北上广深出发（默认深圳），设置一个监控金额（默认 ¥500），App 自动扫描未来 7 天 × 全国热门目的地，只把**含税总价 ≤ 监控金额 × 110%**（含机建燃油）的机票推给你。

> 给年轻人的「捡漏」工具：价格、出发地、阈值都能自定义，大卡片 + 珊瑚红价格，一眼看到最便宜的那张。

## ✨ 核心功能

- **北上广深出发**（默认深圳），出发地一键切换并本地记忆。
- **监控金额可调**（默认 ¥500），只推 `监控金额 × 110%`（含机建燃油）以下的机票。
  - 例：监控 ¥500 → 只推 ≤ ¥550 的机票，留一点抢票缓冲。
- **含税总价透明**：`票价 + 机建费（¥50）+ 燃油费`，绝不玩「不含税」套路。
- **7 天 × 25 个目的地** 自动并发扫描，按价格 / 时间 / 时长排序。
- **大卡片 + 价格高亮 + 余票标签**，移动端优先，体验轻快。
- **航班详情弹层**：航线时间轴、费用明细、退改行李规则，一键跳转下单。

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
│   │   └── health/route.ts    # 健康检查
│   ├── layout.tsx             # 移动端 H5 容器
│   ├── page.tsx               # 首页入口
│   └── home-client.tsx        # 首页交互（设置/扫描/列表）
├── components/
│   ├── DealCard.tsx           # 特价卡片
│   ├── DealDetailSheet.tsx    # 航班详情弹层
│   ├── SettingsSheet.tsx      # 出发地/阈值设置
│   └── ui.tsx                 # 通用组件
└── lib/
    ├── client.ts              # 龙虾出行 HTTP 客户端（Bearer 鉴权）
    ├── flight.ts              # 机票业务封装
    ├── types.ts               # 接口类型
    ├── catalog.ts             # 出发城市/目的地目录 + 价格工具
    ├── deal.ts                # 特价数据结构
    └── settings.ts            # localStorage 设置持久化
```

## 🔍 价格规则说明

- **含税总价** = `adult_price + airport_tax + fuel_tax`（机建费 + 燃油费）。
- **推送阈值** = `监控金额 × 110%`，仅推送 ≤ 该阈值的舱位。
- 价格为搜索阶段参考价，最终以下单时实时验价为准。
- 下单由龙虾出行开放平台收银台完成。
