#!/bin/bash
# Deploy script for BWR-Tools project

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BWR-Tools Deployment Script ===${NC}"

# Check if we're in the project root
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    echo "Please run this script from the bwr-tools root directory"
    exit 1
fi

# Parse command line arguments
DEPLOY_PYTHON=false
DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --python)
            DEPLOY_PYTHON=true
            shift
            ;;
        --frontend)
            DEPLOY_FRONTEND=true
            shift
            ;;
        --backend)
            DEPLOY_BACKEND=true
            shift
            ;;
        --all)
            DEPLOY_PYTHON=true
            DEPLOY_FRONTEND=true
            DEPLOY_BACKEND=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--python] [--frontend] [--backend] [--all] [--dry-run]"
            exit 1
            ;;
    esac
done

# If no options specified, show usage
if [ "$DEPLOY_PYTHON" = false ] && [ "$DEPLOY_FRONTEND" = false ] && [ "$DEPLOY_BACKEND" = false ]; then
    echo "Usage: $0 [--python] [--frontend] [--backend] [--all] [--dry-run]"
    echo ""
    echo "Options:"
    echo "  --python    Deploy Python package to PyPI"
    echo "  --frontend  Deploy frontend to Vercel"
    echo "  --backend   Deploy backend (show instructions)"
    echo "  --all       Deploy everything"
    echo "  --dry-run   Show what would be deployed without actually deploying"
    exit 0
fi

# Run tests first
echo -e "\n${BLUE}Running tests before deployment...${NC}"
./scripts/test.sh || {
    echo -e "${RED}Tests failed! Aborting deployment.${NC}"
    exit 1
}

# Build the project
echo -e "\n${BLUE}Building project...${NC}"
./scripts/build.sh

# Deploy Python package to PyPI
if [ "$DEPLOY_PYTHON" = true ]; then
    echo -e "\n${BLUE}Deploying Python package to PyPI...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would deploy:${NC}"
        ls -lh dist/*.whl dist/*.tar.gz
    else
        if command -v poetry &> /dev/null; then
            echo "Using Poetry to publish..."
            poetry publish
        elif command -v twine &> /dev/null; then
            echo "Using twine to upload..."
            twine upload dist/*
        else
            echo -e "${RED}Neither Poetry nor twine found. Cannot deploy to PyPI.${NC}"
            echo "Install twine: pip install twine"
            exit 1
        fi
    fi
fi

# Deploy frontend to Vercel
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo -e "\n${BLUE}Deploying frontend to Vercel...${NC}"
    
    cd frontend
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would deploy frontend from: $(pwd)${NC}"
        echo "Would run: vercel --prod"
    else
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            echo -e "${RED}Vercel CLI not found.${NC}"
            echo "Install Vercel CLI: npm i -g vercel"
            echo ""
            echo "Alternative: Deploy via GitHub integration"
            echo "1. Push to GitHub"
            echo "2. Import project at vercel.com"
            echo "3. Set root directory to 'frontend'"
            exit 1
        fi
    fi
    cd ..
fi

# Deploy backend instructions
if [ "$DEPLOY_BACKEND" = true ]; then
    echo -e "\n${BLUE}Backend Deployment Instructions${NC}"
    echo -e "${YELLOW}The backend can be deployed to various platforms:${NC}"
    echo ""
    echo "1. ${BLUE}Railway/Render/Fly.io:${NC}"
    echo "   - Connect your GitHub repo"
    echo "   - Set root directory to 'backend'"
    echo "   - Set start command: uvicorn main:app --host 0.0.0.0 --port \$PORT"
    echo ""
    echo "2. ${BLUE}Docker:${NC}"
    echo "   - Build: docker build -t bwr-backend ./backend"
    echo "   - Run: docker run -p 8000:8000 bwr-backend"
    echo ""
    echo "3. ${BLUE}VPS/EC2:${NC}"
    echo "   - Copy backend/ directory to server"
    echo "   - Install deps: pip install -r requirements.txt"
    echo "   - Run with systemd or supervisor"
    echo ""
    if [ "$DRY_RUN" = false ]; then
        echo -e "${YELLOW}Create Dockerfile for backend? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            ./scripts/create-backend-dockerfile.sh
        fi
    fi
fi

# Summary
echo -e "\n${GREEN}✓ Deployment complete!${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This was a dry run. No actual deployment occurred.${NC}"
fi