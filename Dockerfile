FROM node:18-alpine

LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /app

# 复制整个项目
COPY . .

# 进入 server 目录
WORKDIR /app/server

# 安装依赖
RUN npm install

# 构建项目
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
