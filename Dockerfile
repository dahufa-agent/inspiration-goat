FROM node:18-alpine

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY server/src ./src
COPY server/build.js ./
COPY server/tsconfig.json ./

# Build
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Start server
CMD ["node", "dist/index.js"]
