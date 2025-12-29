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

# Install yt-dlp, ffmpeg, python, and deno (JavaScript runtime for yt-dlp)
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    curl \
    unzip \
    && pip3 install --break-system-packages yt-dlp \
    && curl -fsSL https://deno.land/install.sh | sh \
    && mv /root/.deno/bin/deno /usr/local/bin/deno \
    && chmod +x /usr/local/bin/deno \
    && rm -rf /var/cache/apk/* /root/.deno

WORKDIR /app

# Create downloads and tmp directories
RUN mkdir -p /app/downloads /app/tmp

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV YT_DLP_PO_TOKEN=MlMmXILMlmpLgSZgDsq6Pgi8iUlM0ujCBrSPy6w0D8yl8Vp-Kxqx9Q68VIBuxVKlL1320Pzf8lHUSNzpXG76swekVbFyvAoLBmnkIL5uQ49WdukD5A==

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 /app/tmp

USER nodejs

CMD ["node", "dist/index.js"]


