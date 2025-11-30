.PHONY: help dev build test lint install clean preview

# Default target - show help
help:
	@echo "Automation Companion - Available Commands:"
	@echo ""
	@echo "  make dev        - Run the web app in development mode"
	@echo "  make build      - Build all packages for production"
	@echo "  make test       - Run tests across all packages"
	@echo "  make lint       - Lint TypeScript files"
	@echo "  make install    - Install all dependencies"
	@echo "  make clean      - Remove node_modules and rebuild"
	@echo "  make preview    - Preview production build locally"
	@echo ""

# Run the web app in development mode
dev:
	npm run dev

# Build all packages
build:
	npm run build

# Run tests
test:
	npm run test

# Lint TypeScript files
lint:
	npm run lint

# Install dependencies
install:
	npm install

# Clean node_modules and reinstall
clean:
	rm -rf node_modules packages/*/node_modules
	npm install

# Preview production build
preview:
	npm run preview --workspace=packages/web
