#!/bin/bash
# Start all development servers for BWR-Tools

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BWR-Tools Development Server ===${NC}"

# Check if we're in the project root
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    echo "Please run this script from the bwr-tools root directory"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null || true
    wait
    echo -e "${GREEN}✓ All services stopped${NC}"
}

trap cleanup EXIT INT TERM

# Check if backend dependencies are installed
if [ ! -d "backend/__pycache__" ] && [ ! -f "backend/.installed" ]; then
    echo -e "${YELLOW}Backend dependencies not installed. Running install script...${NC}"
    ./scripts/install.sh
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies not installed. Running install script...${NC}"
    ./scripts/install.sh
fi

# Start backend server
echo -e "\n${BLUE}Starting FastAPI backend on http://localhost:8000${NC}"
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 2

# Start frontend server
echo -e "\n${BLUE}Starting Next.js frontend on http://localhost:3000${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Optional: Start Streamlit app if needed
if [ "$1" == "--with-streamlit" ]; then
    echo -e "\n${BLUE}Starting Streamlit app on http://localhost:8501${NC}"
    streamlit run app.py &
    STREAMLIT_PID=$!
fi

echo -e "\n${GREEN}✓ All services started!${NC}"
echo -e "${BLUE}Services running at:${NC}"
echo "  Backend API:  http://localhost:8000"
echo "  Frontend:     http://localhost:3000"
if [ "$1" == "--with-streamlit" ]; then
    echo "  Streamlit:    http://localhost:8501"
fi
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all background processes
wait