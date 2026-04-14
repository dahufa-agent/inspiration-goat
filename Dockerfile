FROM node:18-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile

COPY server/src ./server/src
COPY server/build.js ./server/
COPY server/tsconfig.json ./server/

RUN cd server && npm run build

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
