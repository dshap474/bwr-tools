// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Chart Utilities                                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame, ColumnType, detectDateColumns } from '../../lib';

export interface DataValidationOptions {
  requiredColumns?: string[];
  minRows?: number;
  allowMissingData?: boolean;
  maxMissingPercent?: number;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingDataInfo: Record<string, { count: number; percent: number }>;
}

export interface DetectedDataTypes {
  xType: 'numeric' | 'categorical' | 'datetime';
  yTypes: ('numeric' | 'categorical' | 'datetime')[];
  hasNumericX: boolean;
  hasNumericY: boolean;
  hasDatetimeX: boolean;
  hasDatetimeY: boolean;
  recommendedChartTypes: string[];
}

export interface ColorPalette {
  primary: string[];
  sequential: string[];
  diverging: string[];
  categorical: string[];
}

export const BWR_COLOR_PALETTES: ColorPalette = {
  primary: [
    '#5637cd', '#8b5fbf', '#b575a5', '#d18b8b', '#e8a071', 
    '#f5b357', '#ffc53d', '#ffd700', '#ffe135', '#ffeb6b'
  ],
  sequential: [
    '#1a1a1a', '#2d2d2d', '#404040', '#535353', '#666666',
    '#797979', '#8c8c8c', '#9f9f9f', '#b2b2b2', '#cccccc'
  ],
  diverging: [
    '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
    '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'
  ],
  categorical: [
    '#5637cd', '#e74c3c', '#f39c12', '#27ae60', '#3498db',
    '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#f1c40f'
  ]
};

/**
 * Validate chart data for completeness and quality
 */
export function validateChartData(
  df: DataFrame, 
  options: DataValidationOptions = {}
): DataValidationResult {
  const {
    requiredColumns = [],
    minRows = 1,
    allowMissingData = true,
    maxMissingPercent = 50
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const missingDataInfo: Record<string, { count: number; percent: number }> = {};

  // Check if DataFrame is empty
  if (df.empty || df.shape[0] === 0) {
    errors.push('DataFrame is empty');
    return { isValid: false, errors, warnings, missingDataInfo };
  }

  // Check minimum rows
  if (df.shape[0] < minRows) {
    errors.push(`DataFrame has ${df.shape[0]} rows, minimum required: ${minRows}`);
  }

  // Check required columns exist
  const missingColumns = requiredColumns.filter(col => !df.columns.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Check for missing data in each column
  for (const column of df.columns) {
    const series = df.getColumn(column);
    const nullMask = series.isna();
    const nullCount = nullMask.filter(Boolean).length;
    const nullPercent = (nullCount / series.length) * 100;

    if (nullCount > 0) {
      missingDataInfo[column] = { count: nullCount, percent: nullPercent };

      if (nullPercent > maxMissingPercent) {
        if (allowMissingData) {
          warnings.push(`Column '${column}' has ${nullPercent.toFixed(1)}% missing data`);
        } else {
          errors.push(`Column '${column}' has ${nullPercent.toFixed(1)}% missing data (max allowed: ${maxMissingPercent}%)`);
        }
      }
    }
  }

  // Check for columns with all identical values
  for (const column of df.columns) {
    const series = df.getColumn(column);
    const uniqueValues = new Set(series.toArray().filter(v => v != null));
    
    if (uniqueValues.size === 1) {
      warnings.push(`Column '${column}' has only one unique value`);
    }
  }

  // Check data types are appropriate
  for (const column of requiredColumns) {
    if (df.columns.includes(column)) {
      const dtype = df.dtypes[column];
      if (dtype === ColumnType.STRING && requiredColumns.length > 1) {
        warnings.push(`Column '${column}' is text data - verify this is intended for plotting`);
      }
    }
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings, missingDataInfo };
}

/**
 * Detect data types for chart plotting
 */
export function detectDataTypes(
  df: DataFrame, 
  xColumn?: string, 
  yColumns: string[] = []
): DetectedDataTypes {
  const xType = xColumn ? getColumnDataType(df, xColumn) : 'numeric';
  const yTypes = yColumns.map(col => getColumnDataType(df, col));

  const hasNumericX = xType === 'numeric';
  const hasNumericY = yTypes.includes('numeric');
  const hasDatetimeX = xType === 'datetime';
  const hasDatetimeY = yTypes.includes('datetime');

  const recommendedChartTypes = getRecommendedChartTypes(xType, yTypes, df.shape[0]);

  return {
    xType,
    yTypes,
    hasNumericX,
    hasNumericY,
    hasDatetimeX,
    hasDatetimeY,
    recommendedChartTypes
  };
}

function getColumnDataType(df: DataFrame, columnName: string): 'numeric' | 'categorical' | 'datetime' {
  if (!df.columns.includes(columnName)) {
    return 'categorical';
  }

  const dtype = df.dtypes[columnName];
  
  // Check if it's a date column
  if (dtype === ColumnType.DATE || detectDateColumns(df).includes(columnName)) {
    return 'datetime';
  }

  // Check if it's numeric
  if (dtype === ColumnType.INTEGER || dtype === ColumnType.FLOAT) {
    return 'numeric';
  }

  // Check if string column has numeric values
  if (dtype === ColumnType.STRING) {
    const series = df.getColumn(columnName);
    const sample = series.head(100).toArray();
    const numericCount = sample.filter(val => 
      val != null && !isNaN(Number(val))
    ).length;
    
    if (numericCount / sample.length > 0.8) {
      return 'numeric';
    }
  }

  return 'categorical';
}

function getRecommendedChartTypes(
  xType: string, 
  yTypes: string[], 
  rowCount: number
): string[] {
  const recommendations: string[] = [];

  // Based on data types and size, suggest appropriate chart types
  if (xType === 'datetime' && yTypes.every(t => t === 'numeric')) {
    recommendations.push('line', 'scatter');
  }

  if (xType === 'numeric' && yTypes.every(t => t === 'numeric')) {
    recommendations.push('scatter');
    if (rowCount > 100) {
      recommendations.push('hexbin', 'density');
    }
  }

  if (xType === 'categorical' && yTypes.every(t => t === 'numeric')) {
    recommendations.push('bar', 'box', 'violin');
  }

  if (yTypes.length > 1) {
    recommendations.push('multi-line', 'dual-axis');
  }

  if (rowCount > 10000) {
    recommendations.push('aggregated', 'sampled');
  }

  return recommendations.length > 0 ? recommendations : ['scatter'];
}

/**
 * Get appropriate color palette for data
 */
export function getColorPalette(
  type: 'primary' | 'sequential' | 'diverging' | 'categorical' = 'primary',
  count: number = 10
): string[] {
  const palette = BWR_COLOR_PALETTES[type];
  
  if (count <= palette.length) {
    return palette.slice(0, count);
  }

  // If we need more colors than available, interpolate or repeat
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  
  return colors;
}

/**
 * Generate color mapping for categorical data
 */
export function generateColorMapping(
  values: any[], 
  paletteType: 'primary' | 'categorical' = 'categorical'
): Record<string, string> {
  const uniqueValues = Array.from(new Set(values.filter(v => v != null)));
  const colors = getColorPalette(paletteType, uniqueValues.length);
  
  const mapping: Record<string, string> = {};
  uniqueValues.forEach((value, index) => {
    mapping[String(value)] = colors[index];
  });
  
  return mapping;
}

/**
 * Calculate appropriate bin count for histograms
 */
export function calculateOptimalBins(data: number[]): number {
  const n = data.length;
  
  if (n < 10) return Math.max(3, n);
  
  // Use Sturges' rule as a starting point
  const sturges = Math.ceil(Math.log2(n) + 1);
  
  // Use Scott's rule for better results with normal-ish data
  const std = calculateStandardDeviation(data);
  const range = Math.max(...data) - Math.min(...data);
  const scott = Math.ceil(range / (3.5 * std / Math.cbrt(n)));
  
  // Use the smaller of the two, bounded by reasonable limits
  return Math.max(5, Math.min(50, Math.min(sturges, scott)));
}

function calculateStandardDeviation(data: number[]): number {
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

/**
 * Format large numbers for display
 */
export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  
  if (abs >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  } else if (abs >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  } else if (abs >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  
  return value.toString();
}

/**
 * Check if data needs aggregation due to size
 */
export function shouldAggregateData(rowCount: number, chartType: string): boolean {
  const thresholds: Record<string, number> = {
    scatter: 10000,
    line: 50000,
    bar: 1000,
    histogram: 100000
  };
  
  return rowCount > (thresholds[chartType] || 10000);
}

/**
 * Simple data aggregation for large datasets
 */
export function aggregateData(
  df: DataFrame, 
  xColumn: string, 
  yColumn: string, 
  method: 'mean' | 'sum' | 'count' = 'mean',
  bins: number = 100
): DataFrame {
  // This is a simplified aggregation - a full implementation would use proper binning
  const xSeries = df.getColumn(xColumn);
  const ySeries = df.getColumn(yColumn);
  
  // For now, just sample the data
  const step = Math.ceil(df.shape[0] / bins);
  const aggregatedData: Record<string, any[]> = {
    [xColumn]: [],
    [yColumn]: []
  };
  
  for (let i = 0; i < df.shape[0]; i += step) {
    aggregatedData[xColumn].push(xSeries.iloc(i));
    aggregatedData[yColumn].push(ySeries.iloc(i));
  }
  
  return new DataFrame(aggregatedData);
}

/**
 * Check if array contains numeric data
 */
export function isNumericData(data: any[]): boolean {
  if (data.length === 0) return false;
  
  // Sample up to 100 values to check
  const sample = data.slice(0, 100);
  const numericCount = sample.filter(val => {
    if (val == null) return false;
    
    // Check if it's already a number
    if (typeof val === 'number' && !isNaN(val)) return true;
    
    // Check if string can be converted to number
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return false;
      return !isNaN(Number(trimmed));
    }
    
    return false;
  }).length;
  
  // Consider numeric if >80% of sampled values are numeric
  return numericCount / sample.length > 0.8;
}