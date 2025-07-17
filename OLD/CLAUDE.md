# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the BWR Tools codebase.

## Project Overview

BWR Tools is a TypeScript-only plotting application that produces EXACTLY the same visual output as the Python bwr_plots library. This is a ground-up redesign, not a migration.

### Critical Requirements

1. **Pixel-Perfect Accuracy**: Every plot must match the Python output exactly
2. **Client-Side Only**: No backend dependencies for plotting
3. **Type Safety**: Strict TypeScript throughout
4. **Performance**: Web Workers for data processing

## Architecture

```
bwr-tools/
├── app/                    # Next.js 15 app (App Router)
│   ├── layout.tsx         # Root layout with shared navigation
│   ├── page.tsx           # Landing page
│   └── (tools)/           # Tool routes
│       ├── plots/         # BWR Plots tool
│       └── defillama/     # DeFiLlama tool
├── packages/
│   ├── shared/
│   │   ├── ui/            # Shared UI components
│   │   ├── config/        # Shared configuration
│   │   └── types/         # Shared types
│   └── tools/
│       ├── plots/
│       │   ├── core/      # Plot engine (exact BWR config)
│       │   ├── charts/    # React components
│       │   ├── data/      # Data processing
│       │   └── plotly-wrapper/  # Type-safe Plotly
│       └── defillama/
│           └── [future packages]
└── tools/
    ├── dev-server/        # Python comparison
    └── visual-tests/      # Regression testing
```

## Development Workflow

### Always Run Comparison Server
```bash
# Terminal 1: Start Python server
cd tools/dev-server && python server.py

# Terminal 2: Start Next.js
pnpm dev
```

### Testing Visual Accuracy
1. Generate plot in TypeScript
2. Compare with Python output via dev server
3. Use pixelmatch for pixel-level comparison
4. Fail if difference > 0.01%

## Exact Configuration Values

These values MUST match Python exactly:

```typescript
// Colors
background: '#1A1A1A'
primary: '#5637cd'
text: '#ededed'
subtitle: '#adb0b5'

// Font sizes (exact decimal values)
title: 51.6
subtitle: 21.6
axis: 16.8
tick: 21.6
legend: 24.0

// Layout
width: 1920
height: 1080
margins: { l: 120, r: 70, t: 150, b: 120 }
```

## Key Implementation Details

### Data Processing
- Use typed arrays for performance
- Implement pandas-like operations in TypeScript
- Date alignment must match Python's round_and_align_dates()
- Scaling with K/M/B suffixes via _get_scale_and_suffix()

### Chart Types Priority
1. Scatter/Line (most complex, dual axes)
2. Bar (vertical)
3. Horizontal Bar
4. Multi-bar (grouped)
5. Stacked Bar
6. Metric Share Area
7. Table

### Visual Elements
- Background image: brand-assets/bg_black.png
- Watermarks: BWR/BWA logos at specific positions
- Grid colors: rgb(38, 38, 38)
- Hover mode: "x unified"

## Common Patterns

### Plot Generation Flow
```typescript
1. Validate data structure
2. Apply transformations (scale, smooth, align)
3. Build Plotly config with exact BWR theme
4. Render with pixel-perfect settings
5. Compare with Python in dev mode
```

### Data Validation
- Auto-detect date columns
- Validate numeric data
- Handle missing values (forward fill)
- Ensure column names are strings

## Testing Requirements

### Unit Tests
- Data transformations
- Configuration merging
- Type validations

### Visual Tests
- Every chart type
- Multiple data scenarios
- Export formats (PNG, SVG, PDF)
- Exact pixel matching

## Performance Targets

- < 100ms for plots under 10k points
- < 1s for plots under 100k points
- Use WebGL for > 10k points
- Virtual rendering for large datasets

## Common Pitfalls

1. **Font Loading**: Ensure Maison Neue loads before rendering
2. **Number Precision**: Use exact decimal values (51.6, not 52)
3. **Color Format**: Always use hex values, not rgb()
4. **Date Handling**: Match Python's timezone behavior
5. **Plotly Version**: Features must be available in plotly.js-dist-min

## Debugging

### Visual Mismatch
1. Check exact config values
2. Verify font loading
3. Compare Plotly JSON output
4. Use visual diff overlay

### Performance Issues
1. Profile with Chrome DevTools
2. Check data size thresholds
3. Verify Web Worker usage
4. Monitor memory usage

## Code Style

- Prefer composition over inheritance
- Use const assertions for config objects
- Explicit types, no `any`
- Descriptive variable names
- Comment complex algorithms

## Resources

- Python source: `../bwr-plots/src/bwr_plots/`
- Test data: `../bwr-plots/data/test_data/`
- Brand assets: `../bwr-plots/brand-assets/`
- Python API docs: `../bwr-plots/backend/README_PLOTS.md`