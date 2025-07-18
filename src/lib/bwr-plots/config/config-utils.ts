// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Configuration Utilities                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRConfig, PartialBWRConfig } from './config-types';

/**
 * Deep merge two configuration objects
 * Replicates the deep_merge_dicts function from Python utils
 */
export function deepMergeConfig(
  baseConfig: BWRConfig,
  overrideConfig: PartialBWRConfig
): BWRConfig {
  // Start with a deep copy of the base config
  const result = JSON.parse(JSON.stringify(baseConfig)) as BWRConfig;
  
  // Recursively merge the override config
  return deepMergeObjects(result, overrideConfig) as BWRConfig;
}

/**
 * Deep merge two objects recursively
 */
function deepMergeObjects(target: any, source: any): any {
  if (source === null || source === undefined) {
    return target;
  }
  
  if (typeof source !== 'object' || Array.isArray(source)) {
    return source;
  }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        // Both target and source have objects at this key, merge them
        target[key] = deepMergeObjects(target[key], source[key]);
      } else {
        // Override the target value with source value
        target[key] = source[key];
      }
    }
  }
  
  return target;
}

/**
 * Validate configuration object
 */
export function validateConfig(config: BWRConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate required fields
  if (!config.general) {
    errors.push('Missing required "general" configuration');
  } else {
    if (!config.general.width || config.general.width <= 0) {
      errors.push('Invalid width in general configuration');
    }
    if (!config.general.height || config.general.height <= 0) {
      errors.push('Invalid height in general configuration');
    }
  }
  
  if (!config.colors) {
    errors.push('Missing required "colors" configuration');
  } else {
    if (!config.colors.default_palette || config.colors.default_palette.length === 0) {
      errors.push('Empty or missing default_palette in colors configuration');
    }
  }
  
  if (!config.fonts) {
    errors.push('Missing required "fonts" configuration');
  }
  
  if (!config.watermark) {
    errors.push('Missing required "watermark" configuration');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration for specific chart type
 */
export function getChartConfig(
  baseConfig: BWRConfig,
  chartType: keyof BWRConfig['plot_specific']
): BWRConfig & { chart_specific: BWRConfig['plot_specific'][typeof chartType] } {
  return {
    ...baseConfig,
    chart_specific: baseConfig.plot_specific[chartType]
  };
}