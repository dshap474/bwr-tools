// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Table Plot React Component                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { TableChart, TableChartOptions } from './TableChart';
import { DataFrame } from '../../lib';
import { ChartContainer, PlotlyRenderer } from '../renderers';

export interface TablePlotProps {
  // Data
  dataframe: DataFrame;
  
  // Chart options
  title?: string;
  subtitle?: string;
  
  // Visual options
  headerFillColor?: string;
  cellFillColorEven?: string;
  cellFillColorOdd?: string;
  lineColor?: string;
  cellHeight?: number;
  
  // Font options
  headerFontSize?: number;
  cellFontSize?: number;
  headerFontColor?: string;
  cellFontColor?: string;
  fontFamily?: string;
  
  // Data options
  maxRows?: number;
  columnWidths?: Record<string, number>;
  formatters?: Record<string, (value: any) => string>;
  autoInferFormatters?: boolean;
  
  // Layout options
  tableWidth?: number;
  tableHeight?: number;
  
  // Component options
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  error?: string | null;
  onError?: (error: Error) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
  onDataProcessed?: (chart: TableChart) => void;
}

export const TablePlot: React.FC<TablePlotProps> = ({
  dataframe,
  title,
  subtitle,
  headerFillColor,
  cellFillColorEven,
  cellFillColorOdd,
  lineColor,
  cellHeight,
  headerFontSize,
  cellFontSize,
  headerFontColor,
  cellFontColor,
  fontFamily,
  maxRows,
  columnWidths,
  formatters,
  autoInferFormatters = true,
  tableWidth,
  tableHeight,
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
      
      const options: TableChartOptions = {
        title,
        subtitle,
        headerFillColor,
        cellFillColorEven,
        cellFillColorOdd,
        lineColor,
        cellHeight,
        headerFontSize,
        cellFontSize,
        headerFontColor,
        cellFontColor,
        fontFamily,
        maxRows,
        columnWidths,
        formatters,
        autoInferFormatters,
        tableWidth,
        tableHeight,
      };

      const newChart = new TableChart(
        {
          dataframe,
          xColumn: '', // Not used for tables
          yColumns: [], // Not used for tables
        },
        options
      );

      // Notify parent component of data processing
      onDataProcessed?.(newChart);

      return newChart;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create table chart';
      setChartError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    }
  }, [
    dataframe,
    title,
    subtitle,
    headerFillColor,
    cellFillColorEven,
    cellFillColorOdd,
    lineColor,
    cellHeight,
    headerFontSize,
    cellFontSize,
    headerFontColor,
    cellFontColor,
    fontFamily,
    maxRows,
    columnWidths,
    formatters,
    autoInferFormatters,
    tableWidth,
    tableHeight,
    onError,
    onDataProcessed,
  ]);

  // Generate Plotly config
  const plotlySpec = useMemo(() => {
    if (!chart) return null;
    
    try {
      return chart.getPlotlyConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate table configuration';
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
        error="Unable to generate table configuration" 
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
export default TablePlot;