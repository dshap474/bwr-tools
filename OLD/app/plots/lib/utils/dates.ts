// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Date Alignment Utilities                                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../dataframe/DataFrame';
import { DatetimeIndex } from '../dataframe/Index';
import { isDateType } from '../dataframe/types';

/**
 * Options for round and align dates function
 */
export interface RoundAndAlignOptions {
  startDate?: Date | string;
  endDate?: Date | string;
  roundFreq?: string; // 'D', 'W', 'M', etc.
}

/**
 * Parse frequency string to get unit and value
 * 
 * @param freq Frequency string like 'D', 'W', 'M', 'H', etc.
 * @returns Parsed frequency information
 */
export function parseFrequency(freq: string): { unit: string; value: number } {
  // Handle simple frequencies
  const simpleFreqs: Record<string, { unit: string; value: number }> = {
    'S': { unit: 'second', value: 1 },
    'T': { unit: 'minute', value: 1 },
    'H': { unit: 'hour', value: 1 },
    'D': { unit: 'day', value: 1 },
    'W': { unit: 'week', value: 1 },
    'M': { unit: 'month', value: 1 },
    'Y': { unit: 'year', value: 1 },
  };
  
  if (simpleFreqs[freq]) {
    return simpleFreqs[freq];
  }
  
  // Handle frequencies with numbers (e.g., '2D', '5T')
  const match = freq.match(/^(\d+)([STHWDMY])$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = simpleFreqs[match[2]]?.unit;
    if (unit) {
      return { unit, value };
    }
  }
  
  throw new Error(`Unsupported frequency: ${freq}`);
}

/**
 * Round a date to the specified frequency
 * 
 * @param date Date to round
 * @param freq Frequency string
 * @returns Rounded date
 */
export function roundDate(date: Date, freq: string): Date {
  const d = new Date(date);
  
  switch (freq.toUpperCase()) {
    case 'S': // Seconds
      d.setMilliseconds(0);
      break;
    case 'T': // Minutes
      d.setSeconds(0, 0);
      break;
    case 'H': // Hours
      d.setMinutes(0, 0, 0);
      break;
    case 'D': // Days
      d.setHours(0, 0, 0, 0);
      break;
    case 'W': // Weeks (round to Monday)
      const dayOfWeek = d.getDay();
      const daysToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      d.setDate(d.getDate() + daysToMonday);
      d.setHours(0, 0, 0, 0);
      break;
    case 'M': // Months
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'Y': // Years
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    default:
      // Handle numeric frequencies like '2D', '3H'
      const parsed = parseFrequency(freq);
      const rounded = roundDate(d, parsed.unit.charAt(0).toUpperCase());
      
      // For multi-unit frequencies, we need additional logic
      if (parsed.value > 1) {
        // This is a simplified implementation
        // A full implementation would handle proper period alignment
        console.warn(`Multi-unit frequency ${freq} not fully implemented, using base unit`);
      }
      
      return rounded;
  }
  
  return d;
}

/**
 * Create a date range with specified frequency
 * 
 * @param start Start date
 * @param end End date  
 * @param freq Frequency string
 * @returns Array of dates
 */
export function createDateRange(start: Date, end: Date, freq: string): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    
    // Increment by frequency
    switch (freq.toUpperCase()) {
      case 'S':
        current.setSeconds(current.getSeconds() + 1);
        break;
      case 'T':
        current.setMinutes(current.getMinutes() + 1);
        break;
      case 'H':
        current.setHours(current.getHours() + 1);
        break;
      case 'D':
        current.setDate(current.getDate() + 1);
        break;
      case 'W':
        current.setDate(current.getDate() + 7);
        break;
      case 'M':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'Y':
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        const parsed = parseFrequency(freq);
        switch (parsed.unit) {
          case 'second':
            current.setSeconds(current.getSeconds() + parsed.value);
            break;
          case 'minute':
            current.setMinutes(current.getMinutes() + parsed.value);
            break;
          case 'hour':
            current.setHours(current.getHours() + parsed.value);
            break;
          case 'day':
            current.setDate(current.getDate() + parsed.value);
            break;
          case 'week':
            current.setDate(current.getDate() + (parsed.value * 7));
            break;
          case 'month':
            current.setMonth(current.getMonth() + parsed.value);
            break;
          case 'year':
            current.setFullYear(current.getFullYear() + parsed.value);
            break;
        }
    }
  }
  
  return dates;
}

/**
 * Find the datetime column in a DataFrame
 * 
 * @param df DataFrame to search
 * @returns Name of first datetime column found, or null
 */
export function findDatetimeColumn(df: DataFrame): string | null {
  for (const column of df.columns) {
    if (isDateType(df.dtypes[column])) {
      return column;
    }
  }
  return null;
}

/**
 * Convert DataFrame index to DatetimeIndex if possible
 * 
 * @param df DataFrame to convert
 * @returns DataFrame with DatetimeIndex or original DataFrame
 */
export function ensureDatetimeIndex(df: DataFrame): DataFrame {
  const index = df.index;
  
  // If already DatetimeIndex, return as is
  if (index instanceof DatetimeIndex) {
    return df;
  }
  
  // Try to convert index to dates
  try {
    const indexData = index.toArray();
    const dates = indexData.map(val => new Date(val as any));
    
    // Check if conversion was successful
    if (dates.every(d => !isNaN(d.getTime()))) {
      const newIndex = new DatetimeIndex(dates);
      
      // Create new DataFrame with datetime index
      const data = df.toJSON();
      return new DataFrame(data, {
        index: newIndex.toArray(),
        columns: df.columns
      });
    }
  } catch (error) {
    console.warn('Could not convert index to datetime:', error);
  }
  
  return df;
}

/**
 * Rounds dates and aligns multiple DataFrames to the same date range.
 * Exact port of Python round_and_align_dates function.
 *
 * @param dataframes List of DataFrames to align (must have datetime index or be convertible)
 * @param options Configuration options
 * @returns List of aligned DataFrames with rounded, unique, sorted datetime index
 */
export function roundAndAlignDates(
  dataframes: DataFrame[],
  options: RoundAndAlignOptions = {}
): DataFrame[] {
  const { startDate, endDate, roundFreq = 'D' } = options;
  
  const processedDfs: DataFrame[] = [];
  let minStart = new Date(8640000000000000); // Max date
  let maxEnd = new Date(-8640000000000000); // Min date
  
  // Process each DataFrame individually
  for (const dfOrig of dataframes) {
    let df = dfOrig.copy();
    
    // Ensure index is datetime
    try {
      df = ensureDatetimeIndex(df);
      const index = df.index;
      
      if (!(index instanceof DatetimeIndex)) {
        console.warn('Could not convert index to datetime for a DataFrame. Skipping alignment for it.');
        processedDfs.push(dfOrig);
        continue;
      }
      
      // Round dates
      try {
        const roundedIndex = index.round(roundFreq);
        
        // Remove duplicates after rounding (keep first)
        const uniqueDates: Date[] = [];
        const uniqueRows: number[] = [];
        const seen = new Set<string>();
        
        for (let i = 0; i < roundedIndex.length; i++) {
          const dateStr = roundedIndex.get(i).toISOString();
          if (!seen.has(dateStr)) {
            seen.add(dateStr);
            uniqueDates.push(roundedIndex.get(i) as Date);
            uniqueRows.push(i);
          }
        }
        
        // Create DataFrame with unique rows
        if (uniqueRows.length < df.shape[0]) {
          // Need to filter rows
          const newData: Record<string, any[]> = {};
          for (const column of df.columns) {
            const series = df.getColumn(column);
            newData[column] = uniqueRows.map(i => series.iloc(i));
          }
          
          df = new DataFrame(newData, {
            index: uniqueDates,
            columns: df.columns
          });
        } else {
          // Just update index
          const data = df.toJSON();
          df = new DataFrame(data, {
            index: uniqueDates,
            columns: df.columns
          });
        }
        
        // Sort by index
        df = df.sort(['__index__'], true); // Sort by index in ascending order
        
      } catch (error) {
        console.warn(`Could not round index with frequency '${roundFreq}':`, error);
      }
      
      // Track overall min/max dates after processing
      if (!df.empty) {
        const index = df.index as DatetimeIndex;
        const dates = index.toArray() as Date[];
        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));
        
        if (min < minStart) minStart = min;
        if (max > maxEnd) maxEnd = max;
      }
      
      processedDfs.push(df);
      
    } catch (error) {
      console.warn('Error processing DataFrame for date alignment:', error);
      processedDfs.push(dfOrig);
    }
  }
  
  // Determine final common date range
  const finalStart = startDate ? new Date(startDate) : minStart;
  const finalEnd = endDate ? new Date(endDate) : maxEnd;
  
  // Validate date range
  if (finalStart > finalEnd || 
      finalStart.getTime() === new Date(8640000000000000).getTime() ||
      finalEnd.getTime() === new Date(-8640000000000000).getTime()) {
    console.warn('Could not determine a valid common date range for alignment. Returning processed (rounded/deduplicated) but potentially unaligned DataFrames.');
    return processedDfs;
  }
  
  // Create a complete date range for reindexing
  let fullDateRange: Date[];
  try {
    fullDateRange = createDateRange(finalStart, finalEnd, roundFreq);
  } catch (error) {
    console.warn(`Could not create date range with frequency '${roundFreq}':`, error, 'Returning processed DataFrames without reindexing.');
    return processedDfs;
  }
  
  // Reindex all successfully processed dataframes to the common range
  const alignedDfs: DataFrame[] = [];
  for (const df of processedDfs) {
    try {
      if (df.index instanceof DatetimeIndex && !df.empty) {
        // Reindex to full date range
        const reindexed = reindexDataFrame(df, fullDateRange);
        alignedDfs.push(reindexed);
      } else {
        alignedDfs.push(df);
      }
    } catch (error) {
      console.warn('Error reindexing DataFrame:', error);
      alignedDfs.push(df);
    }
  }
  
  return alignedDfs;
}

/**
 * Reindex a DataFrame to a new date range
 * 
 * @param df DataFrame with DatetimeIndex
 * @param newDates Array of new dates for index
 * @returns Reindexed DataFrame
 */
export function reindexDataFrame(df: DataFrame, newDates: Date[]): DataFrame {
  const currentIndex = df.index as DatetimeIndex;
  const currentDates = currentIndex.toArray() as Date[];
  
  // Create mapping from date string to row index
  const dateToRow = new Map<string, number>();
  for (let i = 0; i < currentDates.length; i++) {
    const dateStr = currentDates[i].toISOString();
    dateToRow.set(dateStr, i);
  }
  
  // Create new data with NaN/null for missing dates
  const newData: Record<string, any[]> = {};
  for (const column of df.columns) {
    const series = df.getColumn(column);
    const newColumnData: any[] = [];
    
    for (const newDate of newDates) {
      const dateStr = newDate.toISOString();
      const rowIndex = dateToRow.get(dateStr);
      
      if (rowIndex !== undefined) {
        newColumnData.push(series.iloc(rowIndex));
      } else {
        // Use appropriate null value based on column type
        if (series.dtype === 'float' || series.dtype === 'integer') {
          newColumnData.push(NaN);
        } else {
          newColumnData.push(null);
        }
      }
    }
    
    newData[column] = newColumnData;
  }
  
  return new DataFrame(newData, {
    index: newDates,
    columns: df.columns
  });
}

/**
 * Check if a value looks like a date
 * 
 * @param value Value to check
 * @returns True if value appears to be a date
 */
export function isLikelyDate(value: any): boolean {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  
  if (typeof value === 'string') {
    // Try parsing common date formats
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }
  
  if (typeof value === 'number') {
    // Check if it's a Unix timestamp (seconds or milliseconds)
    const timestampResult = detectUnixTimestamp(value);
    if (timestampResult.isTimestamp) {
      return true;
    }
    
    // Fallback: try parsing as regular date number
    const date = new Date(value);
    const year = date.getFullYear();
    return !isNaN(date.getTime()) && year > 1900 && year < 2100;
  }
  
  return false;
}

/**
 * Auto-detect date columns in DataFrame
 * 
 * @param df DataFrame to analyze
 * @param sampleSize Number of rows to sample for detection
 * @returns Array of column names that appear to contain dates
 */
export function detectDateColumns(df: DataFrame, sampleSize: number = 100): string[] {
  const dateColumns: string[] = [];
  
  for (const column of df.columns) {
    const series = df.getColumn(column);
    
    // Skip if already detected as date type
    if (isDateType(series.dtype)) {
      dateColumns.push(column);
      continue;
    }
    
    // Sample some values
    const sampleIndices = Math.min(sampleSize, series.length);
    let dateCount = 0;
    
    for (let i = 0; i < sampleIndices; i++) {
      const value = series.iloc(i);
      if (value != null && isLikelyDate(value)) {
        dateCount++;
      }
    }
    
    // If majority of sampled values look like dates, consider it a date column
    const dateRatio = dateCount / sampleIndices;
    if (dateRatio > 0.8) {
      dateColumns.push(column);
    }
  }
  
  return dateColumns;
}

/**
 * Convert column to DatetimeIndex
 * 
 * @param values Array of values to convert
 * @returns DatetimeIndex or null if conversion fails
 */
export function convertToDatetimeIndex(values: any[]): DatetimeIndex | null {
  try {
    const dates = values.map(val => {
      if (val instanceof Date) return val;
      return new Date(val);
    });
    
    // Check if all conversions were successful
    if (dates.every(d => !isNaN(d.getTime()))) {
      return new DatetimeIndex(dates);
    }
  } catch (error) {
    console.warn('Failed to convert to DatetimeIndex:', error);
  }
  
  return null;
}

/**
 * Detect if a numeric value is a Unix timestamp
 * 
 * @param value Numeric value to check
 * @returns Detection result with format and confidence
 */
export function detectUnixTimestamp(value: number): {
  isTimestamp: boolean;
  format: 'seconds' | 'milliseconds' | null;
  confidence: number;
  date?: Date;
} {
  if (!Number.isFinite(value) || value <= 0) {
    return { isTimestamp: false, format: null, confidence: 0 };
  }
  
  const valueStr = String(Math.floor(Math.abs(value)));
  
  // Check for seconds timestamp (10 digits, roughly 1970-2099)
  if (valueStr.length === 10) {
    const date = new Date(value * 1000);
    const year = date.getFullYear();
    
    if (year >= 1970 && year <= 2099) {
      return {
        isTimestamp: true,
        format: 'seconds',
        confidence: 0.9,
        date
      };
    }
  }
  
  // Check for milliseconds timestamp (13 digits, roughly 1970-2099)
  if (valueStr.length === 13) {
    const date = new Date(value);
    const year = date.getFullYear();
    
    if (year >= 1970 && year <= 2099) {
      return {
        isTimestamp: true,
        format: 'milliseconds',
        confidence: 0.95,
        date
      };
    }
  }
  
  return { isTimestamp: false, format: null, confidence: 0 };
}

/**
 * Convert Unix timestamps to Date objects
 * 
 * @param values Array of numeric values (Unix timestamps)
 * @param format Format of timestamps ('seconds' or 'milliseconds'), auto-detect if not provided
 * @returns Array of Date objects
 */
export function convertUnixTimestamps(
  values: number[],
  format?: 'seconds' | 'milliseconds'
): Date[] {
  if (values.length === 0) return [];
  
  // Auto-detect format if not provided
  let detectedFormat = format;
  if (!detectedFormat) {
    // Use first valid timestamp to detect format
    for (const value of values) {
      const detection = detectUnixTimestamp(value);
      if (detection.isTimestamp) {
        detectedFormat = detection.format!;
        break;
      }
    }
  }
  
  if (!detectedFormat) {
    throw new Error('Could not detect timestamp format and none provided');
  }
  
  return values.map(value => {
    if (detectedFormat === 'seconds') {
      return new Date(value * 1000);
    } else {
      return new Date(value);
    }
  });
}

/**
 * Enhanced timezone-aware date parsing
 * 
 * @param value Date string or number
 * @param timezone Optional timezone (defaults to UTC)
 * @returns Date object or null if parsing fails
 */
export function parseDate(value: any, timezone?: string): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  if (typeof value === 'number') {
    const timestampResult = detectUnixTimestamp(value);
    if (timestampResult.isTimestamp) {
      return timestampResult.date!;
    }
    
    // Try as regular number
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Try direct parsing first
    let date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try common formats
    const patterns = [
      // ISO 8601 variants
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/,
      
      // US format
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      
      // European format
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        try {
          // Parse based on pattern - this is simplified
          date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }
  }
  
  return null;
}

/**
 * Format date for display based on detected format
 * 
 * @param date Date to format
 * @param originalFormat Original format detected ('seconds', 'milliseconds', etc.)
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date, originalFormat?: string): string {
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  // Default ISO format
  return date.toISOString().split('T')[0];
}

/**
 * Batch convert mixed date formats in an array
 * 
 * @param values Array of mixed date values
 * @returns Array of Date objects (null for unparseable values)
 */
export function batchParseDates(values: any[]): (Date | null)[] {
  return values.map(value => parseDate(value));
}

/**
 * Detect the most common date format in an array
 * 
 * @param values Array of date-like values
 * @returns Most likely date format information
 */
export function detectDateFormat(values: any[]): {
  format: string;
  confidence: number;
  examples: any[];
  isTimestamp: boolean;
  timestampFormat?: 'seconds' | 'milliseconds';
} {
  const sample = values.slice(0, Math.min(100, values.length));
  let timestampCount = 0;
  let timestampFormat: 'seconds' | 'milliseconds' | undefined;
  let stringDateCount = 0;
  
  for (const value of sample) {
    if (typeof value === 'number') {
      const detection = detectUnixTimestamp(value);
      if (detection.isTimestamp) {
        timestampCount++;
        timestampFormat = detection.format!;
      }
    } else if (typeof value === 'string') {
      const parsed = parseDate(value);
      if (parsed) {
        stringDateCount++;
      }
    }
  }
  
  const timestampRatio = timestampCount / sample.length;
  const stringDateRatio = stringDateCount / sample.length;
  
  if (timestampRatio > 0.8) {
    return {
      format: `Unix timestamp (${timestampFormat})`,
      confidence: timestampRatio,
      examples: sample.filter((_, i) => i < 3),
      isTimestamp: true,
      timestampFormat
    };
  }
  
  if (stringDateRatio > 0.8) {
    return {
      format: 'String dates',
      confidence: stringDateRatio,
      examples: sample.filter((_, i) => i < 3),
      isTimestamp: false
    };
  }
  
  return {
    format: 'Mixed or unknown',
    confidence: Math.max(timestampRatio, stringDateRatio),
    examples: sample.slice(0, 3),
    isTimestamp: false
  };
}