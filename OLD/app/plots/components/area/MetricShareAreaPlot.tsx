// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Metric Share Area Plot React Component                                              │
// └────────────────────────────────────────────────────────────────────────────────────┘

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { MetricShareAreaChart, MetricShareAreaChartOptions } from './MetricShareAreaChart';
import { DataFrame } from '../../lib';
import { ChartContainer, PlotlyRenderer } from '../renderers';

export interface MetricShareAreaPlotProps {
  // Data
  dataframe: DataFrame;
  xColumn: string;
  yColumns: string[];
  
  // Chart options
  title?: string;
  subtitle?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  
  // Data processing options
  smoothing?: boolean;
  smoothingWindow?: number;
  
  // Visual options
  fillOpacity?: number;
  lineWidth?: number;
  colorOverrides?: Record<string, string>;
  showPercentageLabels?: boolean;
  
  // Component options
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  error?: string | null;
  onError?: (error: Error) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
  onDataProcessed?: (chart: MetricShareAreaChart) => void;
}

export const MetricShareAreaPlot: React.FC<MetricShareAreaPlotProps> = ({
  dataframe,
  xColumn,
  yColumns,
  title,
  subtitle,
  xAxisTitle,
  yAxisTitle,
  smoothing = false,
  smoothingWindow = 7,
  fillOpacity = 0.8,
  lineWidth = 0,
  colorOverrides,
  showPercentageLabels = true,
  className,
  style,
  loading = false,
  error = null,
  onError,
  onExport,
  onDataProcessed,
}) => {
  const [chartError, setChartError] = useState<string | null>(error);

  // Clear internal error when external error prop changes
  useEffect(() => {
    setChartError(error);
  }, [error]);

  // Create and memoize the chart instance
  const chart = useMemo(() => {
    try {
      setChartError(null);
      
      const options: MetricShareAreaChartOptions = {
        title,
        subtitle,
        xAxisTitle,
        yAxisTitle,
        smoothing,
        smoothingWindow,
        fillOpacity,
        lineWidth,
        colorOverrides,
        showPercentageLabels,
      };

      const newChart = new MetricShareAreaChart(
        {
          dataframe,
          xColumn,
          yColumns,
        },
        options
      );

      // Validate data integrity
      const validation = newChart.validateDataIntegrity();
      if (!validation.isValid && validation.warnings.length > 0) {
        console.warn('Metric share area chart data validation warnings:', validation.warnings);
      }

      // Notify parent component of data processing
      onDataProcessed?.(newChart);

      return newChart;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create metric share area chart';
      setChartError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    }
  }, [
    dataframe,
    xColumn,
    yColumns,
    title,
    subtitle,
    xAxisTitle,
    yAxisTitle,
    smoothing,
    smoothingWindow,
    fillOpacity,
    lineWidth,
    colorOverrides,
    showPercentageLabels,
    onError,
    onDataProcessed,
  ]);

  // Generate Plotly config
  const plotlySpec = useMemo(() => {
    if (!chart) return null;
    
    try {
      return chart.getPlotlyConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate chart configuration';
      setChartError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    }
  }, [chart, onError]);

  // Handle export with proper error handling
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    try {
      // The actual export will be handled by PlotlyRenderer
      onExport?.(format);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setChartError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [onExport, onError]);

  // If there's an error, display it
  if (chartError) {
    return (
      <ChartContainer className={className} style={style} error={chartError} />
    );
  }

  // If loading, show loading state
  if (loading) {
    return (
      <ChartContainer className={className} style={style} loading />
    );
  }

  // If no plotly spec, show error
  if (!plotlySpec) {
    return (
      <ChartContainer 
        className={className} 
        style={style} 
        error="Unable to generate chart configuration" 
      />
    );
  }

  return (
    <ChartContainer 
      className={className} 
      style={style}
      onExport={handleExport}
    >
      <PlotlyRenderer
        data={plotlySpec.data}
        layout={plotlySpec.layout}
        config={plotlySpec.config}
        onError={(err) => {
          setChartError(err.message);
          onError?.(err);
        }}
      />
    </ChartContainer>
  );
};

// Default export for convenience
export default MetricShareAreaPlot;