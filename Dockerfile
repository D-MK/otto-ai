# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/web/package*.json ./packages/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build core package
WORKDIR /app/packages/core
RUN npm run build

# Build web package
WORKDIR /app/packages/web
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy server file (uses only Node.js built-ins, no dependencies needed)
COPY server.mjs ./

# Copy built files from builder
COPY --from=builder /app/packages/web/dist ./dist

# Expose port (fly.io will set PORT env var)
EXPOSE 8080

# Start the server
CMD ["node", "server.mjs"]

