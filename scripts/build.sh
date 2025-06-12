#!/bin/bash
# Build script for BWR-Tools project

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BWR-Tools Build Script ===${NC}"

# Check if we're in the project root
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    echo "Please run this script from the bwr-tools root directory"
    exit 1
fi

# Clean previous builds
echo -e "\n${BLUE}Cleaning previous builds...${NC}"
rm -rf dist/ build/ *.egg-info frontend/.next frontend/out

# Build Python package
echo -e "\n${BLUE}Building Python package...${NC}"
if command -v poetry &> /dev/null; then
    poetry build
else
    echo -e "${RED}Poetry not found. Cannot build Python package.${NC}"
    echo "Install Poetry: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Build frontend
echo -e "\n${BLUE}Building Next.js frontend...${NC}"
cd frontend
npm run build
cd ..

# Create distribution directory
echo -e "\n${BLUE}Creating distribution package...${NC}"
mkdir -p dist/bwr-tools-dist

# Copy Python wheel and tarball
cp dist/*.whl dist/bwr-tools-dist/
cp dist/*.tar.gz dist/bwr-tools-dist/

# Copy frontend build
cp -r frontend/.next dist/bwr-tools-dist/frontend-build

# Create standalone frontend export if needed
if [ "$1" == "--export-frontend" ]; then
    echo -e "\n${BLUE}Creating static frontend export...${NC}"
    cd frontend
    # Note: Next.js 13+ uses 'output: export' in next.config.js
    # You might need to configure this in next.config.ts
    npm run build
    if [ -d "out" ]; then
        cp -r out ../dist/bwr-tools-dist/frontend-static
    fi
    cd ..
fi

# Create deployment instructions
cat > dist/bwr-tools-dist/DEPLOYMENT.md << EOF
# BWR-Tools Deployment Instructions

## Python Package
- Install from wheel: \`pip install bwr_tools-*.whl\`
- Or from PyPI: \`pip install bwr-plots\`

## Frontend Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Set root directory to \`frontend\`
4. Deploy

### Manual Deployment
1. Copy \`frontend-build\` to your server
2. Run with: \`npm start\` (requires Node.js)

### Static Hosting
If built with \`--export-frontend\`:
1. Copy \`frontend-static\` contents to your web server
2. Serve as static files

## Backend Deployment
1. Install requirements: \`pip install -r backend/requirements.txt\`
2. Run with: \`uvicorn backend.main:app --host 0.0.0.0 --port 8000\`
EOF

# Summary
echo -e "\n${GREEN}✓ Build complete!${NC}"
echo -e "${BLUE}Build artifacts:${NC}"
echo "  Python package: dist/*.whl"
echo "  Frontend build: dist/bwr-tools-dist/frontend-build/"
echo "  Full distribution: dist/bwr-tools-dist/"

# Show package info
echo -e "\n${BLUE}Package info:${NC}"
ls -lh dist/*.whl dist/*.tar.gz 2>/dev/null || echo "No Python packages built"