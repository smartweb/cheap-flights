import { NextResponse } from "next/server";
import { lxConfig } from "@/lib/client";

export const dynamic = "force-dynamic";

/** 健康检查：确认服务端 token 已配置（不泄露 token 本身） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      has_token: lxConfig.hasToken,
      base: lxConfig.BASE,
    },
  });
}
