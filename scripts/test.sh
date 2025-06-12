#!/bin/bash
# Run all tests for BWR-Tools project

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BWR-Tools Test Suite ===${NC}"

# Check if we're in the project root
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    echo "Please run this script from the bwr-tools root directory"
    exit 1
fi

# Track test results
TESTS_PASSED=true

# Run Python tests
echo -e "\n${BLUE}Running Python tests...${NC}"
if command -v poetry &> /dev/null; then
    poetry run pytest -v || TESTS_PASSED=false
else
    pytest -v || TESTS_PASSED=false
fi

# Run backend tests if they exist
if [ -d "backend/tests" ] || [ -f "backend/test_*.py" ]; then
    echo -e "\n${BLUE}Running backend tests...${NC}"
    cd backend
    pytest -v || TESTS_PASSED=false
    cd ..
fi

# Run frontend tests
echo -e "\n${BLUE}Running frontend tests...${NC}"
cd frontend
if [ -f "package.json" ]; then
    # Check if test script exists in package.json
    if grep -q '"test"' package.json; then
        npm test || TESTS_PASSED=false
    else
        echo -e "${YELLOW}No test script found in frontend package.json${NC}"
    fi
fi
cd ..

# Run linting
echo -e "\n${BLUE}Running linters...${NC}"

# Python linting (if configured)
if command -v ruff &> /dev/null; then
    echo "Running ruff..."
    ruff check . || TESTS_PASSED=false
elif command -v flake8 &> /dev/null; then
    echo "Running flake8..."
    flake8 . || TESTS_PASSED=false
fi

# Frontend linting
echo -e "\n${BLUE}Running frontend linting...${NC}"
cd frontend
npm run lint || TESTS_PASSED=false
cd ..

# Type checking for frontend
echo -e "\n${BLUE}Running TypeScript type checking...${NC}"
cd frontend
npx tsc --noEmit || TESTS_PASSED=false
cd ..

# Summary
echo -e "\n${BLUE}=== Test Summary ===${NC}"
if [ "$TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi