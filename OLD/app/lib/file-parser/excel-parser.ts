// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Excel Parser Implementation                                                         │
// └────────────────────────────────────────────────────────────────────────────────────┘

import * as XLSX from 'xlsx';
import { DataFrame } from '../../plots/lib';
import {
  FileParseOptions,
  ParsedFileResult,
  FileMetadata,
  FileParseError,
  FileReadError
} from './types';
import { generateColumnInfo, normalizeColumnName } from './data-inference';

/**
 * Parse Excel file (XLS/XLSX) with XLSX library
 */
export async function parseExcel(
  file: File,
  options: FileParseOptions = {}
): Promise<ParsedFileResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Read file as array buffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new FileParseError('No sheets found in Excel file', 'NO_SHEETS');
    }
    
    // Determine which sheet to use
    let sheetName: string;
    if (options.sheetName) {
      if (!workbook.SheetNames.includes(options.sheetName)) {
        throw new FileParseError(`Sheet '${options.sheetName}' not found. Available sheets: ${workbook.SheetNames.join(', ')}`, 'SHEET_NOT_FOUND');
      }
      sheetName = options.sheetName;
    } else if (options.sheetIndex !== undefined) {
      if (options.sheetIndex < 0 || options.sheetIndex >= workbook.SheetNames.length) {
        throw new FileParseError(`Sheet index ${options.sheetIndex} out of range. Available sheets: 0-${workbook.SheetNames.length - 1}`, 'SHEET_INDEX_OUT_OF_RANGE');
      }
      sheetName = workbook.SheetNames[options.sheetIndex];
    } else {
      // Use first sheet by default
      sheetName = workbook.SheetNames[0];
      if (workbook.SheetNames.length > 1) {
        warnings.push(`Multiple sheets found. Using first sheet: '${sheetName}'. Available sheets: ${workbook.SheetNames.join(', ')}`);
      }
    }
    
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new FileParseError(`Failed to access sheet '${sheetName}'`, 'SHEET_ACCESS_ERROR');
    }
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: null
    }) as any[][];
    
    if (jsonData.length === 0) {
      throw new FileParseError('No data found in Excel sheet', 'NO_DATA');
    }
    
    // Extract headers from first row
    const rawHeaders = jsonData[0] as any[];
    if (!rawHeaders || rawHeaders.length === 0) {
      throw new FileParseError('No column headers found', 'NO_HEADERS');
    }
    
    // Clean and normalize headers
    const headers = rawHeaders.map((header, index) => {
      const cleaned = header ? String(header).trim() : `column_${index + 1}`;
      return normalizeColumnName(cleaned);
    });
    
    // Get data rows (skip header row)
    let dataRows = jsonData.slice(1);
    
    // Handle skipFirstNRows
    if (options.skipFirstNRows && options.skipFirstNRows > 0) {
      dataRows = dataRows.slice(options.skipFirstNRows);
      if (dataRows.length === 0) {
        throw new FileParseError(`All rows were skipped (skipFirstNRows: ${options.skipFirstNRows})`, 'NO_DATA_AFTER_SKIP');
      }
    }
    
    // Filter out completely empty rows
    dataRows = dataRows.filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
    
    if (dataRows.length === 0) {
      throw new FileParseError('No data rows found after filtering empty rows', 'NO_DATA_ROWS');
    }
    
    const originalRowCount = dataRows.length;
    
    // Apply row limit
    if (options.maxRows && dataRows.length > options.maxRows) {
      dataRows = dataRows.slice(0, options.maxRows);
      warnings.push(`Data truncated to ${options.maxRows} rows (original: ${originalRowCount} rows)`);
    }
    
    // Convert to DataFrame format
    const cleanedData: Record<string, any[]> = {};
    
    // Initialize columns
    for (const header of headers) {
      cleanedData[header] = [];
    }
    
    // Process each row
    for (const row of dataRows) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        let value = i < row.length ? row[i] : null;
        
        // Clean up the value
        if (value !== null && value !== undefined) {
          if (typeof value === 'string') {
            value = value.trim();
            if (value === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'na') {
              value = null;
            }
          }
          // Handle Excel date serial numbers
          else if (typeof value === 'number' && isExcelDate(value)) {
            try {
              value = XLSX.SSF.parse_date_code(value);
              if (value) {
                value = new Date(value.y, value.m - 1, value.d, value.H || 0, value.M || 0, value.S || 0);
              }
            } catch (e) {
              // If date parsing fails, keep the original number
              warnings.push(`Failed to parse date value ${value} in column ${header}`);
            }
          }
        }
        
        cleanedData[header].push(value);
      }
    }
    
    // Create DataFrame
    const dataframe = new DataFrame(cleanedData);
    
    // Generate column metadata
    const columnInfo = headers.map(header => 
      generateColumnInfo(header, cleanedData[header], rawHeaders[headers.indexOf(header)] || header)
    );
    
    const processingTime = performance.now() - startTime;
    
    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'xls',
      originalRowCount,
      finalRowCount: dataRows.length,
      columnCount: headers.length,
      columns: columnInfo,
      parseOptions: { ...options, sheetName },
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
    } else if (error instanceof Error) {
      if (error.message.includes('Unsupported file')) {
        errors.push('Unsupported Excel file format. Please ensure the file is a valid .xls or .xlsx file.');
      } else {
        errors.push(`Excel parsing error: ${error.message}`);
      }
    } else {
      errors.push(`Unexpected error: ${String(error)}`);
    }
    
    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'xls',
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
 * Read file as ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as ArrayBuffer);
      } else {
        reject(new FileReadError('Failed to read file content as ArrayBuffer'));
      }
    };
    
    reader.onerror = () => {
      reject(new FileReadError(`File read error: ${reader.error?.message || 'Unknown error'}`));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Check if a number represents an Excel date
 */
function isExcelDate(value: number): boolean {
  // Excel dates are serial numbers starting from 1900
  // Reasonable range: 1 (1900-01-01) to 2958465 (9999-12-31)
  return value > 1 && value < 2958466 && Number.isInteger(value);
}

/**
 * Get sheet information from Excel file
 */
export async function getExcelSheetInfo(file: File): Promise<{
  sheets: Array<{
    name: string;
    index: number;
    range?: string;
    rowCount?: number;
    columnCount?: number;
  }>;
}> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array', bookSheets: true });
  
  const sheets = workbook.SheetNames.map((name, index) => {
    const worksheet = workbook.Sheets[name];
    const range = worksheet['!ref'];
    
    let rowCount = 0;
    let columnCount = 0;
    
    if (range) {
      const decoded = XLSX.utils.decode_range(range);
      rowCount = decoded.e.r - decoded.s.r + 1;
      columnCount = decoded.e.c - decoded.s.c + 1;
    }
    
    return {
      name,
      index,
      range,
      rowCount,
      columnCount
    };
  });
  
  return { sheets };
}

/**
 * Preview Excel data without full parsing
 */
export async function previewExcel(
  file: File,
  options: { maxRows?: number; sheetName?: string; sheetIndex?: number } = {}
): Promise<{ headers: string[]; rows: any[][]; sheetName: string; availableSheets: string[] }> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Determine sheet to preview
  let sheetName: string;
  if (options.sheetName && workbook.SheetNames.includes(options.sheetName)) {
    sheetName = options.sheetName;
  } else if (options.sheetIndex !== undefined && options.sheetIndex < workbook.SheetNames.length) {
    sheetName = workbook.SheetNames[options.sheetIndex];
  } else {
    sheetName = workbook.SheetNames[0];
  }
  
  const worksheet = workbook.Sheets[sheetName];
  const maxRows = (options.maxRows || 20) + 1; // +1 for header
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    range: `A1:Z${maxRows}`, // Limit preview range
    raw: false,
    defval: null
  }) as any[][];
  
  if (jsonData.length === 0) {
    return { headers: [], rows: [], sheetName, availableSheets: workbook.SheetNames };
  }
  
  const headers = jsonData[0]?.map(h => String(h || '').trim()) || [];
  const rows = jsonData.slice(1);
  
  return {
    headers,
    rows,
    sheetName,
    availableSheets: workbook.SheetNames
  };
}