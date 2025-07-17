// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Stacked Bar Chart Implementation                                                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BaseChart, ChartData, ChartOptions } from '../base/BaseChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { 
  scaleDataFrame, 
  calculateYAxisGridParams,
  ScaleInfo 
} from '../../lib';
import { isNumericData } from '../utils/chart-utils';
import {
  generateStackedBarColors,
  processCategories,
  createBarHoverTemplate,
  formatBarValue,
  sortColumnsBySum
} from './bar-utils';

export interface StackedBarChartOptions extends ChartOptions {
  // Axis configuration
  xAxisTitle?: string;
  yAxisTitle?: string;
  
  // Visual options
  barWidth?: number;
  barGap?: number;
  barGroupGap?: number;
  opacity?: number;
  
  // Color options
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
}

export class StackedBarChart extends BaseChart {
  private stackedBarOptions: StackedBarChartOptions;
  private scaleInfo: ScaleInfo = {};
  private processedData: any = null;
  private columnOrder: string[] = [];

  constructor(data: ChartData, options: StackedBarChartOptions = {}) {
    // Validate stacked bar chart data requirements
    if (!data.xColumn) {
      throw new Error('Stacked bar chart requires X column (categories)');
    }
    
    // Stacked bar requires at least one Y column
    if (data.yColumns.length === 0) {
      throw new Error('Stacked bar chart requires at least one Y column (values)');
    }

    super(data, options);
    
    this.stackedBarOptions = {
      barWidth: 0.8,
      barGap: 0.15,
      barGroupGap: 0.1,
      opacity: 0.8,
      sortBars: 'none',
      sortColumns: false,
      showValues: false,
      maxCategories: 50,
      groupOthers: true,
      othersLabel: 'Others',
      ...options
    };

    this.validateStackedBarData();
  }

  private validateStackedBarData(): void {
    const { dataframe, xColumn, yColumns } = this.data;
    
    // Check if X column contains categorical data
    const xData = dataframe.getColumn(xColumn!).toArray();
    if (isNumericData(xData) && xData.length > 20) {
      console.warn('X column appears to be numeric with many values. Consider using an area chart instead.');
    }

    // Check if all Y columns are numeric
    for (const yColumn of yColumns) {
      const yData = dataframe.getColumn(yColumn).toArray();
      if (!isNumericData(yData)) {
        throw new Error(`Y column '${yColumn}' must contain numeric data for stacked bar charts`);
      }
    }
  }

  protected generatePlotlyConfig(): BWRPlotSpec {
    // Process and prepare data
    this.processedData = this.prepareStackedBarData();
    
    // Apply scaling
    const { scaledDf, scaleInfo } = scaleDataFrame(this.processedData);
    this.scaleInfo = scaleInfo;

    // Determine column order (possibly sorted by sum)
    this.columnOrder = this.stackedBarOptions.sortColumns
      ? sortColumnsBySum(scaledDf, this.data.yColumns, false) // descending
      : this.data.yColumns;

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

  private prepareStackedBarData(): any {
    const workingDf = this.data.dataframe;
    const { xColumn, yColumns } = this.data;

    // Get category data
    const categories = workingDf.getColumn(xColumn!).toArray();
    
    // For sorting categories, we'll use the sum of all Y columns (stacked total)
    const totalValues: number[] = [];
    for (let i = 0; i < categories.length; i++) {
      let total = 0;
      for (const yCol of yColumns) {
        const val = workingDf.getColumn(yCol).toArray()[i];
        total += val || 0;
      }
      totalValues.push(total);
    }

    // Process categories
    const {
      processedCategories,
      categoryMap,
      othersIndices
    } = processCategories(
      categories,
      totalValues,
      this.stackedBarOptions.maxCategories,
      this.stackedBarOptions.groupOthers,
      this.stackedBarOptions.othersLabel!,
      this.stackedBarOptions.sortBars!
    );

    // Build grouped data
    const groupedData: Record<string, any[]> = {};
    
    // Initialize arrays
    for (const column of workingDf.columns) {
      groupedData[column] = [];
    }

    // Process each category
    for (const category of processedCategories) {
      if (category === this.stackedBarOptions.othersLabel && othersIndices) {
        // Aggregate "Others" data
        groupedData[xColumn!].push(category);
        
        // Aggregate values for Y columns
        for (const yColumn of yColumns) {
          const yData = workingDf.getColumn(yColumn).toArray();
          const aggregatedValue = othersIndices.reduce((sum, idx) => 
            sum + (yData[idx] || 0), 0
          );
          groupedData[yColumn].push(aggregatedValue);
        }
        
        // Handle other columns
        for (const column of workingDf.columns) {
          if (column !== xColumn && !yColumns.includes(column)) {
            if (othersIndices.length > 0) {
              const columnData = workingDf.getColumn(column).toArray();
              groupedData[column].push(columnData[othersIndices[0]]);
            } else {
              groupedData[column].push(null);
            }
          }
        }
      } else {
        // Find first occurrence of this category
        const categoryIndex = categories.findIndex(cat => cat === category);
        
        if (categoryIndex !== -1) {
          for (const column of workingDf.columns) {
            const columnData = workingDf.getColumn(column).toArray();
            groupedData[column].push(columnData[categoryIndex]);
          }
        }
      }
    }

    // Create new dataframe with grouped data
    return workingDf.constructor(groupedData);
  }

  private generateTraces(df: any): any[] {
    const traces: any[] = [];
    const { xColumn } = this.data;
    
    const categories = df.getColumn(xColumn!).toArray();
    
    // Calculate column sums for color priority
    const columnSums: Record<string, number> = {};
    for (const col of this.columnOrder) {
      const values = df.getColumn(col).toArray();
      columnSums[col] = values.reduce((sum: number, val: number) => sum + (val || 0), 0);
    }
    
    // Generate colors with reversed priority mapping
    const seriesColors = generateStackedBarColors(
      this.columnOrder,
      columnSums,
      this.config,
      this.stackedBarOptions.colorOverrides
    );

    // Add bar traces in REVERSED order for proper stacking
    // (following Python implementation)
    const reversedColumns = [...this.columnOrder].reverse();
    
    for (const yColumn of reversedColumns) {
      const values = df.getColumn(yColumn).toArray();
      const color = seriesColors[yColumn];
      
      // Prepare text values if showing values
      let textValues: string[] | undefined;
      if (this.stackedBarOptions.showValues) {
        textValues = values.map((v: number) => 
          formatBarValue(v, yColumn, this.scaleInfo, this.stackedBarOptions.valueFormat)
        );
      }
      
      // Add bar trace
      const barTrace: any = {
        type: 'bar',
        name: this.formatColumnName(yColumn),
        x: categories,
        y: values,
        marker: {
          color: color,
          line: {
            color: this.config.colors.background_color,
            width: 1
          }
        },
        opacity: this.stackedBarOptions.opacity,
        hovertemplate: createBarHoverTemplate(
          yColumn,
          false,
          this.scaleInfo,
          xColumn
        ),
        text: textValues,
        textposition: 'inside',
        textfont: {
          color: this.config.fonts.tick.color,
          size: this.config.fonts.tick.size
        },
        showlegend: false, // Hide from legend, we'll use circle markers
        width: this.stackedBarOptions.barWidth
      };
      
      traces.push(barTrace);
      
      // Add dummy scatter trace for circle legend marker (following Python)
      const legendTrace = {
        type: 'scatter',
        x: [null],
        y: [null],
        name: this.formatColumnName(yColumn),
        mode: 'markers',
        marker: {
          symbol: 'circle',
          size: 12,
          color: color
        },
        showlegend: true
      };
      
      traces.push(legendTrace);
    }

    return traces;
  }

  private formatColumnName(columnName: string): string {
    const suffix = this.scaleInfo[columnName]?.suffix;
    return suffix ? `${columnName} (${suffix})` : columnName;
  }

  private generateLayout(df: any) {
    const baseLayout = this.getBaseLayout();
    const { xColumn } = this.data;
    
    const categories = df.getColumn(xColumn!).toArray();
    
    // Calculate max stacked value for Y-axis range
    let maxStackedValue = 0;
    for (let i = 0; i < categories.length; i++) {
      let stackedTotal = 0;
      for (const yCol of this.columnOrder) {
        const values = df.getColumn(yCol).toArray();
        stackedTotal += values[i] || 0;
      }
      if (stackedTotal > maxStackedValue) {
        maxStackedValue = stackedTotal;
      }
    }
    
    // Configure X-axis (categories)
    baseLayout.xaxis = {
      ...this.getAxisConfig([]),
      title: {
        text: this.getAxisTitle('x'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      },
      type: 'category',
      categoryorder: 'array',
      categoryarray: categories
    };
    
    // Configure Y-axis (stacked values)
    const yGridParams = calculateYAxisGridParams([0, maxStackedValue]);
    baseLayout.yaxis = {
      ...this.getAxisConfig([0, maxStackedValue], true),
      title: {
        text: this.getAxisTitle('y'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      },
      ...yGridParams
    };
    
    // Configure bar mode for stacking
    baseLayout.barmode = 'stack';
    baseLayout.bargap = this.stackedBarOptions.barGap;
    baseLayout.bargroupgap = this.stackedBarOptions.barGroupGap;

    return baseLayout;
  }

  private getAxisTitle(axis: 'x' | 'y'): string {
    if (axis === 'x') {
      return this.stackedBarOptions.xAxisTitle || this.data.xColumn || 'Categories';
    } else {
      if (this.stackedBarOptions.yAxisTitle) return this.stackedBarOptions.yAxisTitle;
      // For stacked bar, indicate it's a total/sum
      return 'Total';
    }
  }

  // Public methods for chart interaction
  public setSorting(sortBars: 'none' | 'ascending' | 'descending' | 'alphabetical'): void {
    this.stackedBarOptions.sortBars = sortBars;
    this.processedData = null; // Force data reprocessing
    this.plotlyConfig = null;
  }

  public setSortColumns(sort: boolean): void {
    this.stackedBarOptions.sortColumns = sort;
    this.plotlyConfig = null; // Force regeneration
  }

  public setMaxCategories(maxCategories: number, groupOthers: boolean = true): void {
    this.stackedBarOptions.maxCategories = maxCategories;
    this.stackedBarOptions.groupOthers = groupOthers;
    this.processedData = null;
    this.plotlyConfig = null;
  }

  public showValues(show: boolean, format?: string): void {
    this.stackedBarOptions.showValues = show;
    if (format) this.stackedBarOptions.valueFormat = format;
    this.plotlyConfig = null;
  }

  public getProcessedCategories(): any[] {
    if (!this.processedData) {
      this.processedData = this.prepareStackedBarData();
    }
    return this.processedData.getColumn(this.data.xColumn!).toArray();
  }

  public getColumnOrder(): string[] {
    return this.columnOrder;
  }

  public getScaleInfo(): ScaleInfo {
    return this.scaleInfo;
  }
}