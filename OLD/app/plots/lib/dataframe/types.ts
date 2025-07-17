// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ DataFrame Types                                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

// Data types for columns
export enum ColumnType {
  STRING = 'string',
  INTEGER = 'integer',
  FLOAT = 'float',
  DATE = 'date',
  BOOLEAN = 'boolean',
}

// Supported data types for DataFrame values
export type DataValue = number | string | boolean | Date | null | undefined;

// Column data storage types for performance
export type ColumnData = Float64Array | Int32Array | string[] | boolean[] | Date[];

// Indexer types for data access
export type Indexer = number | number[] | string | string[] | boolean[];

// Aggregation functions
export type AggFunction = 'mean' | 'sum' | 'count' | 'min' | 'max' | 'median' | 'std';

// Data orientation for DataFrame construction
export type DataOrientation = 'records' | 'index' | 'columns' | 'values';

// DataFrame constructor data types
export type DataFrameData = 
  | Record<string, DataValue[]>
  | DataValue[][]
  | Map<string, DataValue[]>
  | any[];

// Options for DataFrame operations
export interface DataFrameOptions {
  index?: any[];
  columns?: string[];
  dtype?: ColumnType | Record<string, ColumnType>;
}

// Resampling options
export interface ResampleOptions {
  rule: string; // 'D', 'W', 'M', etc.
  aggFunction?: AggFunction;
  closed?: 'left' | 'right';
  label?: 'left' | 'right';
}

// Rolling window options
export interface RollingOptions {
  window: number;
  minPeriods?: number;
  center?: boolean;
}

// Missing data handling
export type FillMethod = 'forward' | 'backward' | 'linear' | 'value';

// DataFrame slice result
export interface SliceResult {
  data: DataFrameData;
  index: any[];
  columns: string[];
}

// Statistical summary
export interface DataSummary {
  count: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  q25?: number;
  q50?: number;
  q75?: number;
}

// Column statistics
export interface ColumnStats extends DataSummary {
  dtype: ColumnType;
  nullCount: number;
  uniqueCount: number;
}

// DataFrame info
export interface DataFrameInfo {
  shape: [number, number];
  columns: string[];
  dtypes: Record<string, ColumnType>;
  memoryUsage: number;
  nullCounts: Record<string, number>;
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'html' | 'records';

// Data processing operation types
export interface DataOperation {
  type: string;
  params: Record<string, any>;
}

// Filter options for data operations
export interface FilterOptions {
  dateColumn?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  lookbackDays?: number;
}

// Pivot options
export interface PivotOptions {
  index: string;
  columns: string;
  values: string;
  aggFunc?: AggFunction;
  fillValue?: DataValue;
}

// Type guards
export function isNumericType(type: ColumnType): boolean {
  return type === ColumnType.INTEGER || type === ColumnType.FLOAT;
}

export function isDateType(type: ColumnType): boolean {
  return type === ColumnType.DATE;
}

export function isStringType(type: ColumnType): boolean {
  return type === ColumnType.STRING;
}

// Type assertion utilities
export function assertNumericColumn(data: ColumnData): asserts data is Float64Array | Int32Array {
  if (!(data instanceof Float64Array) && !(data instanceof Int32Array)) {
    throw new Error('Expected numeric column data');
  }
}

export function assertStringColumn(data: ColumnData): asserts data is string[] {
  if (!Array.isArray(data) || (data.length > 0 && typeof data[0] !== 'string')) {
    throw new Error('Expected string column data');
  }
}

export function assertDateColumn(data: ColumnData): asserts data is Date[] {
  if (!Array.isArray(data) || (data.length > 0 && !(data[0] instanceof Date))) {
    throw new Error('Expected date column data');
  }
}