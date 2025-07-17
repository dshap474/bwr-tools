// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Bar Plot React Component                                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { BarChart, BarChartOptions } from './BarChart';
import { ChartData } from '../base/BaseChart';
import { DataFrame } from '../../lib';
import { PlotlyRenderer, ChartContainer } from '../renderers';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';

export interface BarPlotProps {
  // Data props
  data: DataFrame;
  xColumn: string;
  yColumns: string[];
  colorColumn?: string;
  
  // Chart options
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  
  // Bar specific options
  orientation?: 'vertical' | 'horizontal';
  xAxisTitle?: string;
  yAxisTitle?: string;
  barWidth?: number;
  barGap?: number;
  barGroupGap?: number;
  opacity?: number;
  
  // Color and styling
  colorByCategory?: boolean;
  singleColor?: string;
  showLegend?: boolean;
  showWatermark?: boolean;
  
  // Data processing
  sortBars?: 'none' | 'ascending' | 'descending' | 'alphabetical';
  maxCategories?: number;
  groupOthers?: boolean;
  othersLabel?: string;
  showValues?: boolean;
  valueFormat?: string;
  
  // Event handlers
  onError?: (error: Error) => void;
  onDataChange?: (info: any) => void;
  onChartReady?: (chart: BarChart) => void;
  
  // Loading and error states
  loading?: boolean;
  error?: string;
  
  // Custom config override
  config?: Partial<BarChartOptions>;
  
  // Container props
  className?: string;
  style?: React.CSSProperties;
  
  // Display options
  responsive?: boolean;
  displayModeBar?: boolean;
  
  // Plotly event handlers
  onHover?: (data: any) => void;
  onUnhover?: (data: any) => void;
  onClick?: (data: any) => void;
  onDoubleClick?: (data: any) => void;
  onSelected?: (data: any) => void;
  onDeselect?: () => void;
  onRelayout?: (data: any) => void;
  onRestyle?: (data: any) => void;
}

interface BarPlotState {
  chart: BarChart | null;
  config: BWRPlotSpec | null;
  error: string | null;
  isLoading: boolean;
}

export const BarPlot: React.FC<BarPlotProps> = ({
  data,
  xColumn,
  yColumns,
  colorColumn,
  title,
  subtitle,
  width,
  height,
  orientation = 'vertical',
  xAxisTitle,
  yAxisTitle,
  barWidth = 0.8,
  barGap = 0.1,
  barGroupGap = 0.2,
  opacity = 0.8,
  colorByCategory = true,
  singleColor,
  showLegend = true,
  showWatermark = true,
  sortBars = 'none',
  maxCategories = 50,
  groupOthers = true,
  othersLabel = 'Others',
  showValues = false,
  valueFormat,
  onError,
  onDataChange,
  onChartReady,
  loading = false,
  error: externalError,
  config,
  className,
  style,
  responsive = true,
  displayModeBar = true,
  onHover,
  onUnhover,
  onClick,
  onDoubleClick,
  onSelected,
  onDeselect,
  onRelayout,
  onRestyle
}) => {
  const [state, setState] = useState<BarPlotState>({
    chart: null,
    config: null,
    error: null,
    isLoading: false
  });

  // Create chart data object
  const chartData: ChartData = useMemo(() => ({
    dataframe: data,
    xColumn,
    yColumns,
    colorColumn
  }), [data, xColumn, yColumns, colorColumn]);

  // Create chart options
  const chartOptions: BarChartOptions = useMemo(() => ({
    title,
    subtitle,
    width,
    height,
    showLegend,
    showWatermark,
    orientation,
    xAxisTitle,
    yAxisTitle,
    barWidth,
    barGap,
    barGroupGap,
    opacity,
    colorByCategory,
    singleColor,
    sortBars,
    maxCategories,
    groupOthers,
    othersLabel,
    showValues,
    valueFormat,
    ...config
  }), [
    title, subtitle, width, height, showLegend, showWatermark,
    orientation, xAxisTitle, yAxisTitle, barWidth, barGap, barGroupGap,
    opacity, colorByCategory, singleColor, sortBars, maxCategories,
    groupOthers, othersLabel, showValues, valueFormat, config
  ]);

  // Generate chart when data or options change
  const generateChart = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Validate required props
      if (!data || data.empty) {
        throw new Error('Data is required and cannot be empty');
      }

      if (!xColumn || !yColumns || yColumns.length === 0) {
        throw new Error('Both xColumn and yColumns are required');
      }

      // Check if columns exist in dataframe
      const missingColumns = [xColumn, ...yColumns].filter(col => !data.columns.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Missing columns in data: ${missingColumns.join(', ')}`);
      }

      // Create chart
      const chart = new BarChart(chartData, chartOptions);
      
      // Validate chart
      if (!chart.isValid()) {
        const errors = chart.getValidationErrors();
        throw new Error(`Chart validation failed: ${errors.join(', ')}`);
      }

      // Generate plotly config
      const config = chart.render();

      // Update state
      setState(prev => ({
        ...prev,
        chart,
        config,
        error: null,
        isLoading: false
      }));

      // Call callbacks
      onChartReady?.(chart);
      onDataChange?.(chart.getDataInfo());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        chart: null,
        config: null,
        error: errorMessage,
        isLoading: false
      }));
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [chartData, chartOptions, onError, onDataChange, onChartReady]);

  // Regenerate chart when dependencies change
  React.useEffect(() => {
    generateChart();
  }, [generateChart]);

  // Handle loading state
  if (loading || state.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-900 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-2 text-gray-300">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          <span>Generating bar chart...</span>
        </div>
      </div>
    );
  }

  // Handle error state
  const currentError = externalError || state.error;
  if (currentError) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-300">Chart Error</h3>
            <p className="mt-1 text-sm text-red-200">{currentError}</p>
            <button 
              onClick={generateChart}
              className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render with PlotlyRenderer
  if (state.config) {
    const dataInfo = state.chart?.getDataInfo();
    const processedCategories = state.chart?.getProcessedCategories();
    const scaleInfo = state.chart?.getScaleInfo();
    
    const footer = dataInfo ? (
      <div className="text-xs text-gray-500">
        Data: {dataInfo.shape[0]} rows × {dataInfo.shape[1]} columns | 
        Categories: {processedCategories?.length || 0} | 
        Series: {yColumns.join(', ')}
        {scaleInfo && ` | Scale: ${scaleInfo.suffix || '1x'}`}
      </div>
    ) : undefined;

    return (
      <ChartContainer
        title={title}
        subtitle={subtitle}
        footer={footer}
        className={className}
        style={style}
      >
        <PlotlyRenderer
          spec={state.config}
          responsive={responsive !== false}
          displayModeBar={displayModeBar !== false}
          onHover={onHover}
          onUnhover={onUnhover}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onSelected={onSelected}
          onDeselect={onDeselect}
          onRelayout={onRelayout}
          onRestyle={onRestyle}
          onError={(error) => {
            setState(prev => ({ ...prev, error: error.message }));
            onError?.(error);
          }}
          onExport={(format) => {
            console.log(`Export requested: ${format}`);
            // Export functionality will be handled by the export utilities
          }}
        />
      </ChartContainer>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 bg-gray-900 rounded-lg border border-gray-700">
      <div className="text-center text-gray-400">
        <div className="text-2xl mb-2">📊</div>
        <div>Initializing bar chart...</div>
      </div>
    </div>
  );
};

export default BarPlot;