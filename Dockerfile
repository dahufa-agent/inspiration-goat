FROM node:18-alpine

WORKDIR /app

# 复制后端文件
COPY server/package.json ./server/
COPY server/src ./server/src
COPY server/build.js ./server/
COPY server/tsconfig.json ./server/

# 复制前端dist到/public
COPY apps/web/dist ./public

# 安装后端依赖并构建
WORKDIR /app/server
RUN npm install && npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]
