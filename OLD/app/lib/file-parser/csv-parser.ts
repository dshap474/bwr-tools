// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ CSV Parser Implementation                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

import Papa from 'papaparse';
import { DataFrame } from '../../plots/lib';
import {
  FileParseOptions,
  ParsedFileResult,
  FileMetadata,
  DelimiterDetectionResult,
  FileParseError,
  FileReadError
} from './types';
import { generateColumnInfo, normalizeColumnName } from './data-inference';

// Common delimiters to test for auto-detection
const DELIMITER_CANDIDATES = [',', ';', '\t', '|', ' '];

/**
 * Parse CSV file with Papa Parse
 */
export async function parseCSV(
  file: File,
  options: FileParseOptions = {}
): Promise<ParsedFileResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Read file content
    const content = await readFileContent(file);
    
    // Auto-detect delimiter if not provided
    let delimiter = options.delimiter;
    if (!delimiter) {
      const detectionResult = detectDelimiter(content);
      delimiter = detectionResult.delimiter;
      if (detectionResult.confidence < 0.8) {
        warnings.push(`Auto-detected delimiter '${delimiter}' with low confidence (${(detectionResult.confidence * 100).toFixed(0)}%)`);
      }
    }
    
    // Parse with Papa Parse
    const parseConfig: Papa.ParseConfig = {
      delimiter,
      header: true,
      skipEmptyLines: options.skipEmptyLines !== false,
      transformHeader: (header) => normalizeColumnName(header),
      transform: (value, column) => {
        // Basic data cleaning
        if (typeof value === 'string') {
          const trimmed = value.trim();
          // Convert empty strings to null
          if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'na') {
            return null;
          }
          return trimmed;
        }
        return value;
      },
      complete: () => {}, // Will be handled in the Promise
      error: (error) => {
        throw new FileParseError(`Papa Parse error: ${error.message}`, 'PARSE_ERROR', error);
      }
    };
    
    const parseResult = Papa.parse(content, parseConfig);
    
    if (parseResult.errors.length > 0) {
      for (const error of parseResult.errors) {
        if (error.type === 'Quotes') {
          warnings.push(`Row ${error.row || '?'}: Quote parsing issue - ${error.message}`);
        } else {
          errors.push(`Row ${error.row || '?'}: ${error.message}`);
        }
      }
    }
    
    if (parseResult.data.length === 0) {
      throw new FileParseError('No data found in CSV file', 'NO_DATA');
    }
    
    // Handle skipFirstNRows
    let processedData = parseResult.data;
    if (options.skipFirstNRows && options.skipFirstNRows > 0) {
      processedData = processedData.slice(options.skipFirstNRows);
      if (processedData.length === 0) {
        throw new FileParseError(`All rows were skipped (skipFirstNRows: ${options.skipFirstNRows})`, 'NO_DATA_AFTER_SKIP');
      }
    }
    
    // Apply row limit
    const originalRowCount = processedData.length;
    if (options.maxRows && processedData.length > options.maxRows) {
      processedData = processedData.slice(0, options.maxRows);
      warnings.push(`Data truncated to ${options.maxRows} rows (original: ${originalRowCount} rows)`);
    }
    
    // Convert to DataFrame format
    const headers = parseResult.meta.fields || [];
    if (headers.length === 0) {
      throw new FileParseError('No column headers found', 'NO_HEADERS');
    }
    
    // Ensure all rows have the same number of columns
    const cleanedData: Record<string, any[]> = {};
    for (const header of headers) {
      cleanedData[header] = [];
    }
    
    for (let i = 0; i < processedData.length; i++) {
      const row = processedData[i] as Record<string, any>;
      for (const header of headers) {
        cleanedData[header].push(row[header] ?? null);
      }
    }
    
    // Create DataFrame
    const dataframe = new DataFrame(cleanedData);
    
    // Generate column metadata
    const columnInfo = headers.map(header => 
      generateColumnInfo(header, cleanedData[header], header)
    );
    
    const processingTime = performance.now() - startTime;
    
    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'csv',
      originalRowCount,
      finalRowCount: processedData.length,
      columnCount: headers.length,
      columns: columnInfo,
      parseOptions: { ...options, delimiter },
      processingTime
    };
    
    return {
      success: true,
      data: dataframe,
      metadata,
      errors,
      warnings
    };
    
  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    if (error instanceof FileParseError) {
      errors.push(error.message);
    } else {
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'csv',
      originalRowCount: 0,
      finalRowCount: 0,
      columnCount: 0,
      columns: [],
      parseOptions: options,
      processingTime
    };
    
    return {
      success: false,
      data: null,
      metadata,
      errors,
      warnings
    };
  }
}

/**
 * Read file content as text
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new FileReadError('Failed to read file content'));
      }
    };
    
    reader.onerror = () => {
      reject(new FileReadError(`File read error: ${reader.error?.message || 'Unknown error'}`));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Auto-detect CSV delimiter
 */
export function detectDelimiter(content: string, maxLines = 10): DelimiterDetectionResult {
  const lines = content.split('\n').slice(0, maxLines).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { delimiter: ',', confidence: 0, rowCount: 0, columnCount: 0 };
  }
  
  let bestResult: DelimiterDetectionResult = { delimiter: ',', confidence: 0, rowCount: 0, columnCount: 0 };
  
  for (const delimiter of DELIMITER_CANDIDATES) {
    const result = analyzeDelimiter(lines, delimiter);
    if (result.confidence > bestResult.confidence) {
      bestResult = result;
    }
  }
  
  return bestResult;
}

/**
 * Analyze a specific delimiter candidate
 */
function analyzeDelimiter(lines: string[], delimiter: string): DelimiterDetectionResult {
  const columnCounts: number[] = [];
  
  for (const line of lines) {
    const columns = line.split(delimiter);
    columnCounts.push(columns.length);
  }
  
  if (columnCounts.length === 0) {
    return { delimiter, confidence: 0, rowCount: 0, columnCount: 0 };
  }
  
  // Calculate consistency
  const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
  const variance = columnCounts.reduce((acc, count) => acc + Math.pow(count - avgColumns, 2), 0) / columnCounts.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Consistency score (lower std dev = higher consistency)
  const consistencyScore = avgColumns > 1 ? Math.max(0, 1 - (standardDeviation / avgColumns)) : 0;
  
  // Penalize single-column results (likely wrong delimiter)
  const columnCountPenalty = avgColumns === 1 ? 0.5 : 1;
  
  // Bonus for common delimiters
  const delimiterBonus = delimiter === ',' ? 1.1 : delimiter === ';' ? 1.05 : 1;
  
  const confidence = consistencyScore * columnCountPenalty * delimiterBonus;
  
  return {
    delimiter,
    confidence: Math.min(confidence, 1),
    rowCount: lines.length,
    columnCount: Math.round(avgColumns)
  };
}

/**
 * Preview CSV data without full parsing
 */
export async function previewCSV(
  file: File,
  options: { maxRows?: number; delimiter?: string } = {}
): Promise<{ headers: string[]; rows: string[][]; detectedDelimiter: string }> {
  const content = await readFileContent(file);
  const lines = content.split('\n').slice(0, (options.maxRows || 20) + 1);
  
  let delimiter = options.delimiter;
  if (!delimiter) {
    const detection = detectDelimiter(content, 5);
    delimiter = detection.delimiter;
  }
  
  if (lines.length === 0) {
    return { headers: [], rows: [], detectedDelimiter: delimiter };
  }
  
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim()));
  
  return { headers, rows, detectedDelimiter: delimiter };
}