// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Multi-Bar Chart Implementation                                                      │
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
  generateBarColors,
  processCategories,
  createBarHoverTemplate,
  formatBarValue,
  calculateBarSpacing,
  getTickFrequencySettings
} from './bar-utils';

export interface MultiBarChartOptions extends ChartOptions {
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
  showValues?: boolean;
  valueFormat?: string;
  tickFrequency?: number;
  
  // Category options
  maxCategories?: number;
  groupOthers?: boolean;
  othersLabel?: string;
}

export class MultiBarChart extends BaseChart {
  private multiBarOptions: MultiBarChartOptions;
  private scaleInfo: ScaleInfo = {};
  private processedData: any = null;

  constructor(data: ChartData, options: MultiBarChartOptions = {}) {
    // Validate multi-bar chart data requirements
    if (!data.xColumn) {
      throw new Error('Multi-bar chart requires X column (categories)');
    }
    
    // Multi-bar requires multiple Y columns
    if (data.yColumns.length < 2) {
      throw new Error('Multi-bar chart requires at least 2 Y columns for grouped bars');
    }

    super(data, options);
    
    this.multiBarOptions = {
      barWidth: 0.8,
      barGap: 0.15,
      barGroupGap: 0.1,
      opacity: 0.8,
      sortBars: 'none',
      showValues: false,
      tickFrequency: 1,
      maxCategories: 50,
      groupOthers: true,
      othersLabel: 'Others',
      ...options
    };

    this.validateMultiBarData();
  }

  private validateMultiBarData(): void {
    const { dataframe, xColumn, yColumns } = this.data;
    
    // Check if X column contains categorical data
    const xData = dataframe.getColumn(xColumn!).toArray();
    if (isNumericData(xData) && xData.length > 20) {
      console.warn('X column appears to be numeric with many values. Consider using a line chart instead.');
    }

    // Check if all Y columns are numeric
    for (const yColumn of yColumns) {
      const yData = dataframe.getColumn(yColumn).toArray();
      if (!isNumericData(yData)) {
        throw new Error(`Y column '${yColumn}' must contain numeric data for multi-bar charts`);
      }
    }
  }

  protected generatePlotlyConfig(): BWRPlotSpec {
    // Process and prepare data
    this.processedData = this.prepareMultiBarData();
    
    // Apply scaling
    const { scaledDf, scaleInfo } = scaleDataFrame(this.processedData);
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

  private prepareMultiBarData(): any {
    const workingDf = this.data.dataframe;
    const { xColumn, yColumns } = this.data;

    // Get category data
    const categories = workingDf.getColumn(xColumn!).toArray();
    
    // For sorting, we'll use the sum of all Y columns
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
      this.multiBarOptions.maxCategories,
      this.multiBarOptions.groupOthers,
      this.multiBarOptions.othersLabel!,
      this.multiBarOptions.sortBars!
    );

    // Build grouped data
    const groupedData: Record<string, any[]> = {};
    
    // Initialize arrays
    for (const column of workingDf.columns) {
      groupedData[column] = [];
    }

    // Process each category
    for (const category of processedCategories) {
      if (category === this.multiBarOptions.othersLabel && othersIndices) {
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
    const { xColumn, yColumns } = this.data;
    
    const categories = df.getColumn(xColumn!).toArray();
    
    // Generate colors for each series
    const seriesColors = generateBarColors(
      yColumns.length,
      this.config,
      this.multiBarOptions.colorOverrides
    );

    // Add bar traces for each Y column
    for (let i = 0; i < yColumns.length; i++) {
      const yColumn = yColumns[i];
      const values = df.getColumn(yColumn).toArray();
      const color = this.multiBarOptions.colorOverrides?.[yColumn] || seriesColors[i];
      
      // Prepare text values if showing values
      let textValues: string[] | undefined;
      if (this.multiBarOptions.showValues) {
        textValues = values.map((v: number) => 
          formatBarValue(v, yColumn, this.scaleInfo, this.multiBarOptions.valueFormat)
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
        opacity: this.multiBarOptions.opacity,
        hovertemplate: createBarHoverTemplate(
          yColumn,
          false,
          this.scaleInfo,
          xColumn
        ),
        text: textValues,
        textposition: 'outside',
        textfont: {
          color: this.config.fonts.tick.color,
          size: this.config.fonts.tick.size
        },
        showlegend: false, // Hide from legend, we'll use circle markers
        offsetgroup: i,
        width: this.multiBarOptions.barWidth! / yColumns.length
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
    const { xColumn, yColumns } = this.data;
    
    const categories = df.getColumn(xColumn!).toArray();
    
    // Get max Y value across all series for grid params
    let maxY = 0;
    for (const yCol of yColumns) {
      const values = df.getColumn(yCol).toArray();
      const colMax = Math.max(...values);
      if (colMax > maxY) maxY = colMax;
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
    
    // Apply tick frequency if needed
    const tickFrequencySettings = getTickFrequencySettings(
      categories.length,
      this.multiBarOptions.tickFrequency!,
      categories
    );
    
    if (tickFrequencySettings) {
      Object.assign(baseLayout.xaxis, tickFrequencySettings);
    }
    
    // Configure Y-axis (values)
    const yGridParams = calculateYAxisGridParams([0, maxY]);
    baseLayout.yaxis = {
      ...this.getAxisConfig([0, maxY], true),
      title: {
        text: this.getAxisTitle('y'),
        font: {
          size: this.config.fonts.axis_title.size,
          color: this.config.fonts.axis_title.color
        }
      },
      ...yGridParams
    };
    
    // Configure bar spacing
    const barSpacing = calculateBarSpacing(
      categories.length,
      yColumns.length,
      this.multiBarOptions.barWidth!,
      this.multiBarOptions.barGap!,
      this.multiBarOptions.barGroupGap!
    );
    
    baseLayout.barmode = 'group';
    baseLayout.bargap = barSpacing.bargap;
    baseLayout.bargroupgap = barSpacing.bargroupgap;

    return baseLayout;
  }

  private getAxisTitle(axis: 'x' | 'y'): string {
    if (axis === 'x') {
      return this.multiBarOptions.xAxisTitle || this.data.xColumn || 'Categories';
    } else {
      if (this.multiBarOptions.yAxisTitle) return this.multiBarOptions.yAxisTitle;
      // For multi-bar, just use "Values" as we have multiple series
      return 'Values';
    }
  }

  // Public methods for chart interaction
  public setSorting(sortBars: 'none' | 'ascending' | 'descending' | 'alphabetical'): void {
    this.multiBarOptions.sortBars = sortBars;
    this.processedData = null; // Force data reprocessing
    this.plotlyConfig = null;
  }

  public setMaxCategories(maxCategories: number, groupOthers: boolean = true): void {
    this.multiBarOptions.maxCategories = maxCategories;
    this.multiBarOptions.groupOthers = groupOthers;
    this.processedData = null;
    this.plotlyConfig = null;
  }

  public showValues(show: boolean, format?: string): void {
    this.multiBarOptions.showValues = show;
    if (format) this.multiBarOptions.valueFormat = format;
    this.plotlyConfig = null;
  }

  public setTickFrequency(frequency: number): void {
    this.multiBarOptions.tickFrequency = frequency;
    this.plotlyConfig = null;
  }

  public getProcessedCategories(): any[] {
    if (!this.processedData) {
      this.processedData = this.prepareMultiBarData();
    }
    return this.processedData.getColumn(this.data.xColumn!).toArray();
  }

  public getScaleInfo(): ScaleInfo {
    return this.scaleInfo;
  }
}