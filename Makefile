.PHONY: test-server test-web test-web-chrome test install-browsers local-deploy local-stop docker-build-api docker-build-web

# Install Playwright browsers with dependencies
install-browsers:
	@echo "Installing Playwright browsers..."
	pnpm -C apps/web exec playwright install --with-deps

# Run server tests (unit + integration)
test-server:
	@echo "Running server tests..."
	pnpm -C apps/server test run

# Run web tests (e2e)
test-web:
	@echo "Running web E2E tests..."
	pnpm -C apps/web test:e2e

# Run web tests with Chrome only
test-web-chrome:
	@echo "Running web E2E tests with Chrome..."
	pnpm -C apps/web test:e2e --project=chromium

# Run all tests
test: test-server test-web
	@echo "All tests completed!"

# Local deployment - sets up Docker containers and Nginx Proxy Manager
# Usage: make local-deploy DOMAIN=your-domain.com
local-deploy:
	@if [ -z "$(DOMAIN)" ]; then \
		echo "Error: DOMAIN is required. Usage: make local-deploy DOMAIN=your-domain.com"; \
		exit 1; \
	fi
	@echo "🏠 Setting up local deployment for domain: $(DOMAIN)"
	@echo "📋 Building Docker containers..."
	@make docker-build-api docker-build-web
	@echo "📋 Creating Docker Compose configuration..."
	@mkdir -p local-setup/data local-setup/letsencrypt
	@echo "services:" > local-setup/docker-compose.yml
	@echo "  spyfall-api:" >> local-setup/docker-compose.yml
	@echo "    image: spyfall-api:latest" >> local-setup/docker-compose.yml
	@echo "    container_name: spyfall-api" >> local-setup/docker-compose.yml
	@echo "    environment:" >> local-setup/docker-compose.yml
	@echo "      - SERVER_PORT=4000" >> local-setup/docker-compose.yml
	@echo "      - HOST=0.0.0.0" >> local-setup/docker-compose.yml
	@echo "      - ALLOWED_ORIGIN=https://web.$(DOMAIN)" >> local-setup/docker-compose.yml
	@echo "      - WEB_ORIGIN=https://web.$(DOMAIN)" >> local-setup/docker-compose.yml
	@echo "    networks:" >> local-setup/docker-compose.yml
	@echo "      - spyfall-network" >> local-setup/docker-compose.yml
	@echo "    restart: unless-stopped" >> local-setup/docker-compose.yml
	@echo "" >> local-setup/docker-compose.yml
	@echo "  spyfall-web:" >> local-setup/docker-compose.yml
	@echo "    image: spyfall-web:latest" >> local-setup/docker-compose.yml
	@echo "    container_name: spyfall-web" >> local-setup/docker-compose.yml
	@echo "    environment:" >> local-setup/docker-compose.yml
	@echo "      - NGINX_PORT=80" >> local-setup/docker-compose.yml
	@echo "      - APP_DOMAIN=web.$(DOMAIN)" >> local-setup/docker-compose.yml
	@echo "      - API_HOST=api.$(DOMAIN)" >> local-setup/docker-compose.yml
	@echo "      - API_PORT=4000" >> local-setup/docker-compose.yml
	@echo "    networks:" >> local-setup/docker-compose.yml
	@echo "      - spyfall-network" >> local-setup/docker-compose.yml
	@echo "    restart: unless-stopped" >> local-setup/docker-compose.yml
	@echo "" >> local-setup/docker-compose.yml
	@echo "  nginx-proxy-manager:" >> local-setup/docker-compose.yml
	@echo "    image: jc21/nginx-proxy-manager:latest" >> local-setup/docker-compose.yml
	@echo "    container_name: spyfall-npm" >> local-setup/docker-compose.yml
	@echo "    ports:" >> local-setup/docker-compose.yml
	@echo "      - \"80:80\"" >> local-setup/docker-compose.yml
	@echo "      - \"443:443\"" >> local-setup/docker-compose.yml
	@echo "      - \"81:81\"" >> local-setup/docker-compose.yml
	@echo "    volumes:" >> local-setup/docker-compose.yml
	@echo "      - ./data:/data" >> local-setup/docker-compose.yml
	@echo "      - ./letsencrypt:/etc/letsencrypt" >> local-setup/docker-compose.yml
	@echo "    restart: unless-stopped" >> local-setup/docker-compose.yml
	@echo "    networks:" >> local-setup/docker-compose.yml
	@echo "      - spyfall-network" >> local-setup/docker-compose.yml
	@echo "" >> local-setup/docker-compose.yml
	@echo "networks:" >> local-setup/docker-compose.yml
	@echo "  spyfall-network:" >> local-setup/docker-compose.yml
	@echo "    driver: bridge" >> local-setup/docker-compose.yml
	@echo "🚀 Starting all services..."
	@cd local-setup && docker-compose up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 15
	@echo "🌐 All services are running!"
	@echo ""
	@echo "📝 Next steps:"
	@echo "1. Open http://localhost:81 in your browser"
	@echo "2. Login with: admin@example.com / changeme"
	@echo "3. Create proxy hosts:"
	@echo "   - web.$(DOMAIN) → http://spyfall-web:80"
	@echo "   - api.$(DOMAIN) → http://spyfall-api:4000"
	@echo "4. Generate SSL certificates for both hosts"
	@echo ""
	@echo "🎮 Your game will be available at:"
	@echo "   https://web.$(DOMAIN)"
	@echo "   https://api.$(DOMAIN)"

# Start the Spyfall services locally (now using Docker Compose)
local-start-services:
	@echo "🎮 Starting Spyfall services via Docker Compose..."
	@cd local-setup && docker-compose up -d
	@echo "✅ Services started! Check status with: docker-compose ps"

# Stop local deployment
local-stop:
	@echo "🛑 Stopping local deployment..."
	@cd local-setup && docker-compose down
	@echo "✅ Local deployment stopped!"

# Build API server Docker container
# Usage: make docker-build-api
docker-build-api:
	@echo "🐳 Building API server Docker container..."
	@echo "Building production-ready container..."
	docker build \
		--build-arg BUILD_ENV=production \
		-f apps/server/Dockerfile \
		-t spyfall-api:latest \
		--target production \
		.
	@echo "✅ API server container built successfully!"
	@echo "🚀 To run the container with your domain:"
	@echo "   docker run -d \\"
	@echo "     --name spyfall-api \\"
	@echo "     -p 4000:4000 \\"
	@echo "     -e SERVER_PORT=4000 \\"
	@echo "     -e HOST=0.0.0.0 \\"
	@echo "     -e ALLOWED_ORIGIN=https://yourdomain.com \\"
	@echo "     -e WEB_ORIGIN=https://yourdomain.com \\"
	@echo "     spyfall-api:latest"
	@echo ""
	@echo "💡 Replace 'yourdomain.com' with your actual domain name when running the container."

# Build Web app Docker container
# Usage: make docker-build-web
docker-build-web:
	@echo "🐳 Building Web app Docker container..."
	@echo "Building production-ready container with minified assets..."
	docker build \
		--build-arg BUILD_ENV=production \
		-f apps/web/Dockerfile \
		-t spyfall-web:latest \
		--target production \
		.
	@echo "✅ Web app container built successfully!"
	@echo "🚀 To run the container with your configuration:"
	@echo "   docker run -d \\"
	@echo "     --name spyfall-web \\"
	@echo "     -p 80:80 \\"
	@echo "     -e NGINX_PORT=80 \\"
	@echo "     -e APP_DOMAIN=yourdomain.com \\"
	@echo "     -e API_HOST=api.yourdomain.com \\"
	@echo "     -e API_PORT=4000 \\"
	@echo "     spyfall-web:latest"
	@echo ""
	@echo "💡 Replace 'yourdomain.com' and 'api.yourdomain.com' with your actual domain names when running the container."

