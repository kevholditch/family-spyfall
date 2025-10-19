# Build stage
FROM node:18-alpine AS build

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set production environment and build with minification
ENV NODE_ENV=production
RUN pnpm --filter=@family-spyfall/web build

# Production stage
FROM nginx:alpine AS production

# Install envsubst for environment variable substitution and su-exec for user switching
RUN apk add --no-cache gettext su-exec

# Set environment defaults
ENV NGINX_PORT=80
ENV APP_DOMAIN=localhost
ENV API_HOST=localhost
ENV API_PORT=4000

# Copy built application
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration template and startup script
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh

# Set proper permissions for entrypoint script and nginx files
RUN chmod +x /docker-entrypoint.sh && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx && \
    mkdir -p /var/run && \
    chown -R nginx:nginx /var/run && \
    chmod -R 755 /var/log/nginx && \
    chmod -R 755 /var/cache/nginx

# Expose configurable port (default 80)
EXPOSE 80

# Health check (run as root since we need to test the port)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Use custom entrypoint (it will handle the user switching)
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
