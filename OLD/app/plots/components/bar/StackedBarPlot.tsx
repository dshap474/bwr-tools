// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Stacked Bar Plot React Component                                                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { StackedBarChart, StackedBarChartOptions } from './StackedBarChart';
import { DataFrame } from '../../lib';
import { ChartContainer, PlotlyRenderer } from '../renderers';

export interface StackedBarPlotProps {
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
  sortColumns?: boolean; // Sort columns by sum in descending order
  showValues?: boolean;
  valueFormat?: string;
  
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

export const StackedBarPlot: React.FC<StackedBarPlotProps> = ({
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
  sortColumns = false,
  showValues = false,
  valueFormat,
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
      
      const options: StackedBarChartOptions = {
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
        sortColumns,
        showValues,
        valueFormat,
        maxCategories,
        groupOthers,
        othersLabel,
      };

      return new StackedBarChart(
        {
          dataframe,
          xColumn,
          yColumns,
        },
        options
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create stacked bar chart';
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
    sortColumns,
    showValues,
    valueFormat,
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
export default StackedBarPlot;