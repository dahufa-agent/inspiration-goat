FROM node:18-alpine

WORKDIR /app

# 复制后端
COPY server/package.json ./server/
COPY server/src ./server/src
COPY server/build.js ./server/
COPY server/tsconfig.json ./server/

# 复制前端dist到/app/public
COPY apps/web/dist ./public

# 安装依赖并构建后端
WORKDIR /app/server
RUN npm install && npm run build

EXPOSE 8080
CMD ["node", "dist/index.js"]
