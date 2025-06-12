#!/bin/bash
# Install all dependencies for BWR-Tools project

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BWR-Tools Installation Script ===${NC}"

# Check if we're in the project root
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    echo "Please run this script from the bwr-tools root directory"
    exit 1
fi

# Install Python dependencies
echo -e "\n${BLUE}Installing Python dependencies...${NC}"
if command -v poetry &> /dev/null; then
    echo "Using Poetry to install Python dependencies..."
    poetry install
else
    echo -e "${RED}Poetry not found. Please install Poetry first:${NC}"
    echo "curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Install backend dependencies
echo -e "\n${BLUE}Installing backend dependencies...${NC}"
cd backend
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi
cd ..

# Install frontend dependencies
echo -e "\n${BLUE}Installing frontend dependencies...${NC}"
cd frontend
if [ -f "package.json" ]; then
    npm install
else
    echo -e "${RED}No package.json found in frontend directory${NC}"
fi
cd ..

# Install development package in editable mode
echo -e "\n${BLUE}Installing bwr-tools in development mode...${NC}"
pip install -e .

echo -e "\n${GREEN}✓ Installation complete!${NC}"
echo -e "${BLUE}You can now run:${NC}"
echo "  ./scripts/dev.sh     - Start development servers"
echo "  ./scripts/test.sh    - Run tests"
echo "  ./scripts/build.sh   - Build the project"