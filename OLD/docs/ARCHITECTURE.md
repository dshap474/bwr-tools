# Architecture Overview

## System Design

BWR Tools follows a modular, package-based architecture optimized for maintainability, performance, and exact visual reproduction of Python plots.

```mermaid
graph TD
    A[Web App - Next.js] --> B[@bwr-tools/charts]
    B --> C[@bwr-tools/core]
    B --> D[@bwr-tools/ui]
    C --> E[@bwr-tools/config]
    C --> F[@bwr-tools/plotly-wrapper]
    C --> G[@bwr-tools/data]
    
    B --> H[@bwr-tools/types]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
    
    I[Dev Server - Python] --> J[bwr_plots]
    I --> K[Visual Comparison]
    A --> K
```

## Package Responsibilities

### @bwr-tools/types
**Purpose**: Shared TypeScript type definitions
**Dependencies**: None
**Key Exports**:
- Data types (DataFrame, Series, etc.)
- Plot configuration types
- Chart-specific types
- Utility types

### @bwr-tools/config
**Purpose**: BWR theme and configuration constants
**Dependencies**: @bwr-tools/types
**Key Exports**:
- `BWR_THEME` - Complete theme object
- `DEFAULT_CONFIG` - Default plot settings
- Color palettes
- Font configurations

### @bwr-tools/data
**Purpose**: Data processing and transformation
**Dependencies**: @bwr-tools/types
**Key Exports**:
- `DataFrame` class
- CSV/Excel parsers
- Data validators
- Transformation utilities

### @bwr-tools/plotly-wrapper
**Purpose**: Type-safe Plotly.js wrapper
**Dependencies**: @bwr-tools/types, plotly.js
**Key Exports**:
- `BWRPlotly` - Enhanced Plotly interface
- Type definitions
- Render optimizations
- Export utilities

### @bwr-tools/core
**Purpose**: Core plotting engine
**Dependencies**: All above packages
**Key Exports**:
- `PlotEngine` - Main plotting class
- Chart generators
- Data processors
- Export functions

### @bwr-tools/ui
**Purpose**: Shared React UI components
**Dependencies**: @bwr-tools/types, react
**Key Exports**:
- Basic components (Button, Input, etc.)
- Layout components
- Theme provider
- Utility hooks

### @bwr-tools/charts
**Purpose**: React chart components
**Dependencies**: @bwr-tools/core, @bwr-tools/ui, @bwr-tools/types
**Key Exports**:
- `ScatterPlot`
- `BarChart`
- `HorizontalBar`
- `MultiBar`
- `StackedBar`
- `MetricShareArea`
- `Table`

## Data Flow

### 1. File Upload
```
User File → Parse (CSV/Excel) → DataFrame → Validation → Storage
```

### 2. Plot Generation
```
DataFrame → Transform → PlotEngine → Plotly Config → Render
```

### 3. Visual Comparison (Dev)
```
TS Plot → Screenshot → Compare ← Screenshot ← Python Plot
```

## Key Design Decisions

### Why Monorepo?
- **Shared Code**: Types and utilities used across packages
- **Atomic Changes**: Update multiple packages together
- **Better DX**: Single install, unified tooling
- **Type Safety**: TypeScript references between packages

### Why Separate Packages?
- **Clear Boundaries**: Each package has one responsibility
- **Tree Shaking**: Only bundle what's used
- **Independent Testing**: Test packages in isolation
- **Versioning**: Packages can version independently

### Why Custom DataFrame?
- **Type Safety**: Full TypeScript support
- **Performance**: Optimized for our use cases
- **Compatibility**: Match Python pandas API
- **Control**: Add exactly what we need

### Why Plotly.js?
- **Consistency**: Same library as Python
- **Features**: All chart types supported
- **Maturity**: Battle-tested library
- **Exports**: Multiple format support

## Performance Architecture

### Client-Side Processing
```typescript
// Main thread
UI Interaction → Validate → Send to Worker

// Web Worker
Receive Data → Process → Return Result → Update UI
```

### Memory Management
- Typed arrays for numeric data
- Lazy loading for large datasets
- Virtual rendering for tables
- Cleanup on unmount

### Rendering Pipeline
1. **Data Preparation**: Transform to Plotly format
2. **Configuration**: Apply BWR theme
3. **Render**: Plotly.newPlot()
4. **Optimize**: WebGL for large datasets

## Security Considerations

### Input Validation
- File type checking
- Size limits
- Content sanitization
- XSS prevention

### Data Privacy
- Client-side only processing
- No data sent to servers
- LocalStorage for preferences
- Session cleanup

## Scalability

### Current Limits
- 10M data points (browser memory)
- 100MB file uploads
- 60 FPS interaction

### Future Scaling
- Streaming for larger files
- Cloud processing option
- WebAssembly for compute
- GPU acceleration

## Testing Architecture

### Unit Tests
- Per package testing
- Mock dependencies
- Fast feedback

### Integration Tests
- Cross-package flows
- Real dependencies
- API contracts

### Visual Tests
- Pixel comparison
- Multiple scenarios
- Automated baselines

### E2E Tests
- User workflows
- Browser testing
- Performance checks