import type { Config } from "tailwindcss";

/**
 * 设计语言：Geist Design System（Vercel）
 *  - 灰阶骨架：纯白画布 + 200/400/600/900 灰阶发丝分隔
 *  - 强调色：仅蓝色 #0070f3（信息）与红/绿（价格涨跌、余票状态），克制使用
 *  - 中等圆角（8–12px）、极淡阴影、tabular 数字
 *  - 排版优先于装饰：留白、对比、信息密度
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Geist 灰阶（L0–L1000）
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#eaeaea",
          300: "#e0e0e0",
          400: "#b3b3b3",
          500: "#a3a3a3",
          600: "#888888",
          700: "#666666",
          800: "#444444",
          900: "#171717",
          1000: "#000000",
        },
        // 蓝色强调（Geist primary）
        blue: {
          DEFAULT: "#0070f3",
          50: "#e8f1ff",
          100: "#d5e7ff",
          500: "#0070f3",
          600: "#0061d5",
          700: "#0050b3",
        },
        // 语义色（极克制）
        success: {
          DEFAULT: "#0070f3", // Geist 不滥用绿色，沿用蓝
          green: "#0b8a4b",
          soft: "#e7f6ec",
        },
        danger: {
          DEFAULT: "#e00000",
          soft: "#ffecec",
        },
        warning: {
          DEFAULT: "#f5a623",
          soft: "#fff6e6",
        },
        // 画布
        canvas: "#ffffff",
        ink: "#171717",
        muted: "#666666",
        line: "#eaeaea",
        subtle: "#f5f5f5",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        h5: "480px",
      },
      boxShadow: {
        none: "none",
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        sm: "0 2px 4px -1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        md: "0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)",
        lg: "0 12px 32px -8px rgba(0,0,0,0.12), 0 4px 8px -4px rgba(0,0,0,0.06)",
        ring: "0 0 0 1px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "14px",
      },
      letterSpacing: {
        tightish: "-0.01em",
        tighter: "-0.02em",
      },
      fontSize: {
        "2xs": ["11px", "16px"],
      },
    },
  },
  plugins: [],
};

export default config;
