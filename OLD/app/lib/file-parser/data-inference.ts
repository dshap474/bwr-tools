// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Data Type Inference Engine                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

import {
  DataType,
  DataTypeInference,
  DateDetectionResult,
  NumericDetectionResult,
  ColumnInfo
} from './types';

// Common date patterns
const DATE_PATTERNS = [
  { pattern: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD', confidence: 0.9 },
  { pattern: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY', confidence: 0.8 },
  { pattern: /^\d{2}-\d{2}-\d{4}$/, format: 'MM-DD-YYYY', confidence: 0.8 },
  { pattern: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD', confidence: 0.9 },
  { pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'M/D/YYYY', confidence: 0.7 },
  { pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, format: 'ISO 8601', confidence: 0.95 },
  { pattern: /^\d{2}\/\d{2}\/\d{2}$/, format: 'MM/DD/YY', confidence: 0.6 },
];

// Currency symbols and patterns
const CURRENCY_SYMBOLS = ['$', '€', '£', '¥', '₹', '₽', 'R$', 'C$', 'A$'];
const CURRENCY_PATTERN = new RegExp(`^[${CURRENCY_SYMBOLS.map(s => '\\' + s).join('')}]?\\s?[\\d,.]+$`);

// Percentage pattern
const PERCENTAGE_PATTERN = /^[\d,.]+\s?%$/;

/**
 * Infer the data type of a column based on sample values
 */
export function inferDataType(values: any[], columnName: string, sampleSize = 100): DataTypeInference {
  // Filter out null/undefined values for analysis
  const cleanValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (cleanValues.length === 0) {
    return {
      type: 'unknown',
      confidence: 0,
      examples: [],
      reasoning: 'All values are null/empty'
    };
  }
  
  // Take sample for performance
  const sample = cleanValues.slice(0, Math.min(sampleSize, cleanValues.length));
  const sampleStrings = sample.map(v => String(v).trim());
  
  // Check for dates first (most specific)
  const dateResult = detectDates(sampleStrings);
  if (dateResult.isDate && dateResult.confidence > 0.7) {
    return {
      type: 'date',
      confidence: dateResult.confidence,
      pattern: dateResult.format,
      examples: dateResult.examples.slice(0, 3),
      reasoning: `Detected date pattern: ${dateResult.format}`
    };
  }
  
  // Check for numeric types
  const numericResult = detectNumeric(sampleStrings);
  if (numericResult.isNumeric && numericResult.confidence > 0.8) {
    return {
      type: numericResult.type,
      confidence: numericResult.confidence,
      examples: numericResult.examples.slice(0, 3),
      reasoning: `Detected ${numericResult.type} with ${(numericResult.confidence * 100).toFixed(0)}% confidence`
    };
  }
  
  // Check for boolean
  const booleanResult = detectBoolean(sampleStrings);
  if (booleanResult.confidence > 0.9) {
    return {
      type: 'boolean',
      confidence: booleanResult.confidence,
      examples: booleanResult.examples.slice(0, 3),
      reasoning: 'Detected boolean values'
    };
  }
  
  // Default to string
  return {
    type: 'string',
    confidence: 0.95,
    examples: sampleStrings.slice(0, 3),
    reasoning: 'Default string type for text data'
  };
}

/**
 * Detect if values are dates
 */
export function detectDates(values: string[]): DateDetectionResult {
  let bestMatch = {
    format: '',
    confidence: 0,
    matchCount: 0,
    examples: [] as string[]
  };
  
  for (const { pattern, format, confidence } of DATE_PATTERNS) {
    const matches = values.filter(v => pattern.test(v));
    const matchRatio = matches.length / values.length;
    
    if (matchRatio > 0.5 && matchRatio * confidence > bestMatch.confidence) {
      bestMatch = {
        format,
        confidence: matchRatio * confidence,
        matchCount: matches.length,
        examples: matches.slice(0, 3)
      };
    }
  }
  
  // Also check if values can be parsed as dates
  const parseableCount = values.filter(v => {
    const date = new Date(v);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
  }).length;
  
  const parseableRatio = parseableCount / values.length;
  if (parseableRatio > bestMatch.confidence) {
    bestMatch = {
      format: 'Auto-parseable',
      confidence: parseableRatio * 0.8, // Slightly lower confidence for auto-parse
      matchCount: parseableCount,
      examples: values.filter(v => !isNaN(new Date(v).getTime())).slice(0, 3)
    };
  }
  
  // Check for Unix timestamps
  const timestampCount = values.filter(v => {
    const num = Number(v);
    if (isNaN(num)) return false;
    
    // Check for seconds (10 digits) or milliseconds (13 digits)
    const str = String(Math.floor(num));
    if (str.length === 10 || str.length === 13) {
      const date = new Date(str.length === 10 ? num * 1000 : num);
      return !isNaN(date.getTime()) && date.getFullYear() > 1970 && date.getFullYear() < 2100;
    }
    return false;
  }).length;
  
  const timestampRatio = timestampCount / values.length;
  if (timestampRatio > bestMatch.confidence) {
    bestMatch = {
      format: 'Unix timestamp',
      confidence: timestampRatio * 0.9,
      matchCount: timestampCount,
      examples: values.filter(v => {
        const num = Number(v);
        const str = String(Math.floor(num));
        return (str.length === 10 || str.length === 13) && !isNaN(new Date(str.length === 10 ? num * 1000 : num).getTime());
      }).slice(0, 3)
    };
  }
  
  return {
    isDate: bestMatch.confidence > 0.6,
    format: bestMatch.format,
    confidence: bestMatch.confidence,
    examples: bestMatch.examples
  };
}

/**
 * Detect numeric types including currency and percentages
 */
export function detectNumeric(values: string[]): NumericDetectionResult {
  let integerCount = 0;
  let floatCount = 0;
  let currencyCount = 0;
  let percentageCount = 0;
  
  const examples = {
    integer: [] as string[],
    float: [] as string[],
    currency: [] as string[],
    percentage: [] as string[]
  };
  
  let detectedDecimalSep = '.';
  let detectedThousandsSep = '';
  let detectedCurrencySymbol = '';
  
  for (const value of values) {
    const trimmed = value.trim();
    
    // Check for percentage
    if (PERCENTAGE_PATTERN.test(trimmed)) {
      percentageCount++;
      if (examples.percentage.length < 3) examples.percentage.push(trimmed);
      continue;
    }
    
    // Check for currency
    const currencyMatch = CURRENCY_SYMBOLS.find(symbol => trimmed.includes(symbol));
    if (currencyMatch && CURRENCY_PATTERN.test(trimmed)) {
      currencyCount++;
      detectedCurrencySymbol = currencyMatch;
      if (examples.currency.length < 3) examples.currency.push(trimmed);
      continue;
    }
    
    // Clean numeric value (remove spaces, handle separators)
    let cleaned = trimmed.replace(/\s/g, '');
    
    // Detect decimal and thousands separators
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;
    
    if (commaCount === 1 && dotCount === 0) {
      // Could be European format (comma as decimal)
      if (/^\d+,\d{1,2}$/.test(cleaned)) {
        detectedDecimalSep = ',';
        cleaned = cleaned.replace(',', '.');
      }
    } else if (commaCount > 1 && dotCount <= 1) {
      // Comma as thousands separator
      detectedThousandsSep = ',';
      cleaned = cleaned.replace(/,/g, '');
    } else if (dotCount > 1 && commaCount <= 1) {
      // Dot as thousands separator (less common)
      detectedThousandsSep = '.';
      if (commaCount === 1) {
        detectedDecimalSep = ',';
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    }
    
    const num = Number(cleaned);
    if (!isNaN(num)) {
      if (Number.isInteger(num) && !trimmed.includes('.') && !trimmed.includes(',')) {
        integerCount++;
        if (examples.integer.length < 3) examples.integer.push(trimmed);
      } else {
        floatCount++;
        if (examples.float.length < 3) examples.float.push(trimmed);
      }
    }
  }
  
  const total = values.length;
  const percentageRatio = percentageCount / total;
  const currencyRatio = currencyCount / total;
  const floatRatio = floatCount / total;
  const integerRatio = integerCount / total;
  
  // Determine best type
  if (percentageRatio > 0.8) {
    return {
      isNumeric: true,
      type: 'percentage',
      confidence: percentageRatio,
      examples: examples.percentage
    };
  }
  
  if (currencyRatio > 0.8) {
    return {
      isNumeric: true,
      type: 'currency',
      confidence: currencyRatio,
      currencySymbol: detectedCurrencySymbol,
      examples: examples.currency
    };
  }
  
  const totalNumeric = integerCount + floatCount;
  const numericRatio = totalNumeric / total;
  
  if (numericRatio > 0.8) {
    const type = floatRatio > integerRatio ? 'float' : 'integer';
    return {
      isNumeric: true,
      type,
      confidence: numericRatio,
      decimalSeparator: detectedDecimalSep !== '.' ? detectedDecimalSep : undefined,
      thousandsSeparator: detectedThousandsSep || undefined,
      examples: type === 'float' ? examples.float : examples.integer
    };
  }
  
  return {
    isNumeric: false,
    type: 'float',
    confidence: 0,
    examples: []
  };
}

/**
 * Detect boolean values
 */
export function detectBoolean(values: string[]): { confidence: number; examples: string[] } {
  const booleanValues = new Set([
    'true', 'false', 'yes', 'no', 'y', 'n', '1', '0',
    'TRUE', 'FALSE', 'YES', 'NO', 'Y', 'N'
  ]);
  
  const boolCount = values.filter(v => booleanValues.has(v.trim())).length;
  const boolRatio = boolCount / values.length;
  
  return {
    confidence: boolRatio,
    examples: values.filter(v => booleanValues.has(v.trim())).slice(0, 3)
  };
}

/**
 * Generate column information from raw data
 */
export function generateColumnInfo(
  columnName: string,
  values: any[],
  originalName: string = columnName
): ColumnInfo {
  const inference = inferDataType(values, columnName);
  const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const uniqueCount = new Set(nonNullValues).size;
  
  return {
    name: columnName,
    originalName,
    inferredType: inference.type,
    sampleValues: inference.examples,
    nullCount,
    uniqueCount,
    confidence: inference.confidence
  };
}

/**
 * Clean and normalize column names
 */
export function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    || 'unnamed_column';
}

/**
 * Detect Unix timestamps and suggest conversion
 */
export function detectUnixTimestamps(values: any[]): {
  isTimestamp: boolean;
  format: 'seconds' | 'milliseconds' | null;
  confidence: number;
  examples: number[];
} {
  const numbers = values
    .map(v => Number(v))
    .filter(n => !isNaN(n) && n > 0);
  
  if (numbers.length === 0) {
    return { isTimestamp: false, format: null, confidence: 0, examples: [] };
  }
  
  let secondsCount = 0;
  let millisecondsCount = 0;
  
  for (const num of numbers) {
    const str = String(Math.floor(num));
    
    if (str.length === 10) {
      // Check if it's a reasonable timestamp (after 1970, before 2100)
      const date = new Date(num * 1000);
      if (date.getFullYear() >= 1970 && date.getFullYear() <= 2100) {
        secondsCount++;
      }
    } else if (str.length === 13) {
      // Check milliseconds timestamp
      const date = new Date(num);
      if (date.getFullYear() >= 1970 && date.getFullYear() <= 2100) {
        millisecondsCount++;
      }
    }
  }
  
  const total = numbers.length;
  const secondsRatio = secondsCount / total;
  const millisecondsRatio = millisecondsCount / total;
  
  if (secondsRatio > 0.8) {
    return {
      isTimestamp: true,
      format: 'seconds',
      confidence: secondsRatio,
      examples: numbers.filter(n => {
        const str = String(Math.floor(n));
        if (str.length === 10) {
          const date = new Date(n * 1000);
          return date.getFullYear() >= 1970 && date.getFullYear() <= 2100;
        }
        return false;
      }).slice(0, 3)
    };
  }
  
  if (millisecondsRatio > 0.8) {
    return {
      isTimestamp: true,
      format: 'milliseconds',
      confidence: millisecondsRatio,
      examples: numbers.filter(n => {
        const str = String(Math.floor(n));
        if (str.length === 13) {
          const date = new Date(n);
          return date.getFullYear() >= 1970 && date.getFullYear() <= 2100;
        }
        return false;
      }).slice(0, 3)
    };
  }
  
  return { isTimestamp: false, format: null, confidence: 0, examples: [] };
}