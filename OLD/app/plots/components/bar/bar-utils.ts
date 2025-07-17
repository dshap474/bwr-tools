// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Bar Chart Utilities                                                                 │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRConfig } from '../../../lib/config';
import { ScaleInfo } from '../../lib';

/**
 * Generate colors for bar chart series
 * @param numSeries Number of series to generate colors for
 * @param config BWR configuration
 * @param colorOverrides Optional color overrides for specific series
 * @returns Array of colors for each series
 */
export function generateBarColors(
  numSeries: number,
  config: BWRConfig,
  colorOverrides?: Record<string, string>
): string[] {
  const palette = config.colors.default_palette;
  const colors: string[] = [];
  
  for (let i = 0; i < numSeries; i++) {
    colors.push(palette[i % palette.length]);
  }
  
  return colors;
}

/**
 * Generate colors for stacked bar chart with reversed priority mapping
 * Following Python implementation where highest value series gets last color
 * @param columnNames Column names in order
 * @param columnSums Map of column names to their sum values
 * @param config BWR configuration
 * @param colorOverrides Optional color overrides
 * @returns Map of column names to colors
 */
export function generateStackedBarColors(
  columnNames: string[],
  columnSums: Record<string, number>,
  config: BWRConfig,
  colorOverrides?: Record<string, string>
): Record<string, string> {
  const palette = config.colors.default_palette;
  const numColorsNeeded = columnNames.length;
  
  // Extend palette if needed
  const extendedPalette: string[] = [];
  for (let i = 0; i < numColorsNeeded; i++) {
    extendedPalette.push(palette[i % palette.length]);
  }
  
  // Sort columns by sum in descending order
  const sortedColumns = [...columnNames].sort((a, b) => 
    (columnSums[b] || 0) - (columnSums[a] || 0)
  );
  
  // Create reversed priority mapping
  // Highest priority (sorted_cols[0]) gets the *last* color index
  const priorityToColorIndex: Record<string, number> = {};
  sortedColumns.forEach((col, i) => {
    priorityToColorIndex[col] = numColorsNeeded - 1 - i;
  });
  
  // Assign colors
  const seriesColors: Record<string, string> = {};
  for (const col of columnNames) {
    if (colorOverrides && col in colorOverrides) {
      seriesColors[col] = colorOverrides[col];
    } else if (col in priorityToColorIndex) {
      const colorIdx = priorityToColorIndex[col];
      seriesColors[col] = extendedPalette[colorIdx];
    } else {
      // Fallback
      seriesColors[col] = extendedPalette[0];
    }
  }
  
  return seriesColors;
}

/**
 * Process categories for bar charts (grouping, sorting, etc.)
 * @param categories Raw categories
 * @param values Values for sorting
 * @param maxCategories Maximum number of categories to show
 * @param groupOthers Whether to group remaining categories as "Others"
 * @param othersLabel Label for grouped categories
 * @param sortMode Sorting mode
 * @returns Processed categories and grouping info
 */
export function processCategories(
  categories: any[],
  values: number[],
  maxCategories?: number,
  groupOthers: boolean = true,
  othersLabel: string = 'Others',
  sortMode: 'none' | 'ascending' | 'descending' | 'alphabetical' = 'none'
): {
  processedCategories: any[];
  categoryMap: Map<any, any>;
  othersIndices?: number[];
} {
  const uniqueCategories = [...new Set(categories)];
  let finalCategories = uniqueCategories;
  let othersIndices: number[] | undefined;
  
  // Calculate totals for each category
  const categoryTotals = new Map<any, number>();
  categories.forEach((cat, idx) => {
    const current = categoryTotals.get(cat) || 0;
    categoryTotals.set(cat, current + (values[idx] || 0));
  });
  
  // Handle max categories
  if (maxCategories && uniqueCategories.length > maxCategories) {
    if (groupOthers) {
      // Sort by total value to keep highest
      const sorted = [...uniqueCategories].sort((a, b) => 
        (categoryTotals.get(b) || 0) - (categoryTotals.get(a) || 0)
      );
      finalCategories = sorted.slice(0, maxCategories - 1);
      finalCategories.push(othersLabel);
      
      // Track which indices belong to "Others"
      othersIndices = [];
      categories.forEach((cat, idx) => {
        if (!finalCategories.slice(0, -1).includes(cat)) {
          othersIndices!.push(idx);
        }
      });
    } else {
      finalCategories = uniqueCategories.slice(0, maxCategories);
    }
  }
  
  // Apply sorting
  if (sortMode !== 'none') {
    const toSort = groupOthers && othersIndices ? 
      finalCategories.slice(0, -1) : finalCategories;
    
    if (sortMode === 'alphabetical') {
      toSort.sort((a, b) => String(a).localeCompare(String(b)));
    } else {
      toSort.sort((a, b) => {
        const diff = (categoryTotals.get(a) || 0) - (categoryTotals.get(b) || 0);
        return sortMode === 'ascending' ? diff : -diff;
      });
    }
    
    finalCategories = groupOthers && othersIndices ? 
      [...toSort, othersLabel] : toSort;
  }
  
  // Create mapping
  const categoryMap = new Map<any, any>();
  categories.forEach((cat, idx) => {
    if (othersIndices && othersIndices.includes(idx)) {
      categoryMap.set(idx, othersLabel);
    } else if (finalCategories.includes(cat)) {
      categoryMap.set(idx, cat);
    }
  });
  
  return {
    processedCategories: finalCategories,
    categoryMap,
    othersIndices
  };
}

/**
 * Create hover template for bar charts
 * @param columnName Column name
 * @param isHorizontal Whether chart is horizontal
 * @param scaleInfo Scale information
 * @param xLabel X-axis label
 * @returns Hover template string
 */
export function createBarHoverTemplate(
  columnName: string,
  isHorizontal: boolean,
  scaleInfo?: ScaleInfo,
  xLabel: string = 'Category'
): string {
  const suffix = scaleInfo?.[columnName]?.suffix || '';
  
  let template = '<b>%{fullData.name}</b><br>';
  
  if (isHorizontal) {
    template += `${xLabel}: %{y}<br>`;
    template += `${columnName}: %{x}${suffix}`;
  } else {
    template += `${xLabel}: %{x}<br>`;
    template += `${columnName}: %{y}${suffix}`;
  }
  
  template += '<extra></extra>';
  return template;
}

/**
 * Format bar value for display
 * @param value Numeric value
 * @param columnName Column name
 * @param scaleInfo Scale information
 * @param customFormat Optional custom format string
 * @returns Formatted value string
 */
export function formatBarValue(
  value: number,
  columnName: string,
  scaleInfo?: ScaleInfo,
  customFormat?: string
): string {
  const suffix = scaleInfo?.[columnName]?.suffix || '';
  const scale = scaleInfo?.[columnName]?.scale || 1;
  
  const scaledValue = value / scale;
  
  if (customFormat) {
    return customFormat.replace('{value}', scaledValue.toFixed(1));
  }
  
  // Default formatting
  if (Math.abs(scaledValue) >= 1000) {
    return `${(scaledValue / 1000).toFixed(1)}k${suffix}`;
  } else if (Math.abs(scaledValue) >= 100) {
    return `${scaledValue.toFixed(0)}${suffix}`;
  } else if (Math.abs(scaledValue) >= 1) {
    return `${scaledValue.toFixed(1)}${suffix}`;
  } else {
    return `${scaledValue.toFixed(2)}${suffix}`;
  }
}

/**
 * Calculate bar spacing parameters
 * @param numBars Number of bars
 * @param numSeries Number of series (for grouped bars)
 * @param barWidth Base bar width (0-1)
 * @param barGap Gap between bars in same group (0-1)
 * @param barGroupGap Gap between groups (0-1)
 * @returns Spacing parameters for Plotly
 */
export function calculateBarSpacing(
  numBars: number,
  numSeries: number = 1,
  barWidth: number = 0.8,
  barGap: number = 0.1,
  barGroupGap: number = 0.2
): {
  width: number;
  bargap: number;
  bargroupgap: number;
} {
  // For single series, use full bar width
  if (numSeries === 1) {
    return {
      width: barWidth,
      bargap: barGap,
      bargroupgap: barGroupGap
    };
  }
  
  // For multiple series, divide width by number of series
  return {
    width: barWidth / numSeries,
    bargap: barGap,
    bargroupgap: barGroupGap
  };
}

/**
 * Get tick frequency settings for X-axis
 * @param numTicks Total number of ticks
 * @param tickFrequency Show every Nth tick
 * @param tickValues Array of tick values
 * @returns Tick configuration for Plotly
 */
export function getTickFrequencySettings(
  numTicks: number,
  tickFrequency: number,
  tickValues: any[]
): {
  tickmode: string;
  tickvals: any[];
  ticktext: string[];
} | null {
  if (tickFrequency <= 1) {
    return null;
  }
  
  const allTicks = Array.from({ length: numTicks }, (_, i) => i);
  const visibleTicks = allTicks.filter(i => i % tickFrequency === 0);
  
  const tickVals = tickValues;
  const tickText = allTicks.map(i => 
    visibleTicks.includes(i) && i < tickValues.length ? 
      String(tickValues[i]) : ''
  );
  
  return {
    tickmode: 'array',
    tickvals: tickVals,
    ticktext: tickText
  };
}

/**
 * Sort DataFrame columns for stacked bar chart
 * @param dataframe DataFrame to process
 * @param columns Columns to sort
 * @param ascending Sort order
 * @returns Sorted column names
 */
export function sortColumnsBySum(
  dataframe: any,
  columns: string[],
  ascending: boolean = false
): string[] {
  const columnSums: Record<string, number> = {};
  
  for (const col of columns) {
    const values = dataframe.getColumn(col).toArray();
    const sum = values.reduce((acc: number, val: number) => acc + (val || 0), 0);
    columnSums[col] = sum;
  }
  
  return [...columns].sort((a, b) => {
    const diff = columnSums[a] - columnSums[b];
    return ascending ? diff : -diff;
  });
}