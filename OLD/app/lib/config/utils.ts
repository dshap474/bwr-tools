// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Configuration Utilities                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRConfig } from './types';
import { DEFAULT_BWR_CONFIG } from './bwr-config';

/**
 * Deep merges dict2 into dict1, where dict2 values override dict1 values for the same keys.
 * Handles nested objects by recursively merging them.
 * 
 * @param dict1 Base object to merge into
 * @param dict2 Object whose values will override dict1 for matching keys
 * @returns A new object with dict2 values merged into dict1
 */
export function deepMergeDicts<T extends Record<string, any>>(
  dict1: T,
  dict2: Partial<T>
): T {
  if (typeof dict1 !== 'object' || dict1 === null || 
      typeof dict2 !== 'object' || dict2 === null) {
    return dict2 as T;
  }

  const result = { ...dict1 };
  
  for (const key in dict2) {
    if (dict2.hasOwnProperty(key)) {
      const value = dict2[key];
      if (key in result && 
          typeof result[key] === 'object' && 
          result[key] !== null &&
          typeof value === 'object' && 
          value !== null &&
          !Array.isArray(result[key]) && 
          !Array.isArray(value)) {
        result[key] = deepMergeDicts(result[key], value);
      } else {
        result[key] = value as any;
      }
    }
  }
  
  return result;
}

/**
 * Returns a deep copy of the default configuration
 */
export function getDefaultConfig(): BWRConfig {
  return structuredClone(DEFAULT_BWR_CONFIG);
}

/**
 * Merges user configuration with default configuration
 * @param userConfig Partial user configuration to merge
 * @returns Complete configuration with user overrides
 */
export function mergeConfig(userConfig: Partial<BWRConfig>): BWRConfig {
  const defaultConfig = getDefaultConfig();
  return deepMergeDicts(defaultConfig, userConfig);
}

/**
 * Get configuration for a specific plot type
 * @param plotType The type of plot
 * @param userConfig Optional user configuration overrides
 * @returns Configuration tailored for the specific plot type
 */
export function getPlotConfig<T extends keyof BWRConfig['plot_specific']>(
  plotType: T,
  userConfig?: Partial<BWRConfig>
): BWRConfig & { current_plot: BWRConfig['plot_specific'][T] } {
  const config = userConfig ? mergeConfig(userConfig) : getDefaultConfig();
  
  return {
    ...config,
    current_plot: config.plot_specific[plotType]
  };
}