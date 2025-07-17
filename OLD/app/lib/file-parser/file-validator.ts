// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ File Validation Utilities                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

import {
  SupportedFileType,
  FileValidationResult,
  UnsupportedFileTypeError
} from './types';

// File size limits (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// File type detection by extension and MIME type
const FILE_TYPE_PATTERNS = {
  csv: {
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'application/csv', 'text/plain']
  },
  xlsx: {
    extensions: ['.xlsx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip'
    ]
  },
  xls: {
    extensions: ['.xls'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/msexcel'
    ]
  }
};

/**
 * Validate file before parsing
 */
export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`);
  } else if (file.size > WARN_FILE_SIZE) {
    warnings.push(`Large file detected (${formatFileSize(file.size)}). Parsing may take longer than usual.`);
  }
  
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  // Detect file type
  const fileType = detectFileType(file);
  
  if (!fileType) {
    const extension = getFileExtension(file.name);
    errors.push(`Unsupported file type${extension ? ` '${extension}'` : ''}. Supported formats: CSV, XLS, XLSX`);
  }
  
  // Estimate data size for performance warnings
  let estimatedRows: number | undefined;
  let estimatedColumns: number | undefined;
  
  if (fileType === 'csv') {
    // Rough estimate: average 50 bytes per cell, 10 columns
    estimatedRows = Math.floor(file.size / (50 * 10));
    estimatedColumns = 10;
    
    if (estimatedRows > 100000) {
      warnings.push(`Large dataset estimated (~${estimatedRows.toLocaleString()} rows). Consider processing in smaller chunks.`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    fileType,
    errors,
    warnings,
    estimatedRows,
    estimatedColumns
  };
}

/**
 * Detect file type from file name and MIME type
 */
export function detectFileType(file: File): SupportedFileType | null {
  const extension = getFileExtension(file.name).toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  for (const [type, patterns] of Object.entries(FILE_TYPE_PATTERNS)) {
    const { extensions, mimeTypes } = patterns;
    
    // Check extension first (most reliable)
    if (extensions.some(ext => extension === ext)) {
      return type as SupportedFileType;
    }
    
    // Fallback to MIME type
    if (mimeTypes.some(mime => mimeType === mime || mimeType.includes(mime))) {
      return type as SupportedFileType;
    }
  }
  
  return null;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot);
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const base = 1024;
  const digitGroups = Math.floor(Math.log(bytes) / Math.log(base));
  
  return `${(bytes / Math.pow(base, digitGroups)).toFixed(1)} ${units[digitGroups]}`;
}

/**
 * Validate parse options
 */
export function validateParseOptions(
  fileType: SupportedFileType,
  options: Record<string, any>
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate maxRows
  if (options.maxRows !== undefined) {
    if (!Number.isInteger(options.maxRows) || options.maxRows <= 0) {
      errors.push('maxRows must be a positive integer');
    } else if (options.maxRows > 1000000) {
      warnings.push('maxRows is very large and may cause performance issues');
    }
  }
  
  // Validate skipFirstNRows
  if (options.skipFirstNRows !== undefined) {
    if (!Number.isInteger(options.skipFirstNRows) || options.skipFirstNRows < 0) {
      errors.push('skipFirstNRows must be a non-negative integer');
    }
  }
  
  // CSV-specific validations
  if (fileType === 'csv') {
    if (options.delimiter !== undefined) {
      if (typeof options.delimiter !== 'string' || options.delimiter.length !== 1) {
        errors.push('CSV delimiter must be a single character');
      }
    }
    
    if (options.encoding !== undefined) {
      const supportedEncodings = ['utf-8', 'utf-16', 'iso-8859-1', 'windows-1252'];
      if (!supportedEncodings.includes(options.encoding.toLowerCase())) {
        warnings.push(`Encoding '${options.encoding}' may not be supported. Recommended: ${supportedEncodings.join(', ')}`);
      }
    }
  }
  
  // Excel-specific validations
  if (fileType === 'xlsx' || fileType === 'xls') {
    if (options.sheetIndex !== undefined) {
      if (!Number.isInteger(options.sheetIndex) || options.sheetIndex < 0) {
        errors.push('sheetIndex must be a non-negative integer');
      }
    }
    
    if (options.sheetName !== undefined) {
      if (typeof options.sheetName !== 'string' || options.sheetName.trim().length === 0) {
        errors.push('sheetName must be a non-empty string');
      }
    }
    
    if (options.sheetIndex !== undefined && options.sheetName !== undefined) {
      warnings.push('Both sheetIndex and sheetName specified. sheetName will take precedence.');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if browser supports File API features needed for parsing
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check essential APIs
  if (typeof FileReader === 'undefined') {
    missing.push('FileReader API');
  }
  
  if (typeof File === 'undefined') {
    missing.push('File API');
  }
  
  if (typeof ArrayBuffer === 'undefined') {
    missing.push('ArrayBuffer');
  }
  
  // Check optional but recommended features
  if (typeof Worker === 'undefined') {
    warnings.push('Web Workers not supported - large file processing may block UI');
  }
  
  if (!('performance' in window) || typeof performance.now !== 'function') {
    warnings.push('Performance API not available - timing information will be limited');
  }
  
  return {
    supported: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Sanitize filename for safe display/storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .substring(0, 255) // Limit length
    || 'unnamed_file';
}

/**
 * Extract metadata from file without parsing content
 */
export function extractFileMetadata(file: File): {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  extension: string;
  sanitizedName: string;
} {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    extension: getFileExtension(file.name),
    sanitizedName: sanitizeFilename(file.name)
  };
}