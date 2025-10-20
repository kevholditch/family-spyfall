#!/bin/sh
set -e

# Set defaults for environment variables
export NGINX_PORT=${NGINX_PORT:-80}
export APP_DOMAIN=${APP_DOMAIN:-localhost}
export API_HOST=${API_HOST:-localhost}
export API_PORT=${API_PORT:-4000}

# Generate nginx configuration from template
envsubst '${NGINX_PORT} ${APP_DOMAIN} ${API_HOST} ${API_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Set proper permissions for the generated config
chmod 644 /etc/nginx/conf.d/default.conf

# Ensure nginx directories have proper permissions
mkdir -p /var/log/nginx /var/cache/nginx /var/run
chown -R nginx:nginx /var/log/nginx /var/cache/nginx /usr/share/nginx/html
chmod -R 755 /var/log/nginx /var/cache/nginx

# Test nginx configuration
nginx -t

# Run nginx in foreground (it will switch to nginx user internally)
exec "$@"
