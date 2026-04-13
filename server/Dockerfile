FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY server/src ./src
COPY server/build.js ./

# Build
RUN npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
