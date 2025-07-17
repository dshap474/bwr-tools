// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Config Package Exports                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

// Export all types
export * from './types';

// Export configuration
export { DEFAULT_BWR_CONFIG } from './bwr-config';

// Export utilities
export { 
  deepMergeDicts, 
  getDefaultConfig, 
  mergeConfig, 
  getPlotConfig 
} from './utils';

// Export theme
export { theme, generateCSSVariables } from './theme';

// Export validation
export { validateConfig, safeValidateConfig, BWRConfigSchema } from './validation';

// Export specific plot type configurations for convenience
export const PLOT_CONFIGS = {
  scatter: () => getPlotConfig('scatter'),
  bar: () => getPlotConfig('bar'),
  horizontalBar: () => getPlotConfig('horizontal_bar'),
  multiBar: () => getPlotConfig('multi_bar'),
  stackedBar: () => getPlotConfig('stacked_bar'),
  metricShareArea: () => getPlotConfig('metric_share_area'),
  table: () => getPlotConfig('table'),
} as const;

// Re-export commonly used types
import { getPlotConfig } from './utils';
export type { 
  BWRConfig,
  BWRGeneralConfig,
  BWRColorsConfig,
  BWRFontsConfig,
  BWRLayoutConfig,
  BWRAxesConfig,
  PlotType
} from './types';