.PHONY: test-server test-web test-web-chrome test

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

