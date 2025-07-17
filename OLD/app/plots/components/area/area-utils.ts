// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Area Chart Utilities                                                                │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../../lib';

/**
 * Sort columns by their last row values (matching Python implementation)
 * This is critical for consistent color assignment in metric share area charts
 * @param dataframe Source DataFrame
 * @param columns Columns to sort
 * @param ascending Sort order (default: false for descending)
 * @returns Sorted column names
 */
export function sortColumnsByLastRow(
  dataframe: DataFrame, 
  columns: string[], 
  ascending: boolean = false
): string[] {
  if (dataframe.shape[0] === 0) {
    return [...columns];
  }
  
  const lastRowIndex = dataframe.shape[0] - 1;
  const lastRowValues: Record<string, number> = {};
  
  // Extract last row values for each column
  for (const col of columns) {
    const values = dataframe.getColumn(col).toArray();
    lastRowValues[col] = values[lastRowIndex] || 0;
  }
  
  // Sort columns by last row values
  return [...columns].sort((a, b) => {
    const diff = lastRowValues[a] - lastRowValues[b];
    return ascending ? diff : -diff;
  });
}

/**
 * Normalize data so each row sums to 1.0 (100%)
 * Critical for metric share area charts - matches Python pandas behavior
 * @param dataframe Source DataFrame
 * @param columns Numeric columns to normalize
 * @returns New DataFrame with normalized data
 */
export function normalizeToPercentages(
  dataframe: DataFrame, 
  columns: string[]
): DataFrame {
  const normalizedData: Record<string, any[]> = {};
  
  // Copy non-numeric columns unchanged
  for (const col of dataframe.columns) {
    if (!columns.includes(col)) {
      normalizedData[col] = dataframe.getColumn(col).toArray();
    }
  }
  
  // Initialize normalized column arrays
  for (const col of columns) {
    normalizedData[col] = [];
  }
  
  // Process each row
  for (let rowIndex = 0; rowIndex < dataframe.shape[0]; rowIndex++) {
    // Calculate row sum
    let rowSum = 0;
    const rowValues: Record<string, number> = {};
    
    for (const col of columns) {
      const value = dataframe.getColumn(col).toArray()[rowIndex];
      const numericValue = typeof value === 'number' ? value : 0;
      rowValues[col] = numericValue;
      rowSum += numericValue;
    }
    
    // Normalize values (avoid division by zero)
    const safeDivisor = rowSum === 0 ? 1 : rowSum;
    for (const col of columns) {
      const normalizedValue = rowValues[col] / safeDivisor;
      normalizedData[col].push(normalizedValue);
    }
  }
  
  return new DataFrame(normalizedData);
}

/**
 * Apply rolling mean smoothing to specified columns
 * @param dataframe Source DataFrame
 * @param columns Columns to smooth
 * @param window Rolling window size
 * @returns New DataFrame with smoothed data
 */
export function applyRollingMean(
  dataframe: DataFrame, 
  columns: string[], 
  window: number
): DataFrame {
  if (window <= 1) {
    return dataframe;
  }
  
  const smoothedData: Record<string, any[]> = {};
  
  // Copy non-numeric columns unchanged
  for (const col of dataframe.columns) {
    if (!columns.includes(col)) {
      smoothedData[col] = dataframe.getColumn(col).toArray();
    }
  }
  
  // Apply rolling mean to specified columns
  for (const col of columns) {
    const values = dataframe.getColumn(col).toArray();
    const smoothedValues: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      // Calculate window bounds
      const windowStart = Math.max(0, i - Math.floor(window / 2));
      const windowEnd = Math.min(values.length, windowStart + window);
      const actualWindowStart = Math.max(0, windowEnd - window);
      
      // Calculate mean for current window
      let sum = 0;
      let count = 0;
      
      for (let j = actualWindowStart; j < windowEnd; j++) {
        const value = values[j];
        if (typeof value === 'number' && !isNaN(value)) {
          sum += value;
          count++;
        }
      }
      
      smoothedValues.push(count > 0 ? sum / count : 0);
    }
    
    smoothedData[col] = smoothedValues;
  }
  
  return new DataFrame(smoothedData);
}

/**
 * Generate area trace for Plotly with proper stacking configuration
 * @param xData X-axis data (usually dates)
 * @param yData Y-axis data (normalized percentages)
 * @param name Series name
 * @param color Fill color
 * @param showlegend Whether to show in legend (false for area trace)
 * @returns Plotly trace configuration
 */
export function generateAreaTrace(
  xData: any[], 
  yData: number[], 
  name: string, 
  color: string, 
  showlegend: boolean = false
): any {
  return {
    type: 'scatter',
    mode: 'lines',
    x: xData,
    y: yData,
    name: name,
    fill: 'tonexty',
    stackgroup: 'one', // Critical for proper stacking
    line: {
      width: 0,
      color: color
    },
    fillcolor: color,
    hovertemplate: formatPercentageHover('%{y}', name),
    showlegend: showlegend,
    // Hide markers for cleaner area display
    marker: {
      size: 0,
      opacity: 0
    }
  };
}

/**
 * Generate legend trace (circle marker) for area charts
 * Following Python implementation pattern
 * @param name Series name
 * @param color Marker color
 * @returns Plotly legend trace
 */
export function generateAreaLegendTrace(name: string, color: string): any {
  return {
    type: 'scatter',
    x: [null],
    y: [null],
    name: name,
    mode: 'markers',
    marker: {
      symbol: 'circle',
      size: 12,
      color: color
    },
    showlegend: true,
    hoverinfo: 'skip'
  };
}

/**
 * Format percentage hover template
 * @param value Hover value placeholder (e.g., '%{y}')
 * @param columnName Column name for extra info
 * @returns Formatted hover template
 */
export function formatPercentageHover(value: string, columnName: string): string {
  // Convert to percentage and show column name in extra box
  const percentage = (parseFloat(value) * 100).toFixed(1);
  return `${percentage}%<extra>${columnName}</extra>`;
}

/**
 * Calculate optimal Y-axis configuration for percentage data
 * Always uses 0-100% range with 20% intervals
 * @returns Y-axis configuration object
 */
export function getPercentageYAxisConfig(): any {
  return {
    range: [0, 1],
    tickformat: '.0%',
    dtick: 0.2,
    tick0: 0.0,
    showgrid: true,
    gridcolor: 'rgb(38, 38, 38)', // BWR grid color
    zeroline: false
  };
}

/**
 * Validate data for metric share area chart
 * @param dataframe Source DataFrame
 * @param xColumn X-axis column (should be date/time)
 * @param yColumns Y-axis columns (should be numeric)
 * @returns Validation result with warnings
 */
export function validateMetricShareAreaData(
  dataframe: DataFrame,
  xColumn: string,
  yColumns: string[]
): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check if DataFrame is empty
  if (dataframe.shape[0] === 0) {
    errors.push('DataFrame is empty');
    return { isValid: false, warnings, errors };
  }
  
  // Check if required columns exist
  if (!dataframe.columns.includes(xColumn)) {
    errors.push(`X column '${xColumn}' not found in DataFrame`);
  }
  
  for (const yCol of yColumns) {
    if (!dataframe.columns.includes(yCol)) {
      errors.push(`Y column '${yCol}' not found in DataFrame`);
    }
  }
  
  if (errors.length > 0) {
    return { isValid: false, warnings, errors };
  }
  
  // Check Y columns are numeric
  for (const yCol of yColumns) {
    const values = dataframe.getColumn(yCol).toArray();
    const hasNonNumeric = values.some(val => 
      val !== null && val !== undefined && typeof val !== 'number'
    );
    
    if (hasNonNumeric) {
      warnings.push(`Column '${yCol}' contains non-numeric values`);
    }
  }
  
  // Check for negative values (unusual in share data)
  for (const yCol of yColumns) {
    const values = dataframe.getColumn(yCol).toArray();
    const hasNegative = values.some(val => 
      typeof val === 'number' && val < 0
    );
    
    if (hasNegative) {
      warnings.push(`Column '${yCol}' contains negative values`);
    }
  }
  
  // Check for rows that sum to zero (will cause normalization issues)
  let zeroSumRows = 0;
  for (let i = 0; i < dataframe.shape[0]; i++) {
    let rowSum = 0;
    for (const yCol of yColumns) {
      const value = dataframe.getColumn(yCol).toArray()[i];
      if (typeof value === 'number') {
        rowSum += value;
      }
    }
    if (rowSum === 0) {
      zeroSumRows++;
    }
  }
  
  if (zeroSumRows > 0) {
    warnings.push(`${zeroSumRows} rows have zero sum (will be normalized to equal shares)`);
  }
  
  return { isValid: true, warnings, errors };
}

/**
 * Generate colors for area chart series
 * @param seriesNames Array of series names
 * @param defaultPalette Color palette
 * @param colorOverrides Optional color overrides
 * @returns Map of series names to colors
 */
export function generateAreaColors(
  seriesNames: string[],
  defaultPalette: string[],
  colorOverrides?: Record<string, string>
): Record<string, string> {
  const colors: Record<string, string> = {};
  
  for (let i = 0; i < seriesNames.length; i++) {
    const seriesName = seriesNames[i];
    
    if (colorOverrides && colorOverrides[seriesName]) {
      colors[seriesName] = colorOverrides[seriesName];
    } else {
      colors[seriesName] = defaultPalette[i % defaultPalette.length];
    }
  }
  
  return colors;
}