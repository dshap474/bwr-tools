// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Table Chart Implementation                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BaseChart, ChartData, ChartOptions } from '../base/BaseChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { ScaleInfo } from '../../lib';
import {
  convertDataFrameToTable,
  validateTableData,
  calculateOptimalColumnWidths,
  inferColumnFormatters,
  TableFormatOptions
} from './table-utils';

export interface TableChartOptions extends ChartOptions {
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
}

export class TableChart extends BaseChart {
  private tableOptions: TableChartOptions;
  private processedData: any = null;
  private computedFormatters: Record<string, (value: any) => string> = {};
  private computedColumnWidths: Record<string, number> = {};

  constructor(data: ChartData, options: TableChartOptions = {}) {
    // Table chart uses entire DataFrame - no specific column requirements
    if (!data.dataframe || data.dataframe.shape[0] === 0) {
      console.warn('Table chart received empty DataFrame');
    }

    super(data, options);
    
    this.tableOptions = {
      // BWR theme table colors (matching Python configuration)
      headerFillColor: '#2a2a2a',
      cellFillColorEven: '#1A1A1A',
      cellFillColorOdd: '#1A1A1A',
      lineColor: '#404040',
      cellHeight: 60,
      
      // BWR theme fonts (matching exact values)
      headerFontSize: 24,
      cellFontSize: 20,
      headerFontColor: '#ededed',
      cellFontColor: '#ededed',
      fontFamily: 'Maison Neue, Arial, sans-serif',
      
      // Data processing
      maxRows: 1000, // Reasonable default for performance
      autoInferFormatters: true,
      
      // Layout
      tableWidth: 1200,
      tableHeight: 800,
      
      ...options
    };

    this.validateTableData();
  }

  private validateTableData(): void {
    const { dataframe } = this.data;
    
    // Use comprehensive validation from utils
    const validation = validateTableData(dataframe);
    
    if (!validation.isValid) {
      throw new Error(`Invalid data for table chart: ${validation.errors.join(', ')}`);
    }
    
    // Log warnings but don't fail
    if (validation.warnings.length > 0) {
      console.warn('Table chart warnings:', validation.warnings);
    }
  }

  protected generatePlotlyConfig(): BWRPlotSpec {
    // Process and prepare data
    this.processedData = this.prepareTableData();
    
    // Generate table trace
    const traces = this.generateTraces(this.processedData);

    // Generate layout
    const layout = this.generateLayout();

    return {
      data: traces,
      layout,
      config: {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: [
          'pan2d', 'lasso2d', 'select2d', 'zoom2d', 'zoomIn2d', 'zoomOut2d',
          'autoScale2d', 'resetScale2d'
        ],
        responsive: true
      }
    };
  }

  private prepareTableData(): any {
    let workingDf = this.data.dataframe;
    
    // Apply row limit if specified
    if (this.tableOptions.maxRows && workingDf.shape[0] > this.tableOptions.maxRows) {
      const limitedData: Record<string, any[]> = {};
      for (const col of workingDf.columns) {
        limitedData[col] = workingDf.getColumn(col).toArray().slice(0, this.tableOptions.maxRows);
      }
      workingDf = workingDf.constructor(limitedData);
    }
    
    // Compute formatters if auto-inference is enabled
    if (this.tableOptions.autoInferFormatters) {
      this.computedFormatters = inferColumnFormatters(
        workingDf,
        this.tableOptions.formatters || {}
      );
    } else {
      this.computedFormatters = this.tableOptions.formatters || {};
    }
    
    // Compute column widths if not provided
    if (!this.tableOptions.columnWidths) {
      this.computedColumnWidths = calculateOptimalColumnWidths(
        workingDf,
        this.tableOptions.tableWidth
      );
    } else {
      this.computedColumnWidths = this.tableOptions.columnWidths;
    }
    
    return workingDf;
  }

  private generateTraces(df: any): any[] {
    // Convert DataFrame to table format
    const formatOptions: TableFormatOptions = {
      headerFillColor: this.tableOptions.headerFillColor,
      cellFillColorEven: this.tableOptions.cellFillColorEven,
      cellFillColorOdd: this.tableOptions.cellFillColorOdd,
      lineColor: this.tableOptions.lineColor,
      cellHeight: this.tableOptions.cellHeight,
      headerFontSize: this.tableOptions.headerFontSize,
      cellFontSize: this.tableOptions.cellFontSize,
      headerFontColor: this.tableOptions.headerFontColor,
      cellFontColor: this.tableOptions.cellFontColor,
      fontFamily: this.tableOptions.fontFamily,
      maxRows: this.tableOptions.maxRows,
      formatters: this.computedFormatters
    };
    
    const tableData = convertDataFrameToTable(df, formatOptions);
    
    // Create Plotly table trace
    const trace = {
      type: 'table',
      header: tableData.header,
      cells: tableData.cells,
      // Apply column widths if computed
      columnwidth: this.getColumnWidthArray(df.columns)
    };
    
    return [trace];
  }

  private getColumnWidthArray(columns: string[]): number[] | undefined {
    if (Object.keys(this.computedColumnWidths).length === 0) {
      return undefined;
    }
    
    // Convert column width mapping to array in column order
    return columns.map(col => this.computedColumnWidths[col] || 100);
  }

  private generateLayout() {
    const baseLayout = this.getBaseLayout();
    
    // Table-specific layout modifications
    return {
      ...baseLayout,
      // Remove axis configurations (tables don't have axes)
      xaxis: { visible: false },
      yaxis: { visible: false },
      
      // Table dimensions
      width: this.tableOptions.tableWidth,
      height: this.tableOptions.tableHeight,
      
      // Margin adjustments for table
      margin: {
        ...baseLayout.margin,
        l: 20,
        r: 20,
        t: baseLayout.margin?.t || 150, // Keep space for title
        b: 20
      },
      
      // No grid or axes for tables
      showlegend: false,
    };
  }

  // Public methods for table interaction
  public setMaxRows(maxRows: number): void {
    this.tableOptions.maxRows = maxRows;
    this.processedData = null; // Force data reprocessing
    this.plotlyConfig = null;
  }

  public setFormatters(formatters: Record<string, (value: any) => string>): void {
    this.tableOptions.formatters = formatters;
    this.computedFormatters = {};
    this.processedData = null; // Force reprocessing
    this.plotlyConfig = null;
  }

  public setColumnWidths(columnWidths: Record<string, number>): void {
    this.tableOptions.columnWidths = columnWidths;
    this.computedColumnWidths = columnWidths;
    this.plotlyConfig = null; // Force regeneration
  }

  public updateColors(colors: {
    headerFillColor?: string;
    cellFillColorEven?: string;
    cellFillColorOdd?: string;
    lineColor?: string;
  }): void {
    Object.assign(this.tableOptions, colors);
    this.processedData = null; // Force reprocessing
    this.plotlyConfig = null;
  }

  public getProcessedData(): any {
    if (!this.processedData) {
      this.processedData = this.prepareTableData();
    }
    return this.processedData;
  }

  public getComputedFormatters(): Record<string, (value: any) => string> {
    return this.computedFormatters;
  }

  public getComputedColumnWidths(): Record<string, number> {
    return this.computedColumnWidths;
  }

  // Override getScaleInfo since tables don't use scaling
  public getScaleInfo(): ScaleInfo {
    return {}; // Tables don't have scale information
  }

  // Get table statistics
  public getTableStats(): {
    totalRows: number;
    totalColumns: number;
    displayedRows: number;
    columnTypes: Record<string, string>;
  } {
    const originalDf = this.data.dataframe;
    const processedDf = this.getProcessedData();
    
    const columnTypes: Record<string, string> = {};
    for (const col of originalDf.columns) {
      const sampleValue = originalDf.getColumn(col).toArray().find(v => v !== null && v !== undefined);
      columnTypes[col] = typeof sampleValue;
    }
    
    return {
      totalRows: originalDf.shape[0],
      totalColumns: originalDf.columns.length,
      displayedRows: processedDf.shape[0],
      columnTypes
    };
  }

  // Export table data for external use
  public exportTableData(): {
    headers: string[];
    rows: string[][];
    metadata: {
      totalRows: number;
      formatters: string[];
      columnWidths: Record<string, number>;
    };
  } {
    const processedDf = this.getProcessedData();
    const formatOptions: TableFormatOptions = {
      formatters: this.computedFormatters,
      maxRows: this.tableOptions.maxRows
    };
    
    const tableData = convertDataFrameToTable(processedDf, formatOptions);
    
    // Convert cell values from column-major to row-major format
    const numRows = tableData.cells.values[0]?.length || 0;
    const numCols = tableData.cells.values.length;
    
    const rows: string[][] = [];
    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
      const row: string[] = [];
      for (let colIndex = 0; colIndex < numCols; colIndex++) {
        row.push(tableData.cells.values[colIndex][rowIndex]);
      }
      rows.push(row);
    }
    
    return {
      headers: tableData.header.values,
      rows,
      metadata: {
        totalRows: this.data.dataframe.shape[0],
        formatters: Object.keys(this.computedFormatters),
        columnWidths: this.computedColumnWidths
      }
    };
  }
}