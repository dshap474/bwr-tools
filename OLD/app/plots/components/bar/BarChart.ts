// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Bar Chart Implementation                                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BaseChart, ChartData, ChartOptions } from '../base/BaseChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { 
  scaleDataFrame, 
  calculateYAxisGridParams, 
  getScaleAndSuffix,
  ScaleInfo 
} from '../../lib';
import { detectDataTypes, generateColorMapping, isNumericData } from '../utils/chart-utils';

export interface BarChartOptions extends ChartOptions {
  // Orientation
  orientation?: 'vertical' | 'horizontal';
  
  // Axis configuration
  xAxisTitle?: string;
  yAxisTitle?: string;
  
  // Visual options
  barWidth?: number;
  barGap?: number;
  barGroupGap?: number;
  opacity?: number;
  
  // Color options
  colorByCategory?: boolean;
  singleColor?: string;
  
  // Data options
  sortBars?: 'none' | 'ascending' | 'descending' | 'alphabetical';
  showValues?: boolean;
  valueFormat?: string;
  
  // Category options
  maxCategories?: number;
  groupOthers?: boolean;
  othersLabel?: string;
}

export class BarChart extends BaseChart {
  private barOptions: BarChartOptions;
  private scaleInfo: ScaleInfo = {};
  private processedData: any = null;

  constructor(data: ChartData, options: BarChartOptions = {}) {
    // Validate bar chart data requirements
    if (!data.xColumn || data.yColumns.length === 0) {
      throw new Error('Bar chart requires both X column (categories) and at least one Y column (values)');
    }

    super(data, options);
    
    this.barOptions = {
      orientation: 'vertical',
      barWidth: 0.8,
      barGap: 0.1,
      barGroupGap: 0.2,
      opacity: 0.8,
      colorByCategory: true,
      sortBars: 'none',
      showValues: false,
      maxCategories: 50,
      groupOthers: true,
      othersLabel: 'Others',
      ...options
    };

    this.validateBarData();
  }

  private validateBarData(): void {
    const { dataframe, xColumn, yColumns } = this.data;
    
    // Check if X column contains categorical data
    const xData = dataframe.getColumn(xColumn!).toArray();
    if (isNumericData(xData) && xData.length > 20) {
      console.warn('X column appears to be numeric with many values. Consider using a histogram or line chart instead.');
    }

    // Check if Y columns are numeric
    for (const yColumn of yColumns) {
      const yData = dataframe.getColumn(yColumn).toArray();
      if (!isNumericData(yData)) {
        throw new Error(`Y column '${yColumn}' must contain numeric data for bar charts`);
      }
    }
  }

  protected generatePlotlyConfig(): BWRPlotSpec {
    // Process and prepare data
    this.processedData = this.prepareBarData();
    
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

  private prepareBarData(): any {
    let workingDf = this.data.dataframe;
    const { xColumn, yColumns } = this.data;

    // Get category and value data
    const categories = workingDf.getColumn(xColumn!).toArray();
    const uniqueCategories = [...new Set(categories)];

    // Handle category limits and grouping
    let finalCategories = uniqueCategories;
    let needsGrouping = false;

    if (this.barOptions.maxCategories && uniqueCategories.length > this.barOptions.maxCategories) {
      needsGrouping = this.barOptions.groupOthers;
      if (needsGrouping) {
        // Sort categories by total value to keep the highest ones
        const categoryTotals = this.calculateCategoryTotals(uniqueCategories, categories, yColumns[0]);
        const sortedCategories = [...uniqueCategories].sort((a, b) => categoryTotals[b] - categoryTotals[a]);
        finalCategories = sortedCategories.slice(0, this.barOptions.maxCategories! - 1);
      } else {
        finalCategories = uniqueCategories.slice(0, this.barOptions.maxCategories);
      }
    }

    // Apply sorting if specified
    finalCategories = this.applyCategorySorting(finalCategories, categories, yColumns[0]);

    // Group data by categories
    const groupedData: Record<string, any[]> = {};
    
    // Initialize arrays for each column
    for (const column of workingDf.columns) {
      groupedData[column] = [];
    }

    // Add "Others" category if needed
    if (needsGrouping) {
      finalCategories.push(this.barOptions.othersLabel!);
    }

    // Process each final category
    for (const category of finalCategories) {
      if (category === this.barOptions.othersLabel && needsGrouping) {
        // Aggregate "Others" data
        const othersIndices = categories
          .map((cat, idx) => !finalCategories.slice(0, -1).includes(cat) ? idx : -1)
          .filter(idx => idx !== -1);
        
        // Add category name
        groupedData[xColumn!].push(category);
        
        // Aggregate values for Y columns
        for (const yColumn of yColumns) {
          const yData = workingDf.getColumn(yColumn).toArray();
          const aggregatedValue = othersIndices.reduce((sum, idx) => sum + (yData[idx] || 0), 0);
          groupedData[yColumn].push(aggregatedValue);
        }
        
        // Handle other columns (take first value or aggregate as appropriate)
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

  private calculateCategoryTotals(categories: any[], allCategories: any[], yColumn: string): Record<string, number> {
    const totals: Record<string, number> = {};
    const yData = this.data.dataframe.getColumn(yColumn).toArray();

    for (const category of categories) {
      totals[category] = 0;
    }

    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      if (totals.hasOwnProperty(category)) {
        totals[category] += yData[i] || 0;
      }
    }

    return totals;
  }

  private applyCategorySorting(categories: any[], allCategories: any[], yColumn: string): any[] {
    const { sortBars } = this.barOptions;
    
    if (sortBars === 'none') return categories;
    
    if (sortBars === 'alphabetical') {
      return [...categories].sort((a, b) => String(a).localeCompare(String(b)));
    }

    // For ascending/descending, sort by Y values
    const categoryTotals = this.calculateCategoryTotals(categories, allCategories, yColumn);
    
    return [...categories].sort((a, b) => {
      const diff = categoryTotals[a] - categoryTotals[b];
      return sortBars === 'ascending' ? diff : -diff;
    });
  }

  private generateTraces(df: any): any[] {
    const traces: any[] = [];
    const { xColumn, yColumns } = this.data;
    
    const categories = df.getColumn(xColumn!).toArray();
    const isHorizontal = this.barOptions.orientation === 'horizontal';

    // Generate color mapping
    const colorMapping = this.generateColorMapping(categories);

    for (let i = 0; i < yColumns.length; i++) {
      const yColumn = yColumns[i];
      const values = df.getColumn(yColumn).toArray();
      
      const trace: any = {
        type: 'bar',
        name: this.formatColumnName(yColumn),
        orientation: isHorizontal ? 'h' : 'v',
        opacity: this.barOptions.opacity,
        marker: {
          color: this.getBarColors(categories, i),
          line: {
            color: this.config.colors.background_color,
            width: 1
          }
        },
        hovertemplate: this.getHoverTemplate(yColumn, isHorizontal),
        text: this.barOptions.showValues ? values.map(v => this.formatValue(v, yColumn)) : undefined,
        textposition: isHorizontal ? 'inside' : 'outside',
        textfont: {
          color: this.config.fonts.tick.color,
          size: this.config.fonts.tick.size
        }
      };

      if (isHorizontal) {
        trace.x = values;
        trace.y = categories;
      } else {
        trace.x = categories;
        trace.y = values;
      }

      // Adjust bar width and spacing
      if (yColumns.length === 1) {
        trace.width = this.barOptions.barWidth;
      } else {
        trace.offsetgroup = i;
        trace.width = this.barOptions.barWidth! / yColumns.length;
      }

      traces.push(trace);
    }

    return traces;
  }

  private generateColorMapping(categories: any[]): Record<string, string> {
    if (this.barOptions.singleColor) {
      const colorMap: Record<string, string> = {};
      for (const category of categories) {
        colorMap[category] = this.barOptions.singleColor;
      }
      return colorMap;
    }

    if (this.barOptions.colorByCategory) {
      return generateColorMapping(categories, 'categorical');
    }

    // Default to primary color
    const colorMap: Record<string, string> = {};
    for (const category of categories) {
      colorMap[category] = this.config.colors.primary;
    }
    return colorMap;
  }

  private getBarColors(categories: any[], seriesIndex: number): string | string[] {
    if (this.barOptions.singleColor) {
      return this.barOptions.singleColor;
    }

    if (this.barOptions.colorByCategory) {
      const colorMapping = generateColorMapping(categories, 'categorical');
      return categories.map(cat => colorMapping[String(cat)]);
    }

    // Use different shades for multiple series
    const baseColor = this.config.colors.primary;
    if (this.data.yColumns.length === 1) {
      return baseColor;
    }

    // Use default palette for multiple series
    const colors = this.config.colors.default_palette;
    return colors[seriesIndex % colors.length];
  }

  private getHoverTemplate(columnName: string, isHorizontal: boolean): string {
    const xLabel = this.data.xColumn || 'Category';
    const ySuffix = this.scaleInfo[columnName]?.suffix || '';
    
    let template = `<b>%{fullData.name}</b><br>`;
    
    if (isHorizontal) {
      template += `${xLabel}: %{y}<br>`;
      template += `${columnName}: %{x}${ySuffix}`;
    } else {
      template += `${xLabel}: %{x}<br>`;
      template += `${columnName}: %{y}${ySuffix}`;
    }
    
    template += '<extra></extra>';
    return template;
  }

  private formatValue(value: number, columnName: string): string {
    const suffix = this.scaleInfo[columnName]?.suffix || '';
    const { scale } = this.scaleInfo[columnName] || { scale: 1 };
    
    const scaledValue = value / scale;
    
    if (this.barOptions.valueFormat) {
      // Custom format if provided
      return this.barOptions.valueFormat.replace('{value}', scaledValue.toFixed(1));
    }
    
    // Default formatting
    if (scaledValue >= 1000) {
      return `${(scaledValue / 1000).toFixed(1)}k${suffix}`;
    } else if (scaledValue >= 1) {
      return `${scaledValue.toFixed(1)}${suffix}`;
    } else {
      return `${scaledValue.toFixed(2)}${suffix}`;
    }
  }

  private formatColumnName(columnName: string): string {
    const suffix = this.scaleInfo[columnName]?.suffix;
    return suffix ? `${columnName} (${suffix})` : columnName;
  }

  private generateLayout(df: any) {
    const baseLayout = this.getBaseLayout();
    const isHorizontal = this.barOptions.orientation === 'horizontal';
    
    const categories = df.getColumn(this.data.xColumn!).toArray();
    const values = df.getColumn(this.data.yColumns[0]).toArray();

    // Configure axes based on orientation
    if (isHorizontal) {
      // X-axis (values)
      const xGridParams = calculateYAxisGridParams(values);
      baseLayout.xaxis = {
        ...this.getAxisConfig(values),
        title: {
          text: this.getAxisTitle('y'),
          font: {
            size: this.config.fonts.axis_title.size,
            color: this.config.fonts.axis_title.color
          }
        },
        ...xGridParams
      };

      // Y-axis (categories)
      baseLayout.yaxis = {
        ...this.getAxisConfig([], true),
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
    } else {
      // X-axis (categories)
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

      // Y-axis (values)
      const yGridParams = calculateYAxisGridParams(values);
      baseLayout.yaxis = {
        ...this.getAxisConfig(values, true),
        title: {
          text: this.getAxisTitle('y'),
          font: {
            size: this.config.fonts.axis_title.size,
            color: this.config.fonts.axis_title.color
          }
        },
        ...yGridParams
      };
    }

    // Configure bar spacing
    baseLayout.barmode = this.data.yColumns.length > 1 ? 'group' : 'relative';
    baseLayout.bargap = this.barOptions.barGap;
    baseLayout.bargroupgap = this.barOptions.barGroupGap;

    return baseLayout;
  }

  private getAxisTitle(axis: 'x' | 'y'): string {
    if (axis === 'x') {
      if (this.barOptions.xAxisTitle) return this.barOptions.xAxisTitle;
      return this.data.xColumn || 'Categories';
    } else {
      if (this.barOptions.yAxisTitle) return this.barOptions.yAxisTitle;
      if (this.data.yColumns.length === 1) {
        const column = this.data.yColumns[0];
        const suffix = this.scaleInfo[column]?.suffix;
        return suffix ? `${column} (${suffix})` : column;
      }
      return 'Values';
    }
  }

  // Public methods for chart interaction
  public setOrientation(orientation: 'vertical' | 'horizontal'): void {
    this.barOptions.orientation = orientation;
    this.plotlyConfig = null; // Force regeneration
  }

  public setSorting(sortBars: 'none' | 'ascending' | 'descending' | 'alphabetical'): void {
    this.barOptions.sortBars = sortBars;
    this.processedData = null; // Force data reprocessing
    this.plotlyConfig = null;
  }

  public setColorByCategory(colorByCategory: boolean): void {
    this.barOptions.colorByCategory = colorByCategory;
    this.plotlyConfig = null;
  }

  public setMaxCategories(maxCategories: number, groupOthers: boolean = true): void {
    this.barOptions.maxCategories = maxCategories;
    this.barOptions.groupOthers = groupOthers;
    this.processedData = null; // Force data reprocessing
    this.plotlyConfig = null;
  }

  public showValues(show: boolean, format?: string): void {
    this.barOptions.showValues = show;
    if (format) this.barOptions.valueFormat = format;
    this.plotlyConfig = null;
  }

  public getProcessedCategories(): any[] {
    if (!this.processedData) {
      this.processedData = this.prepareBarData();
    }
    return this.processedData.getColumn(this.data.xColumn!).toArray();
  }

  public getScaleInfo(): ScaleInfo {
    return this.scaleInfo;
  }
}