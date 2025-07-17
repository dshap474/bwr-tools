// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ File Parser Types                                                                   │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../../plots/lib';

export type SupportedFileType = 'csv' | 'xlsx' | 'xls';

export interface FileParseOptions {
  // CSV specific options
  delimiter?: string;
  skipEmptyLines?: boolean;
  skipFirstNRows?: number;
  encoding?: string;
  
  // Excel specific options
  sheetName?: string;
  sheetIndex?: number;
  
  // General options
  maxRows?: number;
  inferTypes?: boolean;
  dateFormat?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
}

export interface ParsedFileResult {
  success: boolean;
  data: DataFrame | null;
  metadata: FileMetadata;
  errors: string[];
  warnings: string[];
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: SupportedFileType;
  originalRowCount: number;
  finalRowCount: number;
  columnCount: number;
  columns: ColumnInfo[];
  parseOptions: FileParseOptions;
  processingTime: number;
}

export interface ColumnInfo {
  name: string;
  originalName: string;
  inferredType: DataType;
  sampleValues: any[];
  nullCount: number;
  uniqueCount: number;
  confidence: number; // 0-1 confidence in type inference
}

export type DataType = 
  | 'string' 
  | 'integer' 
  | 'float' 
  | 'boolean' 
  | 'date' 
  | 'datetime'
  | 'currency'
  | 'percentage'
  | 'unknown';

export interface DataTypeInference {
  type: DataType;
  confidence: number;
  pattern?: string;
  examples: any[];
  reasoning: string;
}

export interface DateDetectionResult {
  isDate: boolean;
  format?: string;
  timezone?: string;
  confidence: number;
  examples: string[];
}

export interface NumericDetectionResult {
  isNumeric: boolean;
  type: 'integer' | 'float' | 'currency' | 'percentage';
  confidence: number;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  currencySymbol?: string;
  examples: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  fileType: SupportedFileType | null;
  errors: string[];
  warnings: string[];
  estimatedRows?: number;
  estimatedColumns?: number;
}

export interface PreviewOptions {
  maxRows?: number;
  maxColumns?: number;
  includeStats?: boolean;
}

export interface FilePreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
  totalColumns: number;
  columnStats?: ColumnStats[];
}

export interface ColumnStats {
  name: string;
  type: DataType;
  nullCount: number;
  uniqueCount: number;
  min?: any;
  max?: any;
  mean?: number;
  examples: any[];
}

// Configuration for automatic delimiter detection
export interface DelimiterDetectionResult {
  delimiter: string;
  confidence: number;
  rowCount: number;
  columnCount: number;
}

// Configuration for encoding detection
export interface EncodingDetectionResult {
  encoding: string;
  confidence: number;
}

// Error types for better error handling
export class FileParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'FileParseError';
  }
}

export class UnsupportedFileTypeError extends FileParseError {
  constructor(fileType: string) {
    super(
      `Unsupported file type: ${fileType}. Supported types: CSV, XLS, XLSX`,
      'UNSUPPORTED_FILE_TYPE',
      { fileType }
    );
  }
}

export class FileReadError extends FileParseError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_READ_ERROR', details);
  }
}

export class DataValidationError extends FileParseError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_VALIDATION_ERROR', details);
  }
}