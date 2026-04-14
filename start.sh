#!/bin/bash
# 启动脚本 - 用于 Zeabur 部署

# 设置环境变量
export NODE_ENV=production

# 如果没有设置 PORT，使用 5000
if [ -z "$PORT" ]; then
    export PORT=5000
fi

# 加载环境变量（如果存在）
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 进入 server 目录
cd /workspace/projects/server 2>/dev/null || cd server 2>/dev/null || cd $(dirname $0)/server 2>/dev/null

# 启动服务
echo "Starting server on port $PORT..."
node dist/index.js
