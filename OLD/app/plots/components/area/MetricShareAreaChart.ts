// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Metric Share Area Chart Implementation                                              │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BaseChart, ChartData, ChartOptions } from '../base/BaseChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { ScaleInfo } from '../../../lib';
import { isNumericData } from '../utils/chart-utils';
import {
  sortColumnsByLastRow,
  normalizeToPercentages,
  applyRollingMean,
  generateAreaTrace,
  generateAreaLegendTrace,
  getPercentageYAxisConfig,
  validateMetricShareAreaData,
  generateAreaColors
} from './area-utils';

export interface MetricShareAreaChartOptions extends ChartOptions {
  // Data processing options
  smoothing?: boolean;
  smoothingWindow?: number;
  
  // Visual options
  fillOpacity?: number;
  lineWidth?: number;
  
  // Color options
  colorOverrides?: Record<string, string>;
  
  // Axis configuration
  xAxisTitle?: string;
  yAxisTitle?: string;
  showPercentageLabels?: boolean;
}

export class MetricShareAreaChart extends BaseChart {
  private areaOptions: MetricShareAreaChartOptions;
  private processedData: any = null;
  private columnOrder: string[] = [];
  private seriesColors: Record<string, string> = {};

  constructor(data: ChartData, options: MetricShareAreaChartOptions = {}) {
    // Validate metric share area chart data requirements
    if (!data.xColumn) {
      throw new Error('Metric share area chart requires X column (typically dates)');
    }
    
    if (data.yColumns.length === 0) {
      throw new Error('Metric share area chart requires at least one Y column (metrics)');
    }

    super(data, options);
    
    this.areaOptions = {
      smoothing: false,
      smoothingWindow: 7,
      fillOpacity: 0.8,
      lineWidth: 0,
      showPercentageLabels: true,
      yAxisTitle: 'Share (%)',
      ...options
    };

    this.validateAreaData();
  }

  private validateAreaData(): void {
    const { dataframe, xColumn, yColumns } = this.data;
    
    // Use comprehensive validation from utils
    const validation = validateMetricShareAreaData(dataframe, xColumn!, yColumns);
    
    if (!validation.isValid) {
      throw new Error(`Invalid data for metric share area chart: ${validation.errors.join(', ')}`);
    }
    
    // Log warnings but don't fail
    if (validation.warnings.length > 0) {
      console.warn('Metric share area chart warnings:', validation.warnings);
    }
    
    // Additional validation: check if all Y columns are numeric
    for (const yColumn of yColumns) {
      const yData = dataframe.getColumn(yColumn).toArray();
      if (!isNumericData(yData)) {
        throw new Error(`Y column '${yColumn}' must contain numeric data for metric share area charts`);
      }
    }
  }

  protected generatePlotlyConfig(): BWRPlotSpec {
    // Process and prepare data
    this.processedData = this.prepareAreaData();
    
    // Generate traces (area + legend traces)
    const traces = this.generateTraces(this.processedData);

    // Generate layout
    const layout = this.generateLayout(this.processedData);

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

  private prepareAreaData(): any {
    let workingDf = this.data.dataframe;
    const { yColumns } = this.data;

    // Step 1: Sort columns by last row values (critical for consistent colors)
    this.columnOrder = sortColumnsByLastRow(workingDf, yColumns, false);
    
    // Step 2: Apply smoothing if enabled (before normalization)
    if (this.areaOptions.smoothing && this.areaOptions.smoothingWindow! > 1) {
      workingDf = applyRollingMean(workingDf, this.columnOrder, this.areaOptions.smoothingWindow!);
    }
    
    // Step 3: Normalize data so each row sums to 1.0 (100%)
    workingDf = normalizeToPercentages(workingDf, this.columnOrder);
    
    // Step 4: Generate colors based on sorted column order
    this.seriesColors = generateAreaColors(
      this.columnOrder,
      this.config.colors.default_palette,
      this.areaOptions.colorOverrides
    );
    
    return workingDf;
  }

  private generateTraces(df: any): any[] {
    const traces: any[] = [];
    const { xColumn } = this.data;
    
    const xData = df.getColumn(xColumn!).toArray();
    
    // Generate area traces and legend traces for each series
    // Important: Process in sorted order for consistent stacking
    for (const yColumn of this.columnOrder) {
      const yData = df.getColumn(yColumn).toArray();
      const color = this.seriesColors[yColumn];
      
      // Add main area trace (showlegend: false)
      const areaTrace = generateAreaTrace(
        xData,
        yData,
        yColumn,
        color,
        false // Don't show in legend
      );
      
      traces.push(areaTrace);
      
      // Add legend trace (circle marker, showlegend: true)
      const legendTrace = generateAreaLegendTrace(yColumn, color);
      traces.push(legendTrace);
    }

    return traces;
  }

  private generateLayout(df: any) {
    const baseLayout = this.getBaseLayout();
    const { xColumn } = this.data;
    
    const xData = df.getColumn(xColumn!).toArray();
    
    // Configure X-axis
    baseLayout.xaxis = {
      ...this.getAxisConfig(xData),
      title: {
        text: this.getAxisTitle('x'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      },
      type: this.isDateColumn(xColumn!) ? 'date' : '-'
    };
    
    // Configure Y-axis with fixed percentage range
    const yAxisConfig = getPercentageYAxisConfig();
    baseLayout.yaxis = {
      ...this.getAxisConfig([0, 1], true),
      title: {
        text: this.getAxisTitle('y'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      },
      ...yAxisConfig
    };
    
    // Configure hover mode for better interaction
    baseLayout.hovermode = 'x unified';
    
    return baseLayout;
  }

  private isDateColumn(columnName: string): boolean {
    // Check if the column contains date-like data
    const { dataframe } = this.data;
    const sample = dataframe.getColumn(columnName).toArray().slice(0, 5);
    
    return sample.some(value => {
      if (value instanceof Date) return true;
      if (typeof value === 'string' && !isNaN(Date.parse(value))) return true;
      return false;
    });
  }

  private getAxisTitle(axis: 'x' | 'y'): string {
    if (axis === 'x') {
      return this.areaOptions.xAxisTitle || this.data.xColumn || 'Time';
    } else {
      return this.areaOptions.yAxisTitle || 'Share (%)';
    }
  }

  // Public methods for chart interaction
  public setSmoothing(enabled: boolean, window: number = 7): void {
    this.areaOptions.smoothing = enabled;
    this.areaOptions.smoothingWindow = window;
    this.processedData = null; // Force data reprocessing
    this.plotlyConfig = null;
  }

  public setColorOverrides(colorOverrides: Record<string, string>): void {
    this.areaOptions.colorOverrides = colorOverrides;
    this.processedData = null; // Force reprocessing to regenerate colors
    this.plotlyConfig = null;
  }

  public getColumnOrder(): string[] {
    return this.columnOrder;
  }

  public getSeriesColors(): Record<string, string> {
    return this.seriesColors;
  }

  public getProcessedData(): any {
    if (!this.processedData) {
      this.processedData = this.prepareAreaData();
    }
    return this.processedData;
  }

  // Override getScaleInfo since we don't use traditional scaling
  public getScaleInfo(): ScaleInfo {
    // Area charts are normalized to percentages, so no scaling info needed
    const scaleInfo: ScaleInfo = {};
    for (const col of this.data.yColumns) {
      scaleInfo[col] = {
        scale: 1,
        suffix: '%'
      };
    }
    return scaleInfo;
  }

  // Validation method to check data integrity
  public validateDataIntegrity(): {
    isValid: boolean;
    rowSums: number[];
    warnings: string[];
  } {
    if (!this.processedData) {
      this.processedData = this.prepareAreaData();
    }
    
    const warnings: string[] = [];
    const rowSums: number[] = [];
    let isValid = true;
    
    // Check that each row sums to approximately 1.0 (100%)
    for (let i = 0; i < this.processedData.shape[0]; i++) {
      let rowSum = 0;
      for (const col of this.columnOrder) {
        const value = this.processedData.getColumn(col).toArray()[i];
        if (typeof value === 'number') {
          rowSum += value;
        }
      }
      rowSums.push(rowSum);
      
      // Allow small floating point errors
      const tolerance = 0.001;
      if (Math.abs(rowSum - 1.0) > tolerance) {
        warnings.push(`Row ${i} sum is ${rowSum.toFixed(3)}, expected ~1.0`);
        isValid = false;
      }
    }
    
    return { isValid, rowSums, warnings };
  }
}