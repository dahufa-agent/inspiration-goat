FROM node:18-alpine

LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /app

# 复制monorepo配置
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# 复制后端文件
COPY server/package.json ./server/
COPY server/tsconfig.json ./server/
COPY server/build.js ./server/
COPY server/src ./server/src

# 复制前端文件
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/tsconfig.node.json ./apps/web/
COPY apps/web/vite.config.ts ./apps/web/
COPY apps/web/src ./apps/web/src/
COPY apps/web/public ./apps/web/public/

# 安装pnpm
RUN npm install -g pnpm@9

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 构建前端
WORKDIR /app/apps/web
RUN pnpm run build

# 构建后端
WORKDIR /app/server
RUN pnpm run build

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
