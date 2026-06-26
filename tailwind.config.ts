import type { Config } from "tailwindcss";

/**
 * 设计语言：年轻、轻快、有活力的特价机票 App
 *  - 干净画布 mist (#f6f8fb)，主色为活力青柠 (#16c47f) + 珊瑚强调 (#ff6b5b)
 *  - 价格 / CTA 用珊瑚红制造「抢」的紧迫感；标签/正向反馈用青柠
 *  - 大圆角卡片 + 柔和阴影 + 微动效，移动端优先
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色：活力青柠（正向、省钱、便宜）
        brand: {
          DEFAULT: "#16c47f",
          dark: "#0e9e67",
          deep: "#0a7d52",
          soft: "#e7f9f0",
        },
        // 强调色：珊瑚红（价格、抢购、紧迫）
        coral: {
          DEFAULT: "#ff6b5b",
          dark: "#ed4a39",
          soft: "#fff0ee",
        },
        ink: "#1a1d24", // 深墨蓝
        muted: "#7a8294", // 中性灰蓝
        line: "#e9edf3", // 发丝线
        canvas: "#f6f8fb", // 干净画布
        card: "#ffffff",
        sun: "#ffb627", // 高亮黄（勋章/亮点）
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "Arial",
          "sans-serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "Arial",
          "sans-serif",
        ],
        // 等宽数字感（价格/时间）
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          '"SF Mono"',
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      maxWidth: {
        h5: "480px",
      },
      boxShadow: {
        card: "0 8px 30px -10px rgba(20, 40, 60, 0.12)",
        pop: "0 6px 20px -6px rgba(255, 107, 91, 0.35)",
        soft: "0 2px 10px -3px rgba(20, 40, 60, 0.08)",
      },
      borderRadius: {
        xl2: "20px",
        xl3: "26px",
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
