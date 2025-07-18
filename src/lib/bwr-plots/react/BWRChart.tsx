// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Chart Component - High-level React integration                                 │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BWRPlots } from '../core/BWRPlots';
import { PlotlyRenderer } from './PlotlyRenderer';
import { 
  BWRPlotSpec, 
  StackedBarArgs, 
  ScatterPlotArgs, 
  MetricShareAreaArgs,
  BarArgs,
  HorizontalBarArgs,
  MultiBarArgs,
  TableArgs,
  PointScatterArgs,
  PartialBWRConfig 
} from '../types';

export type ChartType = 
  | 'stacked_bar_chart' 
  | 'scatter_plot' 
  | 'metric_share_area_plot' 
  | 'bar_chart' 
  | 'horizontal_bar' 
  | 'multi_bar' 
  | 'table_plot'
  | 'point_scatter_plot';

export type ChartArgs = 
  | StackedBarArgs 
  | ScatterPlotArgs 
  | MetricShareAreaArgs
  | BarArgs
  | HorizontalBarArgs
  | MultiBarArgs
  | TableArgs
  | PointScatterArgs;

export interface BWRChartProps {
  chartType: ChartType;
  data: any;
  options?: Partial<ChartArgs>;
  config?: PartialBWRConfig;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onSuccess?: (spec: BWRPlotSpec) => void;
  onRender?: () => void;
}

export function BWRChart({ 
  chartType, 
  data, 
  options = {}, 
  config,
  className,
  style,
  onError,
  onSuccess,
  onRender
}: BWRChartProps) {
  const [spec, setSpec] = useState<BWRPlotSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Memoize BWRPlots instance to avoid recreating on every render
  const plotter = useMemo(() => {
    return new BWRPlots(config);
  }, [config]);

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => {
    return { ...options };
  }, [JSON.stringify(options)]);

  // Stable error and success handlers
  const handleError = useCallback((err: Error) => {
    console.error('[BWRChart] Error handler called:', err);
    if (mountedRef.current) {
      setError(err.message);
      onError?.(err);
    }
  }, [onError]);

  const handleSuccess = useCallback((result: BWRPlotSpec) => {
    console.log('[BWRChart] Success handler called:', { hasData: !!result.data, dataLength: result.data?.length });
    if (mountedRef.current) {
      setSpec(result);
      generationRef.current = true;
      onSuccess?.(result);
    }
  }, [onSuccess]);

  // Generate chart function - stabilized with proper dependencies
  const generateChart = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`[BWRChart.generateChart] ${timestamp} Starting chart generation`);
    
    if (!data) {
      console.log(`[BWRChart.generateChart] ${timestamp} No data provided`);
      handleError(new Error('No data provided'));
      return;
    }

    if (isGenerating) {
      console.log(`[BWRChart.generateChart] ${timestamp} Already generating, skipping`);
      return;
    }

    if (!mountedRef.current) {
      console.log(`[BWRChart.generateChart] ${timestamp} Component unmounted, skipping`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Prepare chart arguments
      const chartArgs = {
        data,
        ...memoizedOptions
      };

      console.log(`[BWRChart.generateChart] ${timestamp} Chart args:`, {
        hasData: !!chartArgs.data,
        dataType: chartArgs.data?.constructor?.name,
        optionsKeys: Object.keys(memoizedOptions)
      });

      // Call the appropriate chart method
      let result: BWRPlotSpec;
      
      switch (chartType) {
        case 'stacked_bar_chart':
          console.log(`[BWRChart.generateChart] ${timestamp} Calling stacked_bar_chart`);
          result = plotter.stacked_bar_chart(chartArgs as StackedBarArgs);
          break;
        case 'scatter_plot':
          result = plotter.scatter_plot(chartArgs as ScatterPlotArgs);
          break;
        case 'metric_share_area_plot':
          result = plotter.metric_share_area_plot(chartArgs as MetricShareAreaArgs);
          break;
        case 'bar_chart':
          result = plotter.bar_chart(chartArgs as BarArgs);
          break;
        case 'horizontal_bar':
          result = plotter.horizontal_bar(chartArgs as HorizontalBarArgs);
          break;
        case 'multi_bar':
          result = plotter.multi_bar(chartArgs as MultiBarArgs);
          break;
        case 'table_plot':
          result = plotter.table_plot(chartArgs as TableArgs);
          break;
        case 'point_scatter_plot':
          result = plotter.point_scatter_plot(chartArgs as PointScatterArgs);
          break;
        default:
          throw new Error(`Unsupported chart type: ${chartType}`);
      }

      console.log(`[BWRChart.generateChart] ${timestamp} Chart generated successfully:`, {
        hasData: !!result?.data,
        dataLength: result?.data?.length,
        hasLayout: !!result?.layout,
        hasConfig: !!result?.config
      });

      if (mountedRef.current) {
        handleSuccess(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Chart generation failed';
      console.error(`[BWRChart.generateChart] ${timestamp} Error:`, err);
      if (mountedRef.current) {
        handleError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      console.log(`[BWRChart.generateChart] ${timestamp} Finally block - setting isGenerating to false`);
      if (mountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [chartType, data, memoizedOptions, plotter, handleError, handleSuccess, isGenerating]);

  // Generate chart when component mounts or critical data changes
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[BWRChart] ${timestamp} Effect triggered - checking if generation needed`, {
      hasGenerated: generationRef.current,
      hasSpec: !!spec,
      hasData: !!data,
      mounted: mountedRef.current
    });
    
    if (!generationRef.current && !isGenerating && data && mountedRef.current) {
      console.log(`[BWRChart] ${timestamp} Starting chart generation`);
      // Add small delay to ensure component is stable
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          generateChart();
        }
      }, 10);
      
      return () => clearTimeout(timeout);
    }
  }, [data, chartType, generateChart]); // Include generateChart in deps for proper updates

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      console.log('[BWRChart] Component unmounting, cleaning up');
      mountedRef.current = false;
    };
  }, []);

  // Handle rendering errors
  const handleRenderError = useCallback((err: Error) => {
    const timestamp = new Date().toISOString();
    console.error(`[BWRChart] ${timestamp} Render error:`, err);
    if (mountedRef.current) {
      setError(`Rendering error: ${err.message}`);
      onError?.(err);
    }
  }, [onError]);

  // Loading state
  if (isGenerating && !spec) {
    const timestamp = new Date().toISOString();
    console.log(`[BWRChart] ${timestamp} Showing loading state`, { isGenerating, hasSpec: !!spec });
    return (
      <div className={`flex items-center justify-center p-8 ${className || ''}`} style={style}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="text-gray-400">Generating chart...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 bg-red-900/20 border border-red-500/30 rounded-lg ${className || ''}`} style={style}>
        <div className="flex items-start space-x-3">
          <div className="text-red-400">⚠️</div>
          <div>
            <h3 className="text-sm font-medium text-red-300">Chart Generation Error</h3>
            <p className="mt-1 text-sm text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No chart data
  if (!spec) {
    const timestamp = new Date().toISOString();
    console.log(`[BWRChart] ${timestamp} No spec available`, { 
      hasSpec: !!spec, 
      isGenerating, 
      error,
      hasGenerated: generationRef.current,
      hasData: !!data
    });
    return (
      <div className={`p-6 text-center text-gray-400 ${className || ''}`} style={style}>
        No chart data available
      </div>
    );
  }

  // Render chart
  const timestamp = new Date().toISOString();
  console.log(`[BWRChart] ${timestamp} Rendering PlotlyRenderer with spec:`, {
    hasData: !!spec.data,
    dataLength: spec.data?.length,
    hasLayout: !!spec.layout
  });
  
  return (
    <PlotlyRenderer 
      spec={spec} 
      className={className}
      style={style}
      onError={handleRenderError}
      onRender={onRender}
    />
  );
}

export default BWRChart;