#!/bin/bash
# Setup Docker environment for BWR-Tools

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BWR-Tools Docker Setup ===${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not available!${NC}"
    echo "Please ensure Docker Desktop is properly installed"
    exit 1
fi

# Create .dockerignore file
echo -e "\n${BLUE}Creating .dockerignore file...${NC}"
cat > .dockerignore << 'EOF'
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/
.venv/
venv/
.poetry/

# Node
node_modules/
.next/
out/
npm-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Testing
.pytest_cache/
coverage/
.coverage

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# Documentation
docs/_build/
EOF

# Create docker directory for additional configs
mkdir -p docker

# Create docker-compose.override.yml for local development
echo -e "\n${BLUE}Creating docker-compose.override.yml for local development...${NC}"
cat > docker-compose.override.yml << 'EOF'
# Local development overrides
# This file is gitignored and for local customization

version: '3.8'

services:
  backend:
    environment:
      - DEBUG=true
      # Add your local environment variables here
      # - OPENAI_API_KEY=${OPENAI_API_KEY}
      # - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

  frontend:
    environment:
      - NODE_ENV=development
      # Add your local environment variables here

  # Uncomment to always run streamlit and redis
  # streamlit:
  #   profiles: []
  
  # redis:
  #   profiles: []
EOF

# Create .env.example file
echo -e "\n${BLUE}Creating .env.example file...${NC}"
cat > .env.example << 'EOF'
# Backend Environment Variables
PYTHONPATH=/app/src
DEBUG=true
SECRET_KEY=your-secret-key-here

# API Keys (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000

# Redis Configuration (if using)
REDIS_URL=redis://redis:6379/0

# Database (if needed in future)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
EOF

# Add Docker commands to package.json
echo -e "\n${BLUE}Adding Docker commands to automation...${NC}"

# Check Docker status
echo -e "\n${BLUE}Checking Docker status...${NC}"
docker version > /dev/null 2>&1 && echo -e "${GREEN}✓ Docker is running${NC}" || echo -e "${YELLOW}⚠ Docker daemon is not running. Please start Docker Desktop.${NC}"

# Summary
echo -e "\n${GREEN}✓ Docker setup complete!${NC}"
echo -e "${BLUE}Docker commands available:${NC}"
echo ""
echo "  ${YELLOW}Development:${NC}"
echo "    docker-compose up              # Start all services"
echo "    docker-compose up -d           # Start in background"
echo "    docker-compose logs -f         # View logs"
echo "    docker-compose down            # Stop all services"
echo ""
echo "  ${YELLOW}With full stack:${NC}"
echo "    docker-compose --profile full up  # Include Streamlit & Redis"
echo ""
echo "  ${YELLOW}Individual services:${NC}"
echo "    docker-compose up backend      # Backend only"
echo "    docker-compose up frontend     # Frontend only"
echo ""
echo "  ${YELLOW}Maintenance:${NC}"
echo "    docker-compose build          # Rebuild images"
echo "    docker-compose down -v        # Stop and remove volumes"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Copy .env.example to .env and add your API keys"
echo "2. Run: docker-compose up"
echo "3. Access services at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"