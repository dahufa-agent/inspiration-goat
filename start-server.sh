#!/bin/bash
# 加载环境变量并启动服务

# 设置默认端口
export PORT=${PORT:-5000}
export NODE_ENV=${NODE_ENV:-production}

# 输出启动信息
echo "Starting server with PORT=$PORT, NODE_ENV=$NODE_ENV"

# 启动服务
cd /workspace/projects/server
node dist/index.js
