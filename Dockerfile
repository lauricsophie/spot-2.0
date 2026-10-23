# ============================================
# Stage 1: Build with esbuild
# ============================================
FROM node:22-alpine AS builder

# Enable Corepack for Yarn 4
RUN corepack enable

WORKDIR /app

# Copy package files and Yarn config
COPY package.json yarn.lock .yarnrc.yml ./

# Install all dependencies
RUN yarn install --immutable

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Bundle with esbuild (resolves all imports into single file)
RUN npx esbuild src/index.ts --bundle --platform=node --target=node22 --outfile=dist/index.js --format=esm --packages=external

# ============================================
# Stage 2: Production
# ============================================
FROM node:22-alpine AS production

# Enable Corepack for Yarn 4
RUN corepack enable

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and Yarn config
COPY package.json yarn.lock .yarnrc.yml ./

# Install production dependencies only
RUN yarn workspaces focus --production && \
    yarn cache clean

# Copy bundled code from builder
COPY --from=builder /app/dist ./dist

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]