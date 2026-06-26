import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Flight Deals · 特价机票监控",
  description: "北上广深出发，监控含税低价机票，低于你的预算就推给你。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <div className="h5-shell">{children}</div>
      </body>
    </html>
  );
}
