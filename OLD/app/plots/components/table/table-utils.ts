// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Table Chart Utilities                                                               │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../../lib';

export interface TableData {
  header: {
    values: string[];
    fill?: { color: string };
    font?: { size: number; color: string; family?: string };
    align?: string;
    line?: { color: string; width: number };
    height?: number;
  };
  cells: {
    values: string[][];
    fill?: { color: string[] };
    font?: { size: number; color: string; family?: string };
    align?: string;
    line?: { color: string; width: number };
    height?: number;
  };
}

export interface TableFormatOptions {
  headerFillColor?: string;
  cellFillColorEven?: string;
  cellFillColorOdd?: string;
  lineColor?: string;
  cellHeight?: number;
  headerFontSize?: number;
  cellFontSize?: number;
  headerFontColor?: string;
  cellFontColor?: string;
  fontFamily?: string;
  maxRows?: number;
  formatters?: Record<string, (value: any) => string>;
}

/**
 * Convert DataFrame to Plotly table format
 * Matches Python .astype(str).tolist() behavior exactly
 * @param dataframe Source DataFrame
 * @param options Formatting options
 * @returns Table data structure for Plotly
 */
export function convertDataFrameToTable(
  dataframe: DataFrame, 
  options: TableFormatOptions = {}
): TableData {
  // Apply row limit if specified
  let workingDf = dataframe;
  if (options.maxRows && dataframe.shape[0] > options.maxRows) {
    // Take first N rows
    const limitedData: Record<string, any[]> = {};
    for (const col of dataframe.columns) {
      limitedData[col] = dataframe.getColumn(col).toArray().slice(0, options.maxRows);
    }
    workingDf = new DataFrame(limitedData);
  }
  
  // Convert header values to strings
  const headerValues = workingDf.columns.map(col => String(col));
  
  // Convert cell values to strings (matching Python .astype(str).tolist())
  const cellValues: string[][] = [];
  
  for (const col of workingDf.columns) {
    const columnData = workingDf.getColumn(col).toArray();
    const stringData = columnData.map(value => formatTableCell(value, options.formatters?.[col]));
    cellValues.push(stringData);
  }
  
  // Generate fill colors for alternating rows
  const fillColors = generateTableFillColors(
    workingDf.shape[0],
    options.cellFillColorEven || '#1A1A1A',
    options.cellFillColorOdd || '#1A1A1A'
  );
  
  // Build table data structure
  const tableData: TableData = {
    header: {
      values: headerValues,
      fill: { color: options.headerFillColor || '#2a2a2a' },
      font: {
        size: options.headerFontSize || 24,
        color: options.headerFontColor || '#ededed',
        family: options.fontFamily || 'Maison Neue, Arial, sans-serif'
      },
      align: 'left',
      line: { color: options.lineColor || '#404040', width: 1 },
      height: options.cellHeight || 60
    },
    cells: {
      values: cellValues,
      fill: { color: fillColors },
      font: {
        size: options.cellFontSize || 20,
        color: options.cellFontColor || '#ededed',
        family: options.fontFamily || 'Maison Neue, Arial, sans-serif'
      },
      align: 'left',
      line: { color: options.lineColor || '#404040', width: 1 },
      height: options.cellHeight || 60
    }
  };
  
  return tableData;
}

/**
 * Format table cell value to string
 * Handles null/undefined values and applies custom formatters
 * @param value Cell value
 * @param formatter Optional custom formatter function
 * @returns Formatted string value
 */
export function formatTableCell(
  value: any, 
  formatter?: (value: any) => string
): string {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return '';
  }
  
  // Apply custom formatter if provided
  if (formatter) {
    try {
      return formatter(value);
    } catch (error) {
      console.warn('Custom formatter failed, falling back to string conversion:', error);
    }
  }
  
  // Convert to string (matching Python's .astype(str) behavior)
  return String(value);
}

/**
 * Generate alternating fill colors for table rows
 * Follows Python pattern: even index (0, 2, 4...) gets even color
 * @param numRows Number of rows
 * @param evenColor Color for even-indexed rows (0, 2, 4...)
 * @param oddColor Color for odd-indexed rows (1, 3, 5...)
 * @returns Array of colors for each row
 */
export function generateTableFillColors(
  numRows: number, 
  evenColor: string, 
  oddColor: string
): string[] {
  return Array.from({ length: numRows }, (_, index) => 
    index % 2 === 0 ? evenColor : oddColor
  );
}

/**
 * Calculate optimal column widths based on content
 * @param dataframe Source DataFrame
 * @param maxWidth Maximum total width
 * @returns Map of column names to widths
 */
export function calculateOptimalColumnWidths(
  dataframe: DataFrame, 
  maxWidth: number = 1200
): Record<string, number> {
  const columnWidths: Record<string, number> = {};
  const numColumns = dataframe.columns.length;
  
  if (numColumns === 0) {
    return columnWidths;
  }
  
  // Calculate content lengths for each column
  const contentLengths: Record<string, number> = {};
  
  for (const col of dataframe.columns) {
    // Consider header length
    let maxLength = String(col).length;
    
    // Consider cell content lengths (sample first 100 rows for performance)
    const values = dataframe.getColumn(col).toArray();
    const sampleSize = Math.min(100, values.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const cellLength = String(values[i] || '').length;
      maxLength = Math.max(maxLength, cellLength);
    }
    
    contentLengths[col] = maxLength;
  }
  
  // Calculate total content length
  const totalContentLength = Object.values(contentLengths).reduce((sum, len) => sum + len, 0);
  
  // Distribute width proportionally, with minimum and maximum constraints
  const minColumnWidth = 80;
  const maxColumnWidth = maxWidth / 2;
  
  for (const col of dataframe.columns) {
    const proportionalWidth = (contentLengths[col] / totalContentLength) * maxWidth;
    const constrainedWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, proportionalWidth));
    columnWidths[col] = Math.round(constrainedWidth);
  }
  
  return columnWidths;
}

/**
 * Validate data for table chart
 * @param dataframe Source DataFrame
 * @returns Validation result
 */
export function validateTableData(dataframe: DataFrame): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check if DataFrame is empty
  if (dataframe.shape[0] === 0) {
    warnings.push('DataFrame is empty - table will have no rows');
    return { isValid: true, warnings, errors };
  }
  
  if (dataframe.columns.length === 0) {
    errors.push('DataFrame has no columns');
    return { isValid: false, warnings, errors };
  }
  
  // Check for very wide tables
  if (dataframe.columns.length > 10) {
    warnings.push(`Table has ${dataframe.columns.length} columns - consider limiting for better display`);
  }
  
  // Check for very long tables
  if (dataframe.shape[0] > 1000) {
    warnings.push(`Table has ${dataframe.shape[0]} rows - consider pagination for better performance`);
  }
  
  // Check for duplicate column names
  const uniqueColumns = new Set(dataframe.columns);
  if (uniqueColumns.size !== dataframe.columns.length) {
    errors.push('DataFrame has duplicate column names');
  }
  
  return { isValid: errors.length === 0, warnings, errors };
}

/**
 * Create default formatters for common data types
 * @returns Map of column patterns to formatters
 */
export function getDefaultFormatters(): Record<string, (value: any) => string> {
  return {
    // Numeric formatters
    price: (value: any) => {
      if (typeof value === 'number') {
        return `$${value.toFixed(2)}`;
      }
      return String(value);
    },
    
    percentage: (value: any) => {
      if (typeof value === 'number') {
        return `${(value * 100).toFixed(1)}%`;
      }
      return String(value);
    },
    
    currency: (value: any) => {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      }
      return String(value);
    },
    
    // Date formatters
    date: (value: any) => {
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return new Date(value).toLocaleDateString();
      }
      return String(value);
    },
    
    datetime: (value: any) => {
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return new Date(value).toLocaleString();
      }
      return String(value);
    },
    
    // Numeric precision
    decimal: (value: any) => {
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return String(value);
    },
    
    integer: (value: any) => {
      if (typeof value === 'number') {
        return Math.round(value).toString();
      }
      return String(value);
    }
  };
}

/**
 * Apply formatters based on column name patterns
 * @param dataframe Source DataFrame
 * @param customFormatters Custom formatters to add/override
 * @returns Map of column names to formatters
 */
export function inferColumnFormatters(
  dataframe: DataFrame,
  customFormatters: Record<string, (value: any) => string> = {}
): Record<string, (value: any) => string> {
  const formatters: Record<string, (value: any) => string> = { ...customFormatters };
  const defaultFormatters = getDefaultFormatters();
  
  for (const col of dataframe.columns) {
    // Skip if custom formatter already provided
    if (formatters[col]) {
      continue;
    }
    
    const colLower = col.toLowerCase();
    
    // Infer formatters based on column name patterns
    if (colLower.includes('price') || colLower.includes('cost') || colLower.includes('amount')) {
      formatters[col] = defaultFormatters.currency;
    } else if (colLower.includes('percent') || colLower.includes('%')) {
      formatters[col] = defaultFormatters.percentage;
    } else if (colLower.includes('date') && !colLower.includes('time')) {
      formatters[col] = defaultFormatters.date;
    } else if (colLower.includes('datetime') || colLower.includes('timestamp')) {
      formatters[col] = defaultFormatters.datetime;
    } else {
      // Analyze data type from sample values
      const values = dataframe.getColumn(col).toArray();
      const sampleValues = values.slice(0, 10).filter(v => v !== null && v !== undefined);
      
      if (sampleValues.length > 0) {
        const firstValue = sampleValues[0];
        
        if (typeof firstValue === 'number') {
          // Check if all sampled numbers are integers
          const allIntegers = sampleValues.every(v => 
            typeof v === 'number' && Number.isInteger(v)
          );
          
          if (allIntegers) {
            formatters[col] = defaultFormatters.integer;
          } else {
            formatters[col] = defaultFormatters.decimal;
          }
        }
      }
    }
  }
  
  return formatters;
}