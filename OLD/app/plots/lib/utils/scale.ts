// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Value Scaling Utilities                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../dataframe/DataFrame';
import { Series } from '../dataframe/Series';
import { isNumericType } from '../dataframe/types';

/**
 * Scale result containing factor and suffix
 */
export interface ScaleResult {
  scale: number;
  suffix: string;
}

/**
 * Scale information for DataFrame columns
 */
export interface ScaleInfo {
  [columnName: string]: ScaleResult;
}

/**
 * Helper function to determine the appropriate scale and suffix for values.
 * Exact port from Python _get_scale_and_suffix function.
 * 
 * @param maxValue Maximum absolute value to determine scale
 * @returns Scale factor and suffix
 */
export function getScaleAndSuffix(maxValue: number): ScaleResult {
  const absMax = isNaN(maxValue) ? 0 : Math.abs(maxValue);
  
  if (absMax >= 1_000_000_000) {
    return { scale: 1_000_000_000, suffix: 'B' };
  } else if (absMax >= 1_000_000) {
    return { scale: 1_000_000, suffix: 'M' };
  } else if (absMax >= 1_000) {
    return { scale: 1_000, suffix: 'K' };
  } else {
    return { scale: 1, suffix: '' };
  }
}

/**
 * Get the maximum absolute value from a numeric array
 * 
 * @param values Array of numeric values
 * @returns Maximum absolute value
 */
export function getMaxAbsValue(values: number[]): number {
  if (values.length === 0) return 0;
  
  let max = 0;
  for (const value of values) {
    if (!isNaN(value)) {
      const abs = Math.abs(value);
      if (abs > max) {
        max = abs;
      }
    }
  }
  
  return max;
}

/**
 * Scale a Series by dividing by scale factor
 * 
 * @param series Input Series (must be numeric)
 * @param scaleInfo Scale information
 * @returns New scaled Series
 */
export function scaleSeries(series: Series, scaleInfo: ScaleResult): Series {
  if (!isNumericType(series.dtype)) {
    throw new Error(`Cannot scale non-numeric series of type ${series.dtype}`);
  }
  
  if (scaleInfo.scale === 1) {
    // No scaling needed
    return series.copy();
  }
  
  const scaledData = series.toArray().map(value => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value / scaleInfo.scale;
    }
    return value;
  });
  
  return new (series.constructor as typeof Series)(
    scaledData,
    series.index,
    series.name,
    series.dtype
  );
}

/**
 * Scale multiple columns in a DataFrame
 * 
 * @param df Input DataFrame
 * @param columns Columns to scale (if not provided, scales all numeric columns)
 * @returns Object with scaled DataFrame and scale information
 */
export function scaleDataFrame(
  df: DataFrame,
  columns?: string[]
): { scaledDf: DataFrame; scaleInfo: ScaleInfo } {
  const targetColumns = columns || df.columns.filter(col => {
    const dtype = df.dtypes[col];
    return isNumericType(dtype);
  });
  
  const scaleInfo: ScaleInfo = {};
  const newData: Record<string, any[]> = {};
  
  // Copy all columns first
  for (const column of df.columns) {
    newData[column] = df.getColumn(column).toArray();
  }
  
  // Scale specified columns
  for (const column of targetColumns) {
    if (!df.columns.includes(column)) {
      throw new Error(`Column '${column}' not found in DataFrame`);
    }
    
    const series = df.getColumn(column);
    if (!isNumericType(series.dtype)) {
      console.warn(`Skipping non-numeric column '${column}' of type ${series.dtype}`);
      continue;
    }
    
    // Find max absolute value in the column
    const values = series.toArray() as number[];
    const maxAbs = getMaxAbsValue(values);
    
    // Determine scale
    const scale = getScaleAndSuffix(maxAbs);
    scaleInfo[column] = scale;
    
    // Scale the data
    if (scale.scale !== 1) {
      const scaledSeries = scaleSeries(series, scale);
      newData[column] = scaledSeries.toArray();
    }
  }
  
  const scaledDf = new DataFrame(newData, {
    index: df.index.toArray(),
    columns: df.columns
  });
  
  return { scaledDf, scaleInfo };
}

/**
 * Auto-scale DataFrame columns based on their maximum values
 * Each column gets its own appropriate scale
 * 
 * @param df Input DataFrame
 * @param columns Columns to scale (if not provided, scales all numeric columns)
 * @returns Object with scaled DataFrame and scale information per column
 */
export function autoScaleDataFrame(
  df: DataFrame,
  columns?: string[]
): { scaledDf: DataFrame; scaleInfo: ScaleInfo } {
  const targetColumns = columns || df.columns.filter(col => {
    const dtype = df.dtypes[col];
    return isNumericType(dtype);
  });
  
  const scaleInfo: ScaleInfo = {};
  const newData: Record<string, any[]> = {};
  
  // Copy all columns first
  for (const column of df.columns) {
    newData[column] = df.getColumn(column).toArray();
  }
  
  // Scale each column individually
  for (const column of targetColumns) {
    if (!df.columns.includes(column)) {
      throw new Error(`Column '${column}' not found in DataFrame`);
    }
    
    const series = df.getColumn(column);
    if (!isNumericType(series.dtype)) {
      console.warn(`Skipping non-numeric column '${column}' of type ${series.dtype}`);
      continue;
    }
    
    // Find max absolute value in this specific column
    const values = series.toArray() as number[];
    const maxAbs = getMaxAbsValue(values);
    
    // Determine scale for this column
    const scale = getScaleAndSuffix(maxAbs);
    scaleInfo[column] = scale;
    
    // Scale the data if needed
    if (scale.scale !== 1) {
      const scaledSeries = scaleSeries(series, scale);
      newData[column] = scaledSeries.toArray();
    }
  }
  
  const scaledDf = new DataFrame(newData, {
    index: df.index.toArray(),
    columns: df.columns
  });
  
  return { scaledDf, scaleInfo };
}

/**
 * Format a number with appropriate scale suffix
 * 
 * @param value Numeric value
 * @param scaleInfo Scale information
 * @param precision Number of decimal places
 * @returns Formatted string with suffix
 */
export function formatWithScale(
  value: number,
  scaleInfo: ScaleResult,
  precision: number = 1
): string {
  if (isNaN(value)) return 'NaN';
  
  const scaledValue = value / scaleInfo.scale;
  const formatted = scaledValue.toFixed(precision);
  
  return scaleInfo.suffix ? `${formatted}${scaleInfo.suffix}` : formatted;
}

/**
 * Create axis tick format string for Plotly
 * 
 * @param scaleInfo Scale information
 * @param precision Number of decimal places
 * @returns Plotly tick format string
 */
export function createTickFormat(
  scaleInfo: ScaleResult,
  precision: number = 1
): string {
  if (scaleInfo.scale === 1) {
    return precision === 0 ? ',.0f' : `,.${precision}f`;
  }
  
  // For scaled values, we'll format the actual values and add suffix in ticksuffix
  return precision === 0 ? ',.0f' : `,.${precision}f`;
}

/**
 * Get tick suffix for Plotly axis
 * 
 * @param scaleInfo Scale information
 * @returns Suffix string for Plotly ticksuffix
 */
export function getTickSuffix(scaleInfo: ScaleResult): string {
  return scaleInfo.suffix;
}

/**
 * Unscale a value back to its original magnitude
 * 
 * @param scaledValue The scaled value
 * @param scaleInfo Scale information used for original scaling
 * @returns Original unscaled value
 */
export function unscaleValue(scaledValue: number, scaleInfo: ScaleResult): number {
  if (isNaN(scaledValue)) return scaledValue;
  return scaledValue * scaleInfo.scale;
}

/**
 * Determine the best common scale for multiple datasets
 * Uses the maximum value across all datasets
 * 
 * @param datasets Array of numeric arrays or Series
 * @returns Common scale information
 */
export function getCommonScale(datasets: (number[] | Series)[]): ScaleResult {
  let globalMax = 0;
  
  for (const dataset of datasets) {
    let values: number[];
    
    if (Array.isArray(dataset)) {
      values = dataset;
    } else {
      values = dataset.toArray() as number[];
    }
    
    const maxAbs = getMaxAbsValue(values);
    if (maxAbs > globalMax) {
      globalMax = maxAbs;
    }
  }
  
  return getScaleAndSuffix(globalMax);
}

/**
 * Apply common scale to multiple Series
 * 
 * @param series Array of Series to scale
 * @param scaleInfo Common scale to apply
 * @returns Array of scaled Series
 */
export function applyCommonScale(series: Series[], scaleInfo: ScaleResult): Series[] {
  return series.map(s => scaleSeries(s, scaleInfo));
}