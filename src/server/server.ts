/**
 * 自定义 Next.js server（仅生产/自托管环境）
 *
 * 作用：在标准 next start 之上，额外启动一个 node-cron 定时器，
 * 周期性触发航线监控（runMonitor）。
 *
 * 用法：
 *   开发：npm run dev:server   （保留 next HMR + 启动 cron）
 *   生产：先 next build，再 npm run start:server
 *
 * 注：Vercel 不支持长驻进程内的 cron，因此这个入口仅适用于自建服务器。
 */
import next from "next";
import { createServer } from "node:http";
import cron from "node-cron";
import { runMonitor } from "./cron";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";
const schedule = process.env.CRON_SCHEDULE ?? "0 */3 * * *"; // 默认每 3 小时

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 1) HTTP 服务（所有请求交给 Next.js 处理）
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`> Ready on http://${hostname}:${port} (dev=${dev})`);
  });

  // 2) 定时监控
  if (cron.validate(schedule)) {
    // eslint-disable-next-line no-console
    console.log(`> 监控 cron 已注册: "${schedule}"`);
    cron.schedule(schedule, async () => {
      const t0 = Date.now();
      try {
        const stats = await runMonitor();
        // eslint-disable-next-line no-console
        console.log(
          `[monitor] 扫描${stats.scanned} 命中${stats.hit} 推送${stats.pushed} 错误${stats.errors} 耗时${Date.now() - t0}ms`
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[monitor] 运行失败:", e);
      }
    });

    // 启动后延迟 10s 跑一次，避免冷启动与首个请求争抢资源
    if (process.env.MONITOR_BOOT_SCAN === "1") {
      setTimeout(() => {
        runMonitor().catch(() => {});
      }, 10_000);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`> CRON_SCHEDULE "${schedule}" 非法，监控未启动`);
  }
});
