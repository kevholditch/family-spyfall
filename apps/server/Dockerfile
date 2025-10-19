# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/

# Install all dependencies for build
ENV CI=true
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
COPY . .
RUN pnpm --filter=@family-spyfall/server build

# Production dependencies stage
FROM base AS prod-deps
ENV CI=true
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter=@family-spyfall/server

# Production stage - use the prod-deps environment but with minimal additional changes
FROM prod-deps AS production

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Copy the built application from build stage
COPY --from=build /app/apps/server/dist ./apps/server/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set proper ownership before switching user
RUN chown -R nodejs:nodejs /app

# Set environment defaults
ENV SERVER_PORT=4000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Switch to non-root user
USER nodejs

# Change working directory to server app for better module resolution
WORKDIR /app/apps/server

# Expose configurable port (note: EXPOSE doesn't support variables, so we expose 4000 as default)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the application with dumb-init from the server directory
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
