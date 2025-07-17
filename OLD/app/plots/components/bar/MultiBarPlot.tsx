// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Multi-Bar Plot React Component                                                      │
// └────────────────────────────────────────────────────────────────────────────────────┘

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { MultiBarChart, MultiBarChartOptions } from './MultiBarChart';
import { DataFrame } from '../../lib';
import { ChartContainer, PlotlyRenderer } from '../renderers';

export interface MultiBarPlotProps {
  // Data
  dataframe: DataFrame;
  xColumn: string;
  yColumns: string[];
  
  // Chart options
  title?: string;
  subtitle?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  
  // Visual options
  barWidth?: number;
  barGap?: number;
  barGroupGap?: number;
  opacity?: number;
  colorOverrides?: Record<string, string>;
  
  // Data options
  sortBars?: 'none' | 'ascending' | 'descending' | 'alphabetical';
  showValues?: boolean;
  valueFormat?: string;
  tickFrequency?: number;
  
  // Category options
  maxCategories?: number;
  groupOthers?: boolean;
  othersLabel?: string;
  
  // Component options
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  error?: string | null;
  onError?: (error: Error) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
}

export const MultiBarPlot: React.FC<MultiBarPlotProps> = ({
  dataframe,
  xColumn,
  yColumns,
  title,
  subtitle,
  xAxisTitle,
  yAxisTitle,
  barWidth,
  barGap,
  barGroupGap,
  opacity,
  colorOverrides,
  sortBars = 'none',
  showValues = false,
  valueFormat,
  tickFrequency = 1,
  maxCategories,
  groupOthers = true,
  othersLabel = 'Others',
  className,
  style,
  loading = false,
  error = null,
  onError,
  onExport,
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
      
      const options: MultiBarChartOptions = {
        title,
        subtitle,
        xAxisTitle,
        yAxisTitle,
        barWidth,
        barGap,
        barGroupGap,
        opacity,
        colorOverrides,
        sortBars,
        showValues,
        valueFormat,
        tickFrequency,
        maxCategories,
        groupOthers,
        othersLabel,
      };

      return new MultiBarChart(
        {
          dataframe,
          xColumn,
          yColumns,
        },
        options
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create multi-bar chart';
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
    barWidth,
    barGap,
    barGroupGap,
    opacity,
    colorOverrides,
    sortBars,
    showValues,
    valueFormat,
    tickFrequency,
    maxCategories,
    groupOthers,
    othersLabel,
    onError,
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
export default MultiBarPlot;