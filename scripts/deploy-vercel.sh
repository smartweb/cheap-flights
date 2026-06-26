#!/usr/bin/env bash
# 一键部署到 Vercel（需本机能完成 vercel login 浏览器/邮箱验证）
# 用法：
#   ./scripts/deploy-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) 登录（仅首次需要）
vercel whoami >/dev/null 2>&1 || vercel login

# 2) 注入生产环境变量（龙虾出行 token，仅服务端）
#    从本地 .env.local 读取，避免明文写入脚本
TOKEN=$(grep '^LX_API_TOKEN=' .env.local | cut -d= -f2-)
BASE=$(grep '^LX_API_BASE=' .env.local | cut -d= -f2- || echo "https://api.longxiachuxing.com")

# 3) 生产部署（生产环境别名）
vercel --prod --yes \
  --env LX_API_TOKEN="$TOKEN" \
  --env LX_API_BASE="$BASE"

echo ""
echo "✅ 部署完成。访问 Vercel 给出的生产域名即可。"
echo "   如需后续更新：git push 后再次运行本脚本，或在 Vercel 开启 GitHub 自动部署。"
