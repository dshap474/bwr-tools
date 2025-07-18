// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Plots Library - Main Export                                                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

// Main BWRPlots class
export { BWRPlots } from './core/BWRPlots';

// Configuration system
export { DEFAULT_BWR_CONFIG } from './config/default-config';
export { deepMergeConfig, validateConfig, getChartConfig } from './config/config-utils';
export * from './config/config-types';

// Data processing
export { DataFrame } from './data/DataFrame';
export * from './data/processors';

// Types
export * from './types';

// Individual chart classes (for advanced usage)
export { BaseChart } from './charts/base/BaseChart';
export { StackedBarChart } from './charts/stacked-bar';

// React components
export { PlotlyRenderer } from './react/PlotlyRenderer';
export { BWRChart } from './react/BWRChart';
export * from './react/hooks';