# Makefile for BWR-Tools project
# Provides Unix-style commands for common tasks

.PHONY: help install dev test build deploy clean lint format check all

# Default target - show help
help:
	@echo "BWR-Tools Makefile Commands:"
	@echo ""
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Start development servers"
	@echo "  make test        - Run all tests"
	@echo "  make build       - Build the project"
	@echo "  make deploy      - Deploy (interactive)"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make lint        - Run linters"
	@echo "  make format      - Format code"
	@echo "  make check       - Run tests and linters"
	@echo "  make all         - Install, test, and build"

# Install all dependencies
install:
	@./scripts/install.sh

# Start development servers
dev:
	@./scripts/dev.sh

# Run with streamlit
dev-full:
	@./scripts/dev.sh --with-streamlit

# Run all tests
test:
	@./scripts/test.sh

# Build the project
build:
	@./scripts/build.sh

# Deploy interactively
deploy:
	@./scripts/deploy.sh

# Deploy specific components
deploy-python:
	@./scripts/deploy.sh --python

deploy-frontend:
	@./scripts/deploy.sh --frontend

deploy-all:
	@./scripts/deploy.sh --all

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf dist/ build/ *.egg-info
	@rm -rf frontend/.next frontend/out
	@rm -rf backend/__pycache__ backend/.pytest_cache
	@rm -rf src/**/__pycache__ src/**/.pytest_cache
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@echo "✓ Clean complete"

# Run linters
lint:
	@echo "Running Python linters..."
	@cd src && (ruff check . || flake8 . || echo "No Python linter found")
	@echo "Running frontend linters..."
	@cd frontend && npm run lint

# Format code
format:
	@echo "Formatting Python code..."
	@cd src && (ruff format . || black . || echo "No Python formatter found")
	@echo "Formatting frontend code..."
	@cd frontend && (npx prettier --write "src/**/*.{ts,tsx,js,jsx}" || echo "Prettier not configured")

# Run tests and linters
check: lint test

# Full pipeline: install, test, and build
all: install check build

# Development helpers
shell:
	@poetry shell || python -m venv venv && source venv/bin/activate

backend-only:
	@cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend-only:
	@cd frontend && npm run dev

streamlit-only:
	@streamlit run app.py

# Docker commands (if Docker support is added)
docker-build:
	@echo "Docker support not yet implemented"
	@echo "Run: ./scripts/create-docker-setup.sh to add Docker support"

# Python package management
publish-test:
	@./scripts/deploy.sh --python --dry-run

publish:
	@./scripts/deploy.sh --python

# Version management
version:
	@echo "Current version: $$(poetry version -s || grep version pyproject.toml | cut -d'"' -f2)"

version-patch:
	@poetry version patch

version-minor:
	@poetry version minor

version-major:
	@poetry version major