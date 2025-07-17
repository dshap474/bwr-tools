// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Main File Parser Interface                                                         │
// └────────────────────────────────────────────────────────────────────────────────────┘

import {
  FileParseOptions,
  ParsedFileResult,
  FilePreview,
  PreviewOptions,
  SupportedFileType,
  UnsupportedFileTypeError
} from './types';
import { parseCSV, previewCSV } from './csv-parser';
import { parseExcel, previewExcel, getExcelSheetInfo } from './excel-parser';
import { validateFile, validateParseOptions } from './file-validator';

/**
 * Main file parser - automatically detects file type and uses appropriate parser
 */
export async function parseFile(
  file: File,
  options: FileParseOptions = {}
): Promise<ParsedFileResult> {
  // Validate file first
  const validation = validateFile(file);
  
  if (!validation.isValid) {
    return {
      success: false,
      data: null,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: validation.fileType || 'csv',
        originalRowCount: 0,
        finalRowCount: 0,
        columnCount: 0,
        columns: [],
        parseOptions: options,
        processingTime: 0
      },
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
  
  const fileType = validation.fileType!;
  
  // Validate parse options for this file type
  const optionsValidation = validateParseOptions(fileType, options);
  if (!optionsValidation.isValid) {
    return {
      success: false,
      data: null,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType,
        originalRowCount: 0,
        finalRowCount: 0,
        columnCount: 0,
        columns: [],
        parseOptions: options,
        processingTime: 0
      },
      errors: optionsValidation.errors,
      warnings: [...validation.warnings, ...optionsValidation.warnings]
    };
  }
  
  // Parse based on file type
  let result: ParsedFileResult;
  
  switch (fileType) {
    case 'csv':
      result = await parseCSV(file, options);
      break;
      
    case 'xlsx':
    case 'xls':
      result = await parseExcel(file, options);
      break;
      
    default:
      throw new UnsupportedFileTypeError(fileType);
  }
  
  // Add any validation warnings to the result
  if (validation.warnings.length > 0 || optionsValidation.warnings.length > 0) {
    result.warnings = [
      ...result.warnings,
      ...validation.warnings,
      ...optionsValidation.warnings
    ];
  }
  
  return result;
}

/**
 * Preview file data without full parsing
 */
export async function previewFile(
  file: File,
  options: PreviewOptions & { sheetName?: string; sheetIndex?: number; delimiter?: string } = {}
): Promise<FilePreview & { fileType: SupportedFileType; metadata?: any }> {
  const validation = validateFile(file);
  
  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }
  
  const fileType = validation.fileType!;
  const maxRows = options.maxRows || 20;
  
  try {
    switch (fileType) {
      case 'csv': {
        const preview = await previewCSV(file, { 
          maxRows, 
          delimiter: options.delimiter 
        });
        return {
          headers: preview.headers,
          rows: preview.rows,
          totalRows: -1, // Unknown without full parse
          totalColumns: preview.headers.length,
          fileType,
          metadata: { detectedDelimiter: preview.detectedDelimiter }
        };
      }
      
      case 'xlsx':
      case 'xls': {
        const preview = await previewExcel(file, {
          maxRows,
          sheetName: options.sheetName,
          sheetIndex: options.sheetIndex
        });
        return {
          headers: preview.headers,
          rows: preview.rows,
          totalRows: -1, // Unknown without full parse
          totalColumns: preview.headers.length,
          fileType,
          metadata: {
            sheetName: preview.sheetName,
            availableSheets: preview.availableSheets
          }
        };
      }
      
      default:
        throw new UnsupportedFileTypeError(fileType);
    }
  } catch (error) {
    throw new Error(`Preview failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get file information without parsing data
 */
export async function getFileInfo(file: File): Promise<{
  validation: ReturnType<typeof validateFile>;
  fileType: SupportedFileType | null;
  sheets?: Array<{ name: string; index: number; range?: string; rowCount?: number; columnCount?: number }>;
}> {
  const validation = validateFile(file);
  const fileType = validation.fileType;
  
  const result = {
    validation,
    fileType
  };
  
  // For Excel files, get sheet information
  if (fileType === 'xlsx' || fileType === 'xls') {
    try {
      const sheetInfo = await getExcelSheetInfo(file);
      return { ...result, sheets: sheetInfo.sheets };
    } catch (error) {
      // If sheet info fails, still return basic info
      console.warn('Failed to get Excel sheet info:', error);
    }
  }
  
  return result;
}

/**
 * Parse multiple files concurrently
 */
export async function parseFiles(
  files: File[],
  options: FileParseOptions = {}
): Promise<ParsedFileResult[]> {
  if (files.length === 0) {
    return [];
  }
  
  // Parse files concurrently with reasonable concurrency limit
  const concurrencyLimit = Math.min(files.length, 3);
  const results: ParsedFileResult[] = [];
  
  for (let i = 0; i < files.length; i += concurrencyLimit) {
    const batch = files.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(file => parseFile(file, options));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Parse file with progress tracking (for large files)
 */
export async function parseFileWithProgress(
  file: File,
  options: FileParseOptions = {},
  onProgress?: (progress: { phase: string; percent: number; message: string }) => void
): Promise<ParsedFileResult> {
  const reportProgress = (phase: string, percent: number, message: string) => {
    onProgress?.({ phase, percent, message });
  };
  
  try {
    reportProgress('validation', 0, 'Validating file...');
    
    const validation = validateFile(file);
    if (!validation.isValid) {
      reportProgress('error', 0, `Validation failed: ${validation.errors[0]}`);
      throw new Error(validation.errors.join(', '));
    }
    
    reportProgress('validation', 20, 'File validation complete');
    
    reportProgress('parsing', 30, 'Starting file parsing...');
    
    // For now, we can't track detailed progress within Papa Parse or XLSX
    // But we can simulate reasonable progress updates
    const progressInterval = setInterval(() => {
      // This is approximate - real progress tracking would require 
      // streaming parsers or chunked processing
      reportProgress('parsing', 50 + Math.random() * 30, 'Parsing data...');
    }, 500);
    
    const result = await parseFile(file, options);
    
    clearInterval(progressInterval);
    
    if (result.success) {
      reportProgress('complete', 100, `Successfully parsed ${result.metadata.finalRowCount} rows`);
    } else {
      reportProgress('error', 100, `Parsing failed: ${result.errors[0]}`);
    }
    
    return result;
    
  } catch (error) {
    reportProgress('error', 100, `Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Utility to get default parse options based on file type
 */
export function getDefaultParseOptions(fileType: SupportedFileType): FileParseOptions {
  const defaults: FileParseOptions = {
    inferTypes: true,
    skipEmptyLines: true,
    maxRows: undefined // No limit by default
  };
  
  switch (fileType) {
    case 'csv':
      return {
        ...defaults,
        delimiter: undefined, // Auto-detect
        encoding: 'utf-8'
      };
      
    case 'xlsx':
    case 'xls':
      return {
        ...defaults,
        sheetIndex: 0 // First sheet
      };
      
    default:
      return defaults;
  }
}