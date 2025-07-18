// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ React Hooks for BWR Charts                                                         │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { useState, useCallback, useMemo, useEffect } from 'react';
import { BWRPlots } from '../core/BWRPlots';
import { BWRPlotSpec, PartialBWRConfig } from '../types';
import { ChartType, ChartArgs } from './BWRChart';

export interface UseChartOptions {
  chartType: ChartType;
  data: any;
  options?: Partial<ChartArgs>;
  config?: PartialBWRConfig;
  autoGenerate?: boolean;
}

export interface UseChartResult {
  spec: BWRPlotSpec | null;
  isLoading: boolean;
  error: string | null;
  generateChart: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing chart generation state
 */
export function useChart({
  chartType,
  data,
  options = {},
  config,
  autoGenerate = true
}: UseChartOptions): UseChartResult {
  const [spec, setSpec] = useState<BWRPlotSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize BWRPlots instance
  const plotter = useMemo(() => new BWRPlots(config), [config]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Generate chart function
  const generateChart = useCallback(async () => {
    if (!data) {
      setError('No data provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const chartArgs = { data, ...options };
      let result: BWRPlotSpec;

      switch (chartType) {
        case 'stacked_bar_chart':
          result = plotter.stacked_bar_chart(chartArgs as any);
          break;
        case 'scatter_plot':
          result = plotter.scatter_plot(chartArgs as any);
          break;
        case 'metric_share_area_plot':
          result = plotter.metric_share_area_plot(chartArgs as any);
          break;
        case 'bar_chart':
          result = plotter.bar_chart(chartArgs as any);
          break;
        case 'horizontal_bar':
          result = plotter.horizontal_bar(chartArgs as any);
          break;
        case 'multi_bar':
          result = plotter.multi_bar(chartArgs as any);
          break;
        case 'table_plot':
          result = plotter.table_plot(chartArgs as any);
          break;
        case 'point_scatter_plot':
          result = plotter.point_scatter_plot(chartArgs as any);
          break;
        default:
          throw new Error(`Unsupported chart type: ${chartType}`);
      }

      setSpec(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chart generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [chartType, data, options, plotter]);

  // Auto-generate when dependencies change
  useEffect(() => {
    if (autoGenerate) {
      generateChart();
    }
  }, [autoGenerate, generateChart]);

  return {
    spec,
    isLoading,
    error,
    generateChart,
    clearError
  };
}

/**
 * Hook for managing chart configuration
 */
export function useChartConfig(initialConfig?: PartialBWRConfig) {
  const [config, setConfig] = useState<PartialBWRConfig | undefined>(initialConfig);

  const updateConfig = useCallback((newConfig: PartialBWRConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  return {
    config,
    updateConfig,
    resetConfig
  };
}

/**
 * Hook for managing chart data processing
 */
export function useChartData(rawData: any, processor?: (data: any) => any) {
  const processedData = useMemo(() => {
    if (!rawData) return null;
    return processor ? processor(rawData) : rawData;
  }, [rawData, processor]);

  return processedData;
}