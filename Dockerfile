# Deno stage - get deno binary
FROM denoland/deno:alpine AS deno

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Copy deno from official image
# Find and copy deno binary from the deno stage
RUN --mount=type=bind,from=deno,source=/,target=/deno-root \
    if [ -f /deno-root/usr/bin/deno ]; then \
        cp /deno-root/usr/bin/deno /usr/local/bin/deno; \
    elif [ -f /deno-root/usr/local/bin/deno ]; then \
        cp /deno-root/usr/local/bin/deno /usr/local/bin/deno; \
    elif [ -f /deno-root/deno ]; then \
        cp /deno-root/deno /usr/local/bin/deno; \
    else \
        echo "Error: Deno binary not found. Searched in /usr/bin/deno, /usr/local/bin/deno, and /deno" && \
        find /deno-root -name "deno" -type f 2>/dev/null | head -1 | xargs -I {} cp {} /usr/local/bin/deno || exit 1; \
    fi && \
    chmod +x /usr/local/bin/deno

# Install yt-dlp, ffmpeg, and python
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    && pip3 install --break-system-packages yt-dlp \
    && deno --version \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create downloads directory
RUN mkdir -p /app/downloads

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "dist/index.js"]


