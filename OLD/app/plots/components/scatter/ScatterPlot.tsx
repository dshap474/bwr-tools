// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Scatter Plot React Component                                                        │
// └────────────────────────────────────────────────────────────────────────────────────┘

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { DataFrame } from '../../lib';
import { ScatterChart, ScatterChartOptions, DualAxisData } from './ScatterChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { PlotlyRenderer, ChartContainer } from '../renderers';

export interface ScatterPlotProps extends ScatterChartOptions {
  // Data props
  data: DataFrame;
  xColumn?: string;
  yColumns: string[];
  y2Columns?: string[];
  colorColumn?: string;
  sizeColumn?: string;
  
  // Event handlers
  onError?: (error: Error) => void;
  onDataChange?: (chart: ScatterChart) => void;
  onConfigReady?: (config: BWRPlotSpec) => void;
  
  // Container props
  className?: string;
  style?: React.CSSProperties;
  
  // Loading states
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  
  // Error boundary
  fallback?: React.ReactNode;
  
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

interface ScatterPlotState {
  chart: ScatterChart | null;
  config: BWRPlotSpec | null;
  error: Error | null;
  isLoading: boolean;
}

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  data,
  xColumn,
  yColumns,
  y2Columns,
  colorColumn,
  sizeColumn,
  onError,
  onDataChange,
  onConfigReady,
  className,
  style,
  loading = false,
  loadingComponent,
  fallback,
  responsive = true,
  displayModeBar = true,
  onHover,
  onUnhover,
  onClick,
  onDoubleClick,
  onSelected,
  onDeselect,
  onRelayout,
  onRestyle,
  ...chartOptions
}) => {
  const [state, setState] = useState<ScatterPlotState>({
    chart: null,
    config: null,
    error: null,
    isLoading: loading
  });

  // Create chart instance when data or options change
  const chart = useMemo(() => {
    try {
      setState(prev => ({ ...prev, error: null, isLoading: true }));
      
      const chartData: DualAxisData = {
        dataframe: data,
        xColumn,
        yColumns,
        y2Columns,
        colorColumn,
        sizeColumn
      };

      const newChart = new ScatterChart(chartData, chartOptions);
      
      // Validate chart data
      if (!newChart.isValid()) {
        const errors = newChart.getValidationErrors();
        throw new Error(`Chart validation failed: ${errors.join(', ')}`);
      }

      return newChart;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err, isLoading: false }));
      onError?.(err);
      return null;
    }
  }, [data, xColumn, yColumns, y2Columns, colorColumn, sizeColumn, chartOptions, onError]);

  // Generate Plotly config when chart changes
  useEffect(() => {
    if (!chart) {
      setState(prev => ({ ...prev, chart: null, config: null, isLoading: false }));
      return;
    }

    try {
      const config = chart.render();
      setState(prev => ({ 
        ...prev, 
        chart, 
        config, 
        error: null, 
        isLoading: false 
      }));
      
      onDataChange?.(chart);
      onConfigReady?.(config);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ 
        ...prev, 
        chart: null, 
        config: null, 
        error: err, 
        isLoading: false 
      }));
      onError?.(err);
    }
  }, [chart, onDataChange, onConfigReady, onError]);

  // Chart interaction methods
  const enableDualAxis = useCallback((columns: string[]) => {
    if (state.chart) {
      state.chart.enableDualAxis(columns);
      const newConfig = state.chart.render();
      setState(prev => ({ ...prev, config: newConfig }));
      onConfigReady?.(newConfig);
    }
  }, [state.chart, onConfigReady]);

  const disableDualAxis = useCallback(() => {
    if (state.chart) {
      state.chart.disableDualAxis();
      const newConfig = state.chart.render();
      setState(prev => ({ ...prev, config: newConfig }));
      onConfigReady?.(newConfig);
    }
  }, [state.chart, onConfigReady]);

  const setMarkerSize = useCallback((size: number | string) => {
    if (state.chart) {
      state.chart.setMarkerSize(size);
      const newConfig = state.chart.render();
      setState(prev => ({ ...prev, config: newConfig }));
      onConfigReady?.(newConfig);
    }
  }, [state.chart, onConfigReady]);

  const setColorColumn = useCallback((column: string | undefined) => {
    if (state.chart) {
      state.chart.setColorColumn(column);
      const newConfig = state.chart.render();
      setState(prev => ({ ...prev, config: newConfig }));
      onConfigReady?.(newConfig);
    }
  }, [state.chart, onConfigReady]);

  const setOpacity = useCallback((opacity: number) => {
    if (state.chart) {
      state.chart.setOpacity(opacity);
      const newConfig = state.chart.render();
      setState(prev => ({ ...prev, config: newConfig }));
      onConfigReady?.(newConfig);
    }
  }, [state.chart, onConfigReady]);

  // Expose chart methods via ref
  React.useImperativeHandle(React.useRef(), () => ({
    chart: state.chart,
    config: state.config,
    enableDualAxis,
    disableDualAxis,
    setMarkerSize,
    setColorColumn,
    setOpacity,
    getScaleInfo: () => state.chart?.getScaleInfo(),
    getDataInfo: () => state.chart?.getDataInfo(),
    export: (options: any) => state.chart?.export(options)
  }), [state.chart, state.config, enableDualAxis, disableDualAxis, setMarkerSize, setColorColumn, setOpacity]);

  // Error boundary rendering
  if (state.error) {
    if (fallback) {
      return React.isValidElement(fallback) ? fallback : <>{fallback}</>;
    }
    
    return (
      <div className="bwr-chart-error" style={{ padding: '20px', border: '1px solid #e74c3c', borderRadius: '4px', backgroundColor: '#fdf2f2' }}>
        <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Chart Error</h3>
        <p style={{ margin: '0', fontFamily: 'monospace', fontSize: '14px' }}>
          {state.error.message}
        </p>
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', color: '#666' }}>Stack Trace</summary>
          <pre style={{ marginTop: '10px', fontSize: '12px', color: '#666', overflow: 'auto' }}>
            {state.error.stack}
          </pre>
        </details>
      </div>
    );
  }

  // Loading state rendering
  if (state.isLoading || loading) {
    if (loadingComponent) {
      return React.isValidElement(loadingComponent) ? loadingComponent : <>{loadingComponent}</>;
    }
    
    return (
      <div className="bwr-chart-loading" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px'
      }}>
        <div style={{ 
          color: '#ededed', 
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div className="spinner" style={{
            width: '20px',
            height: '20px',
            border: '2px solid #333',
            borderTop: '2px solid #5637cd',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Generating Chart...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // No config available yet
  if (!state.config) {
    return (
      <div className="bwr-chart-empty" style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        color: '#adb0b5'
      }}>
        No chart data available
      </div>
    );
  }

  // Render with PlotlyRenderer
  const dataInfo = state.chart?.getDataInfo();
  const footer = dataInfo ? (
    <div>
      Data: {dataInfo.shape[0]} rows × {dataInfo.shape[1]} columns | 
      X: {xColumn || 'Index'} | 
      Y: {yColumns.join(', ')}
      {y2Columns && y2Columns.length > 0 && ` | Y2: ${y2Columns.join(', ')}`}
    </div>
  ) : undefined;

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      footer={footer}
      className={className}
      style={style}
      responsive={responsive !== false}
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
          setState(prev => ({ ...prev, error }));
          onError?.(error);
        }}
        onExport={(format) => {
          console.log(`Export requested: ${format}`);
          // Export functionality will be handled by the export utilities
        }}
      />
    </ChartContainer>
  );
};

// Default export
export default ScatterPlot;