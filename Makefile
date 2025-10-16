.PHONY: test-server test-web test-web-chrome test install-browsers local-deploy local-stop

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

# Local deployment - sets up Nginx Proxy Manager and starts services
# Usage: make local-deploy DOMAIN=your-domain.com
local-deploy:
	@if [ -z "$(DOMAIN)" ]; then \
		echo "Error: DOMAIN is required. Usage: make local-deploy DOMAIN=your-domain.com"; \
		exit 1; \
	fi
	@echo "🏠 Setting up local deployment for domain: $(DOMAIN)"
	@echo "📋 Creating Nginx Proxy Manager configuration..."
	@mkdir -p local-setup/data local-setup/letsencrypt
	@echo "version: '3.8'" > local-setup/docker-compose.yml
	@echo "services:" >> local-setup/docker-compose.yml
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
	@echo "🚀 Starting Nginx Proxy Manager..."
	@cd local-setup && docker-compose up -d
	@echo "⏳ Waiting for Nginx Proxy Manager to start..."
	@sleep 10
	@echo "🌐 Nginx Proxy Manager is running!"
	@echo ""
	@echo "📝 Next steps:"
	@echo "1. Open http://localhost:81 in your browser"
	@echo "2. Login with: admin@example.com / changeme"
	@echo "3. Create proxy hosts:"
	@echo "   - web.$(DOMAIN) → http://host.docker.internal:5173"
	@echo "   - api.$(DOMAIN) → http://host.docker.internal:5000"
	@echo "4. Generate SSL certificates for both hosts"
	@echo "5. Run: make local-start-services"
	@echo ""
	@echo "🎮 Your game will be available at:"
	@echo "   https://web.$(DOMAIN)"
	@echo "   https://api.$(DOMAIN)"

# Start the Spyfall services locally
local-start-services:
	@echo "🎮 Starting Spyfall services..."
	@echo "📡 Starting API server on port 5000..."
	@pnpm -C apps/server start &
	@echo "🌐 Starting web server on port 5173..."
	@pnpm -C apps/web dev &
	@echo ""
	@echo "✅ Services started! Check:"
	@echo "   - API: http://localhost:5000"
	@echo "   - Web: http://localhost:5173"
	@echo "   - NPM Admin: http://localhost:81"

# Stop local deployment
local-stop:
	@echo "🛑 Stopping local deployment..."
	@cd local-setup && docker-compose down
	@pkill -f "pnpm.*apps/server" || true
	@pkill -f "pnpm.*apps/web" || true
	@echo "✅ Local deployment stopped!"

