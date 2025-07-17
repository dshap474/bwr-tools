# BWR Tools

TypeScript-based plotting tools with exact BWR (Blockworks Research) visual standards.

## Overview

BWR Tools is a ground-up TypeScript implementation that produces plots matching the exact visual output of the Python bwr_plots library. Built with modern web technologies for client-side data processing and visualization.

## Architecture

This is a monorepo managed with pnpm and Turborepo:

```
bwr-tools/
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── core/               # Core plotting engine
│   ├── charts/             # React chart components
│   ├── config/             # BWR configuration and themes
│   ├── data/               # Data processing utilities
│   ├── ui/                 # Shared UI components
│   ├── plotly-wrapper/     # Type-safe Plotly.js wrapper
│   └── types/              # Shared TypeScript types
└── tools/
    ├── dev-server/         # Python comparison server
    └── visual-tests/       # Visual regression testing
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Python 3.10+ (for comparison server)
- bwr-plots repository (for visual comparison)

### Installation

```bash
# Install dependencies
pnpm install

# Set up Python comparison server
cd tools/dev-server
pip install -r requirements.txt
```

### Development

```bash
# Start all development servers
pnpm dev

# Run specific package
pnpm --filter @bwr-tools/core dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run visual regression tests
pnpm test:visual
```

## Features

- **Exact Visual Parity**: Produces plots identical to Python bwr_plots
- **Client-Side Processing**: All data processing happens in the browser
- **Type Safety**: Full TypeScript with strict mode
- **Performance**: Web Workers for heavy computation
- **Modern Stack**: Next.js 15, React 18, TypeScript 5

## Chart Types

- Scatter/Line plots with smoothing
- Bar charts (vertical)
- Horizontal bar charts
- Multi-bar (grouped) charts
- Stacked bar charts
- Metric share area plots
- Tables

## Development Workflow

1. **Visual Comparison**: Development server shows side-by-side Python/TypeScript outputs
2. **Type Safety**: Strict TypeScript configuration catches errors early
3. **Testing**: Comprehensive unit and visual regression tests
4. **Performance**: Built-in profiling and optimization tools

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT