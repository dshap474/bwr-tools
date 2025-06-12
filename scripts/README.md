# BWR-Tools Scripts

This directory contains automation scripts for the BWR-Tools project.

## Available Scripts

### `install.sh`
Installs all dependencies for the project:
- Python dependencies via Poetry
- Backend requirements
- Frontend npm packages
- Development package in editable mode

### `dev.sh`
Starts all development servers:
- FastAPI backend on http://localhost:8000
- Next.js frontend on http://localhost:3000
- Optional: Streamlit app on http://localhost:8501 (with `--with-streamlit` flag)

### `test.sh`
Runs the complete test suite:
- Python unit tests
- Backend API tests
- Frontend tests and linting
- TypeScript type checking

### `build.sh`
Builds the project for distribution:
- Python wheel and source distribution
- Next.js production build
- Creates distribution package with deployment instructions

### `deploy.sh`
Interactive deployment script with options:
- `--python`: Deploy to PyPI
- `--frontend`: Deploy to Vercel
- `--backend`: Show backend deployment instructions
- `--all`: Deploy everything
- `--dry-run`: Preview what would be deployed

## Usage

All scripts should be run from the project root:

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Install dependencies
./scripts/install.sh

# Start development
./scripts/dev.sh

# Run tests
./scripts/test.sh

# Build project
./scripts/build.sh

# Deploy
./scripts/deploy.sh --all
```

## Alternative: Using Make

You can also use the Makefile for shorter commands:

```bash
make install
make dev
make test
make build
make deploy
```

## Alternative: Using npm

Or use npm scripts from the root package.json:

```bash
npm install
npm run dev
npm test
npm run build
npm run deploy
```

## Docker Support

For Docker-based development:

```bash
# Start all services
docker-compose up

# Start with full stack (including Streamlit and Redis)
docker-compose --profile full up

# Rebuild after changes
docker-compose build
```