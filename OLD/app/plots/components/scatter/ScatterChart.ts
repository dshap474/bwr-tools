// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Scatter Chart Implementation                                                        │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BaseChart, ChartData, ChartOptions } from '../base/BaseChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { 
  scaleDataFrame, 
  calculateYAxisGridParams, 
  getScaleAndSuffix,
  ScaleInfo 
} from '../../lib';
import { detectDataTypes, generateColorMapping, shouldAggregateData, aggregateData } from '../utils/chart-utils';

export interface ScatterChartOptions extends ChartOptions {
  // Axis configuration
  xAxisTitle?: string;
  yAxisTitle?: string;
  y2AxisTitle?: string;
  
  // Dual axis support
  enableDualAxis?: boolean;
  y2Columns?: string[];
  
  // Visual options
  markerSize?: number | string; // number for fixed size, string for column name
  opacity?: number;
  showTrendline?: boolean;
  
  // Performance options
  maxPoints?: number;
  aggregateMethod?: 'sample' | 'bin' | 'none';
  
  // Styling
  colorScale?: 'continuous' | 'discrete';
  markerSymbol?: string;
  lineWidth?: number;
}

export interface DualAxisData extends ChartData {
  y2Columns?: string[];
}

export class ScatterChart extends BaseChart {
  private scatterOptions: ScatterChartOptions;
  private scaleInfo: ScaleInfo = {};
  private dualAxisData: DualAxisData;

  constructor(data: DualAxisData, options: ScatterChartOptions = {}) {
    // Validate dual axis data
    const allYColumns = [...data.yColumns, ...(data.y2Columns || [])];
    super({ ...data, yColumns: allYColumns }, options);
    
    this.dualAxisData = data;
    this.scatterOptions = {
      markerSize: 8,
      opacity: 0.7,
      maxPoints: 10000,
      aggregateMethod: 'sample',
      colorScale: 'discrete',
      markerSymbol: 'circle',
      lineWidth: 0,
      ...options
    };
  }

  protected generatePlotlyConfig(): BWRPlotSpec {
    const dataTypes = detectDataTypes(
      this.data.dataframe, 
      this.data.xColumn, 
      this.data.yColumns
    );

    // Determine if we need to aggregate data
    let workingDf = this.data.dataframe;
    if (this.shouldAggregateData()) {
      workingDf = this.aggregateDataForPerformance();
    }

    // Apply scaling
    const { scaledDf, scaleInfo } = scaleDataFrame(workingDf);
    this.scaleInfo = scaleInfo;

    // Generate traces
    const traces = this.generateTraces(scaledDf);

    // Generate layout
    const layout = this.generateLayout(scaledDf);

    return {
      data: traces,
      layout,
      config: {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        responsive: true
      }
    };
  }

  private shouldAggregateData(): boolean {
    return this.scatterOptions.aggregateMethod !== 'none' && 
           shouldAggregateData(this.data.dataframe.shape[0], 'scatter');
  }

  private aggregateDataForPerformance() {
    const { maxPoints = 10000, aggregateMethod = 'sample' } = this.scatterOptions;
    
    if (aggregateMethod === 'sample') {
      // Simple sampling
      const step = Math.ceil(this.data.dataframe.shape[0] / maxPoints);
      const sampledData: Record<string, any[]> = {};
      
      for (const column of this.data.dataframe.columns) {
        const series = this.data.dataframe.getColumn(column);
        sampledData[column] = [];
        
        for (let i = 0; i < series.length; i += step) {
          sampledData[column].push(series.iloc(i));
        }
      }
      
      return this.data.dataframe.constructor(sampledData) as typeof this.data.dataframe;
    }
    
    // For 'bin' aggregation, use the utility function
    if (this.data.xColumn && this.data.yColumns.length > 0) {
      return aggregateData(
        this.data.dataframe,
        this.data.xColumn,
        this.data.yColumns[0],
        'mean',
        maxPoints
      );
    }
    
    return this.data.dataframe;
  }

  private generateTraces(df: any): any[] {
    const traces: any[] = [];
    const xData = this.data.xColumn ? df.getColumn(this.data.xColumn).toArray() : [];

    // Primary Y-axis traces
    for (const yColumn of this.dualAxisData.yColumns) {
      const yData = df.getColumn(yColumn).toArray();
      
      traces.push({
        x: xData,
        y: yData,
        mode: this.getTraceMode(),
        type: 'scatter',
        name: this.formatColumnName(yColumn),
        yaxis: 'y',
        marker: this.getMarkerConfig(df, yColumn, false),
        line: this.getLineConfig(),
        hovertemplate: this.getHoverTemplate(yColumn, false)
      });
    }

    // Secondary Y-axis traces (if dual axis is enabled)
    if (this.scatterOptions.enableDualAxis && this.dualAxisData.y2Columns) {
      for (const y2Column of this.dualAxisData.y2Columns) {
        const y2Data = df.getColumn(y2Column).toArray();
        
        traces.push({
          x: xData,
          y: y2Data,
          mode: this.getTraceMode(),
          type: 'scatter',
          name: this.formatColumnName(y2Column),
          yaxis: 'y2',
          marker: this.getMarkerConfig(df, y2Column, true),
          line: this.getLineConfig(),
          hovertemplate: this.getHoverTemplate(y2Column, true)
        });
      }
    }

    return traces;
  }

  private getTraceMode(): string {
    if (this.scatterOptions.lineWidth && this.scatterOptions.lineWidth > 0) {
      return 'lines+markers';
    }
    return 'markers';
  }

  private getMarkerConfig(df: any, yColumn: string, isSecondary: boolean) {
    const baseConfig = {
      size: this.getMarkerSize(df),
      opacity: this.scatterOptions.opacity,
      symbol: this.scatterOptions.markerSymbol
    };

    // Handle color mapping
    if (this.data.colorColumn) {
      const colorData = df.getColumn(this.data.colorColumn).toArray();
      
      if (this.scatterOptions.colorScale === 'continuous') {
        baseConfig.color = colorData;
        baseConfig.colorscale = 'Viridis';
        baseConfig.showscale = true;
      } else {
        const colorMapping = generateColorMapping(colorData, 'categorical');
        baseConfig.color = colorData.map(val => colorMapping[String(val)]);
      }
    } else {
      // Use different colors for primary vs secondary axis
      const colorIndex = isSecondary ? 1 : 0;
      baseConfig.color = this.config.colors.primary;
    }

    return baseConfig;
  }

  private getMarkerSize(df: any): number | number[] {
    if (typeof this.scatterOptions.markerSize === 'string') {
      // Size column specified
      if (df.columns.includes(this.scatterOptions.markerSize)) {
        const sizeData = df.getColumn(this.scatterOptions.markerSize).toArray();
        const minSize = 4;
        const maxSize = 20;
        const dataMin = Math.min(...sizeData);
        const dataMax = Math.max(...sizeData);
        const range = dataMax - dataMin;
        
        if (range === 0) return minSize;
        
        return sizeData.map(val => 
          minSize + ((val - dataMin) / range) * (maxSize - minSize)
        );
      }
    }
    
    return this.scatterOptions.markerSize as number;
  }

  private getLineConfig() {
    return {
      width: this.scatterOptions.lineWidth || 0,
      color: this.config.colors.primary
    };
  }

  private getHoverTemplate(columnName: string, isSecondary: boolean): string {
    const xLabel = this.data.xColumn || 'X';
    const xSuffix = this.scaleInfo[this.data.xColumn || '']?.suffix || '';
    const ySuffix = this.scaleInfo[columnName]?.suffix || '';
    
    let template = `<b>${this.formatColumnName(columnName)}</b><br>`;
    template += `${xLabel}: %{x}${xSuffix}<br>`;
    template += `${columnName}: %{y}${ySuffix}`;
    
    if (this.data.colorColumn) {
      template += `<br>${this.data.colorColumn}: %{marker.color}`;
    }
    
    template += '<extra></extra>';
    return template;
  }

  private formatColumnName(columnName: string): string {
    const suffix = this.scaleInfo[columnName]?.suffix;
    return suffix ? `${columnName} (${suffix})` : columnName;
  }

  private generateLayout(df: any) {
    const baseLayout = this.getBaseLayout();
    
    // Calculate axis ranges and ticks
    const xData = this.data.xColumn ? df.getColumn(this.data.xColumn).toArray() : [];
    const y1Data = this.dualAxisData.yColumns.length > 0 
      ? df.getColumn(this.dualAxisData.yColumns[0]).toArray() 
      : [];
    
    const xAxisConfig = this.getAxisConfig(xData);
    const y1AxisConfig = this.getAxisConfig(y1Data, true);

    // Configure X-axis
    baseLayout.xaxis = {
      ...xAxisConfig,
      title: {
        text: this.getAxisTitle('x'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      }
    };

    // Configure primary Y-axis
    const y1GridParams = calculateYAxisGridParams(y1Data);
    baseLayout.yaxis = {
      ...y1AxisConfig,
      title: {
        text: this.getAxisTitle('y'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      },
      ...y1GridParams
    };

    // Configure secondary Y-axis if needed
    if (this.scatterOptions.enableDualAxis && this.dualAxisData.y2Columns) {
      const y2Data = this.dualAxisData.y2Columns.length > 0 
        ? df.getColumn(this.dualAxisData.y2Columns[0]).toArray() 
        : [];
      
      const y2AxisConfig = this.getAxisConfig(y2Data, true);
      const y2GridParams = calculateYAxisGridParams(y2Data);
      
      baseLayout.yaxis2 = {
        ...y2AxisConfig,
        title: {
          text: this.getAxisTitle('y2'),
          font: {
            size: this.config.fonts.sizes.axis,
            color: this.config.colors.text
          }
        },
        overlaying: 'y',
        side: 'right',
        ...y2GridParams
      };
    }

    return baseLayout;
  }

  private getAxisTitle(axis: 'x' | 'y' | 'y2'): string {
    switch (axis) {
      case 'x':
        if (this.scatterOptions.xAxisTitle) return this.scatterOptions.xAxisTitle;
        if (this.data.xColumn) {
          const suffix = this.scaleInfo[this.data.xColumn]?.suffix;
          return suffix ? `${this.data.xColumn} (${suffix})` : this.data.xColumn;
        }
        return 'X';
        
      case 'y':
        if (this.scatterOptions.yAxisTitle) return this.scatterOptions.yAxisTitle;
        if (this.dualAxisData.yColumns.length > 0) {
          const column = this.dualAxisData.yColumns[0];
          const suffix = this.scaleInfo[column]?.suffix;
          return suffix ? `${column} (${suffix})` : column;
        }
        return 'Y';
        
      case 'y2':
        if (this.scatterOptions.y2AxisTitle) return this.scatterOptions.y2AxisTitle;
        if (this.dualAxisData.y2Columns && this.dualAxisData.y2Columns.length > 0) {
          const column = this.dualAxisData.y2Columns[0];
          const suffix = this.scaleInfo[column]?.suffix;
          return suffix ? `${column} (${suffix})` : column;
        }
        return 'Y2';
        
      default:
        return '';
    }
  }

  // Public methods for chart interaction
  public enableDualAxis(y2Columns: string[]): void {
    this.dualAxisData.y2Columns = y2Columns;
    this.scatterOptions.enableDualAxis = true;
    this.plotlyConfig = null; // Force regeneration
  }

  public disableDualAxis(): void {
    this.dualAxisData.y2Columns = undefined;
    this.scatterOptions.enableDualAxis = false;
    this.plotlyConfig = null; // Force regeneration
  }

  public setMarkerSize(size: number | string): void {
    this.scatterOptions.markerSize = size;
    this.plotlyConfig = null;
  }

  public setColorColumn(columnName: string | undefined): void {
    this.data.colorColumn = columnName;
    this.plotlyConfig = null;
  }

  public setOpacity(opacity: number): void {
    this.scatterOptions.opacity = Math.max(0, Math.min(1, opacity));
    this.plotlyConfig = null;
  }

  public getScaleInfo(): ScaleInfo {
    return this.scaleInfo;
  }
}