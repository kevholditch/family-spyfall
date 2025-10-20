#!/bin/bash

# Simulate the docker-compose.yml generation from the Makefile
DOMAIN="test.example.com"
mkdir -p local-setup/data local-setup/letsencrypt

echo "version: '3.8'" > local-setup/docker-compose.yml
echo "services:" >> local-setup/docker-compose.yml
echo "  spyfall-api:" >> local-setup/docker-compose.yml
echo "    image: spyfall-api:latest" >> local-setup/docker-compose.yml
echo "    container_name: spyfall-api" >> local-setup/docker-compose.yml
echo "    environment:" >> local-setup/docker-compose.yml
echo "      - SERVER_PORT=4000" >> local-setup/docker-compose.yml
echo "      - HOST=0.0.0.0" >> local-setup/docker-compose.yml
echo "      - ALLOWED_ORIGIN=https://web.$DOMAIN" >> local-setup/docker-compose.yml
echo "      - WEB_ORIGIN=https://web.$DOMAIN" >> local-setup/docker-compose.yml
echo "    networks:" >> local-setup/docker-compose.yml
echo "      - spyfall-network" >> local-setup/docker-compose.yml
echo "    restart: unless-stopped" >> local-setup/docker-compose.yml
echo "" >> local-setup/docker-compose.yml
echo "  spyfall-web:" >> local-setup/docker-compose.yml
echo "    image: spyfall-web:latest" >> local-setup/docker-compose.yml
echo "    container_name: spyfall-web" >> local-setup/docker-compose.yml
echo "    environment:" >> local-setup/docker-compose.yml
echo "      - NGINX_PORT=80" >> local-setup/docker-compose.yml
echo "      - APP_DOMAIN=web.$DOMAIN" >> local-setup/docker-compose.yml
echo "      - API_HOST=api.$DOMAIN" >> local-setup/docker-compose.yml
echo "      - API_PORT=4000" >> local-setup/docker-compose.yml
echo "    networks:" >> local-setup/docker-compose.yml
echo "      - spyfall-network" >> local-setup/docker-compose.yml
echo "    restart: unless-stopped" >> local-setup/docker-compose.yml
echo "" >> local-setup/docker-compose.yml
echo "  nginx-proxy-manager:" >> local-setup/docker-compose.yml
echo "    image: jc21/nginx-proxy-manager:latest" >> local-setup/docker-compose.yml
echo "    container_name: spyfall-npm" >> local-setup/docker-compose.yml
echo "    ports:" >> local-setup/docker-compose.yml
echo "      - \"80:80\"" >> local-setup/docker-compose.yml
echo "      - \"443:443\"" >> local-setup/docker-compose.yml
echo "      - \"81:81\"" >> local-setup/docker-compose.yml
echo "    volumes:" >> local-setup/docker-compose.yml
echo "      - ./data:/data" >> local-setup/docker-compose.yml
echo "      - ./letsencrypt:/etc/letsencrypt" >> local-setup/docker-compose.yml
echo "    restart: unless-stopped" >> local-setup/docker-compose.yml
echo "    networks:" >> local-setup/docker-compose.yml
echo "      - spyfall-network" >> local-setup/docker-compose.yml
echo "" >> local-setup/docker-compose.yml
echo "networks:" >> local-setup/docker-compose.yml
echo "  spyfall-network:" >> local-setup/docker-compose.yml
echo "    driver: bridge" >> local-setup/docker-compose.yml

echo "Generated docker-compose.yml:"
cat local-setup/docker-compose.yml
