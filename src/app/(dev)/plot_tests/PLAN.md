# BWR Plots Port Consolidation Plan

## Current Problem Analysis

### Issue 1: React Infinite Loop
The error `Maximum update depth exceeded` in PlotlyRenderer indicates a state update loop in the React component. This happens when:
- `useEffect` triggers state updates without proper dependencies
- State changes cause re-renders that trigger the same useEffect again

### Issue 2: Scattered Chart Implementation
Currently, chart functionality is distributed across multiple locations:
- `@src/components/charts/` - Individual chart components and base classes
- `@src/features/plots/` - Plot-specific UI features and hooks  
- `@src/lib/plotly-wrapper/` - Plotly utilities and configuration
- `@tests/bwr-plots-test/` - Test-specific chart generation

### Issue 3: Visual Differences
The generated charts don't match the Python reference because:
- Different styling/configuration approach
- Missing exact replication of Python BWRPlots class structure
- Inconsistent data processing pipeline

## Solution: Single Location Consolidation

### Target Architecture
Create a SINGLE, self-contained BWR plotting system at:
```
@src/lib/bwr-plots/
├── index.ts                 # Main BWRPlots class (Python port)
├── charts/                  # Individual chart implementations
│   ├── scatter.ts          
│   ├── stacked-bar.ts      
│   ├── metric-share-area.ts
│   ├── bar.ts              
│   ├── horizontal-bar.ts   
│   ├── multi-bar.ts        
│   └── table.ts            
├── config/                  # Configuration system
│   ├── default-config.ts   
│   └── types.ts            
├── utils/                   # Utilities and helpers
│   ├── data-processing.ts  
│   ├── plotly-helpers.ts   
│   └── export.ts           
└── types.ts                # TypeScript definitions
```

## Detailed Implementation Plan

### Phase 1: Analyze Python Reference Implementation

#### 1.1 Core BWRPlots Class Structure (`reference/bwr-plots/src/bwr_plots/core.py`)
```python
class BWRPlots:
    def __init__(self, config=None):
        # Initialize with config merging
    
    def scatter_plot(self, data, **kwargs):
        # Scatter plot implementation
    
    def stacked_bar_chart(self, data, **kwargs):
        # Stacked bar implementation
    
    def metric_share_area_plot(self, data, **kwargs):
        # Area chart implementation
    
    # ... other chart methods
```

**Key Insights:**
- Single class with all chart methods
- Config-driven approach with defaults
- Consistent method signatures
- Built-in data validation and processing

#### 1.2 Configuration System (`reference/bwr-plots/src/bwr_plots/config.py`)
```python
DEFAULT_BWR_CONFIG = {
    "general": {"width": 1920, "height": 1080, ...},
    "colors": {"background_color": "#000", ...},
    "fonts": {"normal_family": "...", ...},
    "watermark": {"default_use": True, ...},
    # ... more config sections
}
```

**Key Insights:**
- Hierarchical configuration structure
- Default values with override capability
- Watermark and branding integration
- Responsive sizing options

#### 1.3 Chart Implementations (`reference/bwr-plots/src/bwr_plots/charts/`)
Each chart file contains:
- Data validation and preprocessing
- Plotly figure construction
- BWR-specific styling application
- Export and rendering logic

### Phase 2: Create Consolidated BWR Plots System

#### 2.1 Main BWRPlots Class (`@src/lib/bwr-plots/index.ts`)
```typescript
export class BWRPlots {
  private config: BWRConfig;
  
  constructor(config?: Partial<BWRConfig>) {
    this.config = mergeConfig(DEFAULT_BWR_CONFIG, config);
  }
  
  // Exact method signatures from Python
  scatter_plot(args: ScatterPlotArgs): BWRPlotSpec {
    return new ScatterChart(args, this.config).generate();
  }
  
  stacked_bar_chart(args: StackedBarArgs): BWRPlotSpec {
    return new StackedBarChart(args, this.config).generate();
  }
  
  metric_share_area_plot(args: AreaPlotArgs): BWRPlotSpec {
    return new MetricShareAreaChart(args, this.config).generate();
  }
  
  // ... other methods matching Python exactly
}
```

#### 2.2 Individual Chart Classes (`@src/lib/bwr-plots/charts/`)
Each chart class follows the same pattern:
```typescript
export class StackedBarChart {
  private data: DataFrame;
  private config: BWRConfig;
  private options: StackedBarOptions;
  
  constructor(args: StackedBarArgs, config: BWRConfig) {
    this.data = this.processData(args.data);
    this.config = config;
    this.options = this.parseOptions(args);
  }
  
  generate(): BWRPlotSpec {
    const traces = this.createTraces();
    const layout = this.createLayout();
    return { data: traces, layout, config: this.getPlotlyConfig() };
  }
  
  private processData(data: any): DataFrame {
    // Data validation and transformation
    // EXACTLY match Python data processing
  }
  
  private createTraces(): any[] {
    // Generate Plotly traces
    // EXACTLY match Python trace generation
  }
  
  private createLayout(): any {
    // Generate Plotly layout
    // EXACTLY match Python layout generation
  }
}
```

#### 2.3 Configuration System (`@src/lib/bwr-plots/config/`)
```typescript
// default-config.ts
export const DEFAULT_BWR_CONFIG: BWRConfig = {
  general: {
    width: 1920,
    height: 1080,
    template: 'plotly_white',
    background_image_path: './brand-assets/bg_black.png',
  },
  colors: {
    background_color: '#000000',
    primary_color: '#5637cd',
    // ... exact colors from Python
  },
  // ... complete config matching Python
};

// types.ts
export interface BWRConfig {
  general: GeneralConfig;
  colors: ColorConfig;
  fonts: FontConfig;
  watermark: WatermarkConfig;
  // ... complete type definitions
}
```

### Phase 3: Data Processing Pipeline

#### 3.1 DataFrame Implementation (`@src/lib/bwr-plots/utils/data-processing.ts`)
```typescript
export class DataFrame {
  // Complete DataFrame implementation matching Python pandas functionality
  // Used by the Python reference implementation
  
  constructor(data: any) {
    // Initialize with data validation
  }
  
  groupby(column: string): GroupBy {
    // Group by functionality for monthly aggregation
  }
  
  resample(freq: string): DataFrame {
    // Time series resampling
  }
  
  // ... other pandas-like methods used by Python implementation
}
```

#### 3.2 Data Processing Functions
```typescript
export function processDataForStackedBar(
  data: any,
  options: ProcessingOptions
): DataFrame {
  // EXACTLY replicate Python data processing pipeline:
  // 1. Load CSV with proper parsing
  // 2. Group by month (YYYY-MM format)
  // 3. Sum values within each month
  // 4. Create proper index and column structure
}

export function groupDataByMonth(df: DataFrame): DataFrame {
  // Monthly grouping logic EXACTLY matching Python implementation
}
```

### Phase 4: Fix React Integration

#### 4.1 Fix PlotlyRenderer Infinite Loop
```typescript
// @src/lib/bwr-plots/react/PlotlyRenderer.tsx
export function PlotlyRenderer({ spec }: { spec: BWRPlotSpec }) {
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);
  
  // Fix: Properly memoize spec to prevent infinite re-renders
  const memoizedSpec = useMemo(() => spec, [JSON.stringify(spec)]);
  
  useEffect(() => {
    let mounted = true;
    
    const renderChart = async () => {
      if (!plotRef.current || !plotlyLoaded) return;
      
      try {
        const Plotly = await import('plotly.js-dist-min');
        await Plotly.newPlot(
          plotRef.current,
          memoizedSpec.data,
          memoizedSpec.layout,
          memoizedSpec.config
        );
      } catch (error) {
        console.error('Chart rendering error:', error);
      }
    };
    
    if (mounted) {
      renderChart();
    }
    
    return () => {
      mounted = false;
    };
  }, [memoizedSpec, plotlyLoaded]); // Proper dependencies
  
  // ... rest of component
}
```

#### 4.2 Simple Integration Component
```typescript
// @src/lib/bwr-plots/react/BWRChart.tsx
interface BWRChartProps {
  chartType: 'stacked_bar_chart' | 'scatter_plot' | 'metric_share_area_plot';
  data: any;
  options?: any;
  config?: Partial<BWRConfig>;
}

export function BWRChart({ chartType, data, options, config }: BWRChartProps) {
  const [spec, setSpec] = useState<BWRPlotSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const plotter = new BWRPlots(config);
      const result = plotter[chartType]({ data, ...options });
      setSpec(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chart generation failed');
      setSpec(null);
    }
  }, [chartType, data, options, config]);
  
  if (error) {
    return <div className="error">Error: {error}</div>;
  }
  
  if (!spec) {
    return <div className="loading">Loading chart...</div>;
  }
  
  return <PlotlyRenderer spec={spec} />;
}
```

### Phase 5: Integration Points

#### 5.1 Update Plot Tests Page
```typescript
// @src/app/(dev)/plot_tests/page.tsx
import { BWRChart } from '@/lib/bwr-plots/react/BWRChart';

export default function PlotTestsPage() {
  // ... data loading logic
  
  return (
    <div>
      <BWRChart
        chartType="stacked_bar_chart"
        data={csvData}
        options={{
          title: 'Base: Network REV',
          subtitle: 'In 2024 Base generated $88.9M in REV...',
          source: 'Uploaded Data',
          // ... exact options from Python reference
        }}
        config={{
          general: { width: 1920, height: 1080 },
          // ... exact config from Python reference
        }}
      />
    </div>
  );
}
```

#### 5.2 Update Main Plots Tool
```typescript
// @src/app/(tools)/plots/page.tsx
import { BWRPlots } from '@/lib/bwr-plots';

export default function PlotsPage() {
  // Replace all existing chart logic with:
  const plotter = new BWRPlots();
  
  // Simple method calls matching Python exactly:
  const chartSpec = plotter.stacked_bar_chart({
    data: processedData,
    title: userTitle,
    subtitle: userSubtitle,
    // ... all user options
  });
  
  return <PlotlyRenderer spec={chartSpec} />;
}
```

## Success Criteria

### 1. Pixel-Perfect Match
- Stacked bar chart generates identical visual output to Python reference
- All styling, colors, fonts, watermarks match exactly
- Data processing pipeline produces identical results

### 2. Single Source of Truth
- All chart generation code consolidated in `@src/lib/bwr-plots/`
- No scattered chart implementations
- Simple import: `import { BWRPlots } from '@/lib/bwr-plots'`

### 3. React Integration Fixed
- No infinite loops or state update issues
- Clean, predictable component lifecycle
- Error handling and loading states

### 4. Maintainable Architecture
- Clear separation of concerns
- TypeScript types for all interfaces
- Consistent patterns across all chart types
- Easy to add new chart types

## Migration Strategy

1. **Week 1**: Create `@src/lib/bwr-plots/` structure and BWRPlots class
2. **Week 2**: Port stacked bar chart to achieve pixel-perfect match
3. **Week 3**: Port remaining chart types (scatter, area, etc.)
4. **Week 4**: Fix React integration and update all usage points
5. **Week 5**: Remove old scattered implementations and clean up

## File Structure After Consolidation

```
@src/lib/bwr-plots/          # SINGLE LOCATION for all BWR plotting
├── index.ts                 # Main BWRPlots class export
├── charts/                  # Individual chart implementations
├── config/                  # Configuration system
├── utils/                   # Data processing and utilities
├── react/                   # React integration components
└── types.ts                 # All TypeScript definitions

@src/app/(tools)/plots/      # Simple import and usage
@src/app/(dev)/plot_tests/   # Test page using consolidated system
```

This plan will create a true 1:1 port of the Python BWRPlots system, fixing both the visual differences and the React integration issues while consolidating everything into a single, maintainable location.