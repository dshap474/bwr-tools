# Implementation Guide

## Getting Started with Development

### Prerequisites Setup

1. **Install Dependencies**
```bash
# Install pnpm globally
npm install -g pnpm@8.15.1

# Clone and setup
cd bwr-tools
pnpm install
```

2. **Python Environment** (for comparison)
```bash
cd tools/dev-server
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

3. **Verify bwr-plots Access**
```bash
# The Python server expects bwr-plots at ../../../bwr-plots
# Ensure this path is correct or update server.py
```

### Development Workflow

#### Start All Services
```bash
# Terminal 1: Python comparison server
cd tools/dev-server && python server.py

# Terminal 2: Development servers
pnpm dev
```

#### Working on Specific Package
```bash
# Build single package
pnpm --filter @bwr-tools/core build

# Test single package
pnpm --filter @bwr-tools/core test

# Watch mode for package
pnpm --filter @bwr-tools/core dev
```

## Implementation Order

### Step 1: Config Package
Start with exact BWR configuration values:

```typescript
// packages/config/src/theme.ts
export const BWR_THEME = {
  colors: {
    background: '#1A1A1A',
    primary: '#5637cd',
    // ... all colors from Python
  },
  fonts: {
    family: 'Maison Neue, Inter, sans-serif',
    sizes: {
      title: 51.6,  // Exact values!
      subtitle: 21.6,
      // ...
    }
  },
  // ... complete config
} as const;
```

### Step 2: Plotly Wrapper
Create type-safe wrapper around Plotly:

```typescript
// packages/plotly-wrapper/src/index.ts
import Plotly from 'plotly.js-dist-min';

export class BWRPlotly {
  static newPlot(
    element: HTMLElement,
    data: Plotly.Data[],
    layout: Partial<Plotly.Layout>,
    config?: Partial<Plotly.Config>
  ): Promise<Plotly.PlotlyHTMLElement> {
    // Apply BWR defaults
    const bwrLayout = this.applyBWRDefaults(layout);
    return Plotly.newPlot(element, data, bwrLayout, config);
  }
}
```

### Step 3: Core Engine
Implement plot generation logic:

```typescript
// packages/core/src/engine.ts
export class PlotEngine {
  constructor(private config: BWRConfig) {}
  
  generateScatterPlot(data: DataFrame): PlotlyConfig {
    // Transform data
    const traces = this.buildTraces(data);
    const layout = this.buildLayout();
    
    // Ensure pixel-perfect match
    return this.finalizeConfig(traces, layout);
  }
}
```

### Step 4: Data Package
DataFrame implementation for data processing:

```typescript
// packages/data/src/dataframe.ts
export class DataFrame {
  constructor(private data: Record<string, unknown[]>) {}
  
  // Pandas-like API
  groupBy(columns: string[]): GroupedDataFrame {}
  resample(rule: string): DataFrame {}
  fillna(value: unknown): DataFrame {}
}
```

### Step 5: Chart Components
React components for each chart type:

```typescript
// packages/charts/src/ScatterPlot.tsx
export function ScatterPlot({ data, config }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const engine = new PlotEngine(config);
    const plotConfig = engine.generateScatterPlot(data);
    
    BWRPlotly.newPlot(
      plotRef.current!,
      plotConfig.data,
      plotConfig.layout
    );
  }, [data, config]);
  
  return <div ref={plotRef} />;
}
```

## Testing Strategy

### Visual Regression Testing

1. **Create Test Cases**
```typescript
// tools/visual-tests/cases/scatter.ts
export const scatterTestCases = [
  {
    name: 'basic-scatter',
    data: generateTestData(),
    config: { title: 'Test Scatter' }
  },
  // ... more cases
];
```

2. **Run Comparisons**
```typescript
// tools/visual-tests/run.ts
for (const testCase of testCases) {
  const tsImage = await generateTypeScript(testCase);
  const pyImage = await generatePython(testCase);
  
  const diff = pixelmatch(tsImage, pyImage);
  expect(diff).toBeLessThan(0.01); // 99.99% match
}
```

### Unit Testing
```typescript
// packages/core/src/__tests__/engine.test.ts
describe('PlotEngine', () => {
  it('generates correct Plotly config', () => {
    const engine = new PlotEngine(BWR_CONFIG);
    const result = engine.generateScatterPlot(testData);
    
    expect(result.layout.font.family).toBe('Maison Neue, Inter, sans-serif');
    expect(result.layout.font.size).toBe(51.6);
  });
});
```

## Common Implementation Patterns

### Exact Value Matching
```typescript
// Always use exact Python values
const TITLE_SIZE = 51.6;  // NOT 52
const MARGIN_TOP = 108;   // NOT 110
```

### Data Transformation
```typescript
// Match Python's data processing
function roundAndAlignDates(dates: Date[]): Date[] {
  // Implementation must match Python exactly
  return dates.map(date => {
    // Round to nearest hour/day/month as Python does
  });
}
```

### Color Handling
```typescript
// Use exact hex values
const colors = ['#5637cd', '#779BE7', ...];
// Never use rgb() or color transforms
```

## Debugging Tools

### Visual Comparison Overlay
```typescript
// components/DevOverlay.tsx
export function DevOverlay({ plotConfig }) {
  const { comparison } = useVisualComparison(plotConfig);
  
  if (!comparison) return null;
  
  return (
    <div className="fixed bottom-4 right-4">
      {comparison.match ? '✅ Matches Python' : `❌ ${comparison.diff}% different`}
    </div>
  );
}
```

### Plotly Config Inspector
```typescript
// Log exact Plotly configuration
console.log('TS Config:', JSON.stringify(plotlyConfig, null, 2));
// Compare with Python output
```

## Performance Optimization

### Large Datasets
```typescript
// Use WebGL for > 10k points
if (data.length > 10000) {
  trace.type = 'scattergl';
}

// Implement data decimation
const decimated = decimateData(data, targetPoints);
```

### Memory Management
```typescript
// Use typed arrays
const xData = new Float64Array(data.x);
const yData = new Float64Array(data.y);

// Clean up after rendering
plotly.purge(element);
```

## Deployment Checklist

- [ ] All visual tests passing
- [ ] Performance benchmarks met
- [ ] Bundle size < 500KB
- [ ] Browser compatibility verified
- [ ] Documentation complete
- [ ] Migration guide ready