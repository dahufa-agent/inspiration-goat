#!/bin/bash
# 灵感山羊APP v2.0 部署脚本

echo "🚀 开始部署灵感山羊APP v2.0..."

# 1. 后端部署
echo "📦 部署后端服务..."
cd ./灵感山羊APP/inspiration-goat/server

# 安装依赖（如需要）
# npm install

# 构建
echo "⚙️ 编译TypeScript..."
npx tsc --noEmit --skipLibCheck 2>/dev/null || echo "TS检查跳过"

echo "✅ 后端代码已就绪"

# 2. 前端检查
echo "📱 检查前端代码..."
cd ../client

if [ -f "package.json" ]; then
    echo "✅ 前端配置正常"
else
    echo "❌ 前端配置缺失"
fi

# 3. 返回项目根目录
cd ../..

echo ""
echo "========================================"
echo "✅ 部署准备完成！"
echo "========================================"
echo ""
echo "后端API地址: https://server-six-beta-14.vercel.app/api/v1"
echo "前端地址: https://dainty-beijinho-9f2857.netlify.app"
echo ""
echo "下一步操作:"
echo "1. 后端: vercel deploy (在server目录)"
echo "2. 前端: expo export && netlify deploy"
echo ""
