// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ DataFrame Class                                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { Series } from './Series';
import { Index, DatetimeIndex } from './Index';
import {
  ColumnData,
  ColumnType,
  DataValue,
  DataFrameData,
  DataFrameOptions,
  DataFrameInfo,
  ResampleOptions,
  RollingOptions,
  AggFunction,
  FillMethod,
  ExportFormat,
  Indexer,
  isNumericType,
  isDateType
} from './types';

/**
 * Resampler class for time series operations
 */
class Resampler {
  constructor(
    private dataframe: DataFrame,
    private dateColumn: string,
    private rule: string
  ) {}

  /**
   * Resample and aggregate by mean
   */
  mean(): DataFrame {
    return this.aggregate('mean');
  }

  /**
   * Resample and aggregate by sum
   */
  sum(): DataFrame {
    return this.aggregate('sum');
  }

  /**
   * Resample and aggregate by count
   */
  count(): DataFrame {
    return this.aggregate('count');
  }

  /**
   * Resample and aggregate by min
   */
  min(): DataFrame {
    return this.aggregate('min');
  }

  /**
   * Resample and aggregate by max
   */
  max(): DataFrame {
    return this.aggregate('max');
  }

  /**
   * Apply aggregation function
   */
  private aggregate(func: AggFunction): DataFrame {
    // This is a simplified implementation
    // In a full implementation, this would group by time periods and aggregate
    const df = this.dataframe.copy();
    
    // For now, return the original dataframe
    // TODO: Implement proper time-based resampling
    return df;
  }
}

/**
 * DataFrame class representing tabular data
 */
export class DataFrame {
  private _data: Map<string, ColumnData>;
  private _index: Index;
  private _columns: string[];
  private _dtypes: Map<string, ColumnType>;
  private _manipulationHistory: any[] = [];

  constructor(
    data?: DataFrameData,
    options: DataFrameOptions = {}
  ) {
    this._data = new Map();
    this._dtypes = new Map();
    
    // Initialize from data
    if (data) {
      this.initializeFromData(data, options);
    } else {
      this._columns = options.columns || [];
      this._index = options.index ? new Index(options.index) : new Index([]);
    }
  }

  /**
   * Initialize DataFrame from various data formats
   */
  private initializeFromData(data: DataFrameData, options: DataFrameOptions): void {
    if (Array.isArray(data)) {
      if (data.length === 0) {
        this._columns = options.columns || [];
        this._index = options.index ? new Index(options.index) : new Index([]);
        return;
      }

      // Handle array of arrays (2D array)
      if (Array.isArray(data[0])) {
        this.initializeFrom2DArray(data as DataValue[][], options);
      } else {
        // Handle array of objects (records)
        this.initializeFromRecords(data as Record<string, DataValue>[], options);
      }
    } else if (data instanceof Map) {
      this.initializeFromMap(data, options);
    } else if (typeof data === 'object') {
      this.initializeFromObject(data as Record<string, DataValue[]>, options);
    } else {
      throw new Error('Unsupported data format');
    }
  }

  /**
   * Initialize from 2D array
   */
  private initializeFrom2DArray(data: DataValue[][], options: DataFrameOptions): void {
    const numRows = data.length;
    const numCols = numRows > 0 ? data[0].length : 0;
    
    this._columns = options.columns || Array.from({ length: numCols }, (_, i) => `col_${i}`);
    this._index = options.index ? new Index(options.index) : new Index(Array.from({ length: numRows }, (_, i) => i));
    
    // Transpose data to column-major format
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      const columnName = this._columns[colIdx];
      const columnData = data.map(row => row[colIdx]);
      const series = new Series(columnData, this._index, columnName);
      this._data.set(columnName, series['_data']);
      this._dtypes.set(columnName, series.dtype);
    }
  }

  /**
   * Initialize from array of records
   */
  private initializeFromRecords(data: Record<string, DataValue>[], options: DataFrameOptions): void {
    if (data.length === 0) {
      this._columns = options.columns || [];
      this._index = options.index ? new Index(options.index) : new Index([]);
      return;
    }

    // Get all unique column names
    const allColumns = new Set<string>();
    data.forEach(record => {
      Object.keys(record).forEach(key => allColumns.add(key));
    });
    
    this._columns = options.columns || Array.from(allColumns);
    this._index = options.index ? new Index(options.index) : new Index(Array.from({ length: data.length }, (_, i) => i));
    
    // Create columns
    for (const columnName of this._columns) {
      const columnData = data.map(record => record[columnName] ?? null);
      const series = new Series(columnData, this._index, columnName);
      this._data.set(columnName, series['_data']);
      this._dtypes.set(columnName, series.dtype);
    }
  }

  /**
   * Initialize from Map
   */
  private initializeFromMap(data: Map<string, DataValue[]>, options: DataFrameOptions): void {
    this._columns = options.columns || Array.from(data.keys());
    
    // Determine number of rows
    const lengths = Array.from(data.values()).map(arr => arr.length);
    const maxLength = Math.max(...lengths, 0);
    
    this._index = options.index ? new Index(options.index) : new Index(Array.from({ length: maxLength }, (_, i) => i));
    
    // Create columns
    for (const [columnName, columnData] of data) {
      if (this._columns.includes(columnName)) {
        const series = new Series(columnData, this._index, columnName);
        this._data.set(columnName, series['_data']);
        this._dtypes.set(columnName, series.dtype);
      }
    }
  }

  /**
   * Initialize from object
   */
  private initializeFromObject(data: Record<string, DataValue[]>, options: DataFrameOptions): void {
    this.initializeFromMap(new Map(Object.entries(data)), options);
  }

  // Properties
  get shape(): [number, number] {
    return [this._index.length, this._columns.length];
  }

  get columns(): string[] {
    return [...this._columns];
  }

  get index(): Index {
    return this._index;
  }

  get dtypes(): Record<string, ColumnType> {
    const result: Record<string, ColumnType> = {};
    for (const [col, dtype] of this._dtypes) {
      result[col] = dtype;
    }
    return result;
  }

  get size(): number {
    return this.shape[0] * this.shape[1];
  }

  get empty(): boolean {
    return this.shape[0] === 0 || this.shape[1] === 0;
  }

  /**
   * Get column as Series
   */
  getColumn(column: string): Series {
    if (!this._columns.includes(column)) {
      throw new Error(`Column '${column}' not found`);
    }
    
    const data = this._data.get(column)!;
    const dtype = this._dtypes.get(column)!;
    return new Series(data, this._index, column, dtype);
  }

  /**
   * Set column data
   */
  setColumn(column: string, data: Series | DataValue[]): void {
    let series: Series;
    
    if (data instanceof Series) {
      series = data;
    } else {
      series = new Series(data, this._index, column);
    }
    
    if (series.length !== this._index.length) {
      throw new Error('Length of data must match DataFrame index length');
    }
    
    if (!this._columns.includes(column)) {
      this._columns.push(column);
    }
    
    this._data.set(column, series['_data']);
    this._dtypes.set(column, series.dtype);
  }

  /**
   * Access by column name (like df['column'])
   */
  get(column: string): Series {
    return this.getColumn(column);
  }

  /**
   * Integer-location based indexing
   */
  iloc(rowIndexer: Indexer, colIndexer?: Indexer): DataFrame | Series | DataValue {
    if (typeof rowIndexer === 'number' && colIndexer === undefined) {
      // Single row
      return this.getRow(rowIndexer);
    }
    
    if (Array.isArray(rowIndexer) && colIndexer === undefined) {
      // Multiple rows
      return this.getRows(rowIndexer);
    }
    
    if (typeof rowIndexer === 'number' && typeof colIndexer === 'number') {
      // Single cell
      const column = this._columns[colIndexer];
      const data = this._data.get(column)!;
      return data[rowIndexer];
    }
    
    // Handle other combinations...
    throw new Error('Complex iloc indexing not yet implemented');
  }

  /**
   * Label-based indexing
   */
  loc(rowIndexer: Indexer, colIndexer?: Indexer): DataFrame | Series | DataValue {
    // Simplified implementation
    if (typeof rowIndexer === 'string' || typeof rowIndexer === 'number') {
      const position = this._index.indexOf(rowIndexer);
      if (position === -1) {
        throw new Error(`Index label '${rowIndexer}' not found`);
      }
      return this.iloc(position, colIndexer);
    }
    
    throw new Error('Complex loc indexing not yet implemented');
  }

  /**
   * Get single row as Series
   */
  private getRow(index: number): Series {
    if (index < 0 || index >= this.shape[0]) {
      throw new Error(`Row index ${index} out of bounds`);
    }
    
    const rowData: DataValue[] = [];
    for (const column of this._columns) {
      const colData = this._data.get(column)!;
      rowData.push(colData[index]);
    }
    
    return new Series(rowData, new Index(this._columns), String(this._index.get(index)));
  }

  /**
   * Get multiple rows as DataFrame
   */
  private getRows(indices: number[]): DataFrame {
    const newData: Record<string, DataValue[]> = {};
    const newIndex: DataValue[] = [];
    
    for (const idx of indices) {
      if (idx < 0 || idx >= this.shape[0]) {
        throw new Error(`Row index ${idx} out of bounds`);
      }
      newIndex.push(this._index.get(idx));
    }
    
    for (const column of this._columns) {
      const colData = this._data.get(column)!;
      newData[column] = indices.map(idx => colData[idx]);
    }
    
    return new DataFrame(newData, { index: newIndex, columns: this._columns });
  }

  /**
   * Get first n rows
   */
  head(n: number = 5): DataFrame {
    const indices = Array.from({ length: Math.min(n, this.shape[0]) }, (_, i) => i);
    return this.getRows(indices);
  }

  /**
   * Get last n rows
   */
  tail(n: number = 5): DataFrame {
    const start = Math.max(0, this.shape[0] - n);
    const indices = Array.from({ length: this.shape[0] - start }, (_, i) => start + i);
    return this.getRows(indices);
  }

  /**
   * Drop columns
   */
  drop(columns: string | string[]): DataFrame {
    const colsToDrop = Array.isArray(columns) ? columns : [columns];
    const newColumns = this._columns.filter(col => !colsToDrop.includes(col));
    
    const newData: Record<string, DataValue[]> = {};
    for (const column of newColumns) {
      newData[column] = Array.from(this._data.get(column)!);
    }
    
    return new DataFrame(newData, { index: this._index.toArray(), columns: newColumns });
  }

  /**
   * Rename columns
   */
  rename(mapping: Record<string, string>): DataFrame {
    const newColumns = this._columns.map(col => mapping[col] || col);
    const newData: Record<string, DataValue[]> = {};
    
    for (let i = 0; i < this._columns.length; i++) {
      const oldName = this._columns[i];
      const newName = newColumns[i];
      newData[newName] = Array.from(this._data.get(oldName)!);
    }
    
    return new DataFrame(newData, { index: this._index.toArray(), columns: newColumns });
  }

  /**
   * Convenience method aliases for data manipulation components
   */
  dropColumns(columns: string[]): DataFrame {
    return this.drop(columns);
  }

  renameColumns(mapping: Record<string, string>): DataFrame {
    return this.rename(mapping);
  }

  /**
   * Pivot table operation
   */
  pivot(config: {
    indexColumn: string;
    pivotColumn: string;
    valueColumn: string;
    aggFunction: 'first' | 'mean' | 'sum' | 'count' | 'median' | 'min' | 'max';
  }): DataFrame {
    const { indexColumn, pivotColumn, valueColumn, aggFunction } = config;

    // Validate columns exist
    if (!this._columns.includes(indexColumn)) {
      throw new Error(`Index column '${indexColumn}' not found`);
    }
    if (!this._columns.includes(pivotColumn)) {
      throw new Error(`Pivot column '${pivotColumn}' not found`);
    }
    if (!this._columns.includes(valueColumn)) {
      throw new Error(`Value column '${valueColumn}' not found`);
    }

    // Get data arrays
    const indexData = this._data.get(indexColumn)!;
    const pivotData = this._data.get(pivotColumn)!;
    const valueData = this._data.get(valueColumn)!;

    // Get unique values for index and pivot columns
    const uniqueIndexValues = [...new Set(indexData)];
    const uniquePivotValues = [...new Set(pivotData)].sort();

    // Create aggregation map: index -> pivot -> values[]
    const aggregationMap = new Map<DataValue, Map<DataValue, DataValue[]>>();

    for (let i = 0; i < this.shape[0]; i++) {
      const indexVal = indexData[i];
      const pivotVal = pivotData[i];
      const valueVal = valueData[i];

      if (!aggregationMap.has(indexVal)) {
        aggregationMap.set(indexVal, new Map());
      }
      
      const pivotMap = aggregationMap.get(indexVal)!;
      if (!pivotMap.has(pivotVal)) {
        pivotMap.set(pivotVal, []);
      }
      
      pivotMap.get(pivotVal)!.push(valueVal);
    }

    // Apply aggregation function
    const applyAggregation = (values: DataValue[]): DataValue => {
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      
      switch (aggFunction) {
        case 'first':
          return values.length > 0 ? values[0] : null;
        case 'count':
          return values.length;
        case 'mean':
          return numericValues.length > 0 ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length : null;
        case 'sum':
          return numericValues.length > 0 ? numericValues.reduce((sum, val) => sum + val, 0) : null;
        case 'median':
          if (numericValues.length === 0) return null;
          const sorted = [...numericValues].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        case 'min':
          return numericValues.length > 0 ? Math.min(...numericValues) : null;
        case 'max':
          return numericValues.length > 0 ? Math.max(...numericValues) : null;
        default:
          return null;
      }
    };

    // Build result data
    const resultData: Record<string, DataValue[]> = {};
    const newColumns = [indexColumn, ...uniquePivotValues.map(v => String(v))];

    // Initialize columns
    newColumns.forEach(col => {
      resultData[col] = [];
    });

    // Fill data
    uniqueIndexValues.forEach(indexVal => {
      // Add index value
      resultData[indexColumn].push(indexVal);

      // Add pivot values
      uniquePivotValues.forEach(pivotVal => {
        const colName = String(pivotVal);
        const pivotMap = aggregationMap.get(indexVal);
        const values = pivotMap?.get(pivotVal) || [];
        const aggregatedValue = applyAggregation(values);
        resultData[colName].push(aggregatedValue);
      });
    });

    return new DataFrame(resultData, { columns: newColumns });
  }

  /**
   * Get manipulation history
   */
  getManipulationHistory(): any[] {
    return [...this._manipulationHistory];
  }

  /**
   * Apply multiple manipulations in sequence
   */
  applyManipulations(operations: any[]): DataFrame {
    let result: DataFrame = this;
    
    for (const operation of operations) {
      switch (operation.type) {
        case 'drop_columns':
          result = result.dropColumns(operation.columns);
          break;
        case 'rename_columns':
          result = result.renameColumns(operation.mapping);
          break;
        case 'pivot_data':
          result = result.pivot(operation.config);
          break;
        default:
          console.warn(`Unknown manipulation operation type: ${operation.type}`);
      }
    }
    
    return result;
  }

  /**
   * Drop rows with null values
   */
  dropna(how: 'any' | 'all' = 'any'): DataFrame {
    const validRows: number[] = [];
    
    for (let i = 0; i < this.shape[0]; i++) {
      let hasNull = false;
      let allNull = true;
      
      for (const column of this._columns) {
        const data = this._data.get(column)!;
        const value = data[i];
        const isNull = value == null || (typeof value === 'number' && isNaN(value));
        
        if (isNull) {
          hasNull = true;
        } else {
          allNull = false;
        }
      }
      
      if (how === 'any' && !hasNull) {
        validRows.push(i);
      } else if (how === 'all' && !allNull) {
        validRows.push(i);
      }
    }
    
    return this.getRows(validRows);
  }

  /**
   * Fill null values
   */
  fillna(value: DataValue | Record<string, DataValue> | FillMethod): DataFrame {
    const newData: Record<string, DataValue[]> = {};
    
    for (const column of this._columns) {
      const series = this.getColumn(column);
      
      let fillValue: DataValue | FillMethod;
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        fillValue = (value as Record<string, DataValue>)[column] ?? value;
      } else {
        fillValue = value as DataValue | FillMethod;
      }
      
      const filled = series.fillna(fillValue);
      newData[column] = filled.toArray();
    }
    
    return new DataFrame(newData, { index: this._index.toArray(), columns: this._columns });
  }

  /**
   * Select only numeric columns
   */
  selectDtypes(include?: ColumnType[]): DataFrame {
    const selectedColumns = this._columns.filter(col => {
      const dtype = this._dtypes.get(col)!;
      return include ? include.includes(dtype) : isNumericType(dtype);
    });
    
    const newData: Record<string, DataValue[]> = {};
    for (const column of selectedColumns) {
      newData[column] = Array.from(this._data.get(column)!);
    }
    
    return new DataFrame(newData, { index: this._index.toArray(), columns: selectedColumns });
  }

  /**
   * Generate descriptive statistics
   */
  describe(): DataFrame {
    const numericCols = this._columns.filter(col => isNumericType(this._dtypes.get(col)!));
    
    if (numericCols.length === 0) {
      throw new Error('No numeric columns to describe');
    }
    
    const stats = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'];
    const result: Record<string, number[]> = {};
    
    for (const col of numericCols) {
      const series = this.getColumn(col);
      const desc = series.describe();
      
      result[col] = [
        desc.count || 0,
        desc.mean || NaN,
        desc.std || NaN,
        desc.min || NaN,
        desc.q25 || NaN,
        desc.q50 || NaN,
        desc.q75 || NaN,
        desc.max || NaN,
      ];
    }
    
    return new DataFrame(result, { index: stats, columns: numericCols });
  }

  /**
   * Get DataFrame info
   */
  info(): DataFrameInfo {
    const nullCounts: Record<string, number> = {};
    let totalMemory = 0;
    
    for (const column of this._columns) {
      const series = this.getColumn(column);
      const nullCount = series.length - series.count();
      nullCounts[column] = nullCount;
      
      // Estimate memory usage (rough approximation)
      const data = this._data.get(column)!;
      if (data instanceof Float64Array || data instanceof Int32Array) {
        totalMemory += data.byteLength;
      } else {
        totalMemory += (data as any[]).length * 8; // Rough estimate for strings/objects
      }
    }
    
    return {
      shape: this.shape,
      columns: this.columns,
      dtypes: this.dtypes,
      memoryUsage: totalMemory,
      nullCounts,
    };
  }

  /**
   * Apply function to each column
   */
  apply(func: (series: Series) => DataValue, axis: 0 | 1 = 0): Series | DataFrame {
    if (axis === 0) {
      // Apply to each column
      const results: DataValue[] = [];
      for (const column of this._columns) {
        const series = this.getColumn(column);
        results.push(func(series));
      }
      return new Series(results, new Index(this._columns));
    } else {
      // Apply to each row (not implemented)
      throw new Error('Row-wise apply not yet implemented');
    }
  }

  /**
   * Group by column values
   */
  groupby(column: string): any {
    // Simplified groupby - return object with aggregate methods
    const groups = new Map<DataValue, number[]>();
    const colData = this._data.get(column)!;
    
    for (let i = 0; i < this.shape[0]; i++) {
      const key = colData[i];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(i);
    }
    
    return {
      mean: () => this.groupAggregate(groups, 'mean'),
      sum: () => this.groupAggregate(groups, 'sum'),
      count: () => this.groupAggregate(groups, 'count'),
    };
  }

  /**
   * Helper for group aggregation
   */
  private groupAggregate(groups: Map<DataValue, number[]>, func: AggFunction): DataFrame {
    const groupKeys = Array.from(groups.keys());
    const numericCols = this._columns.filter(col => isNumericType(this._dtypes.get(col)!));
    
    const result: Record<string, DataValue[]> = {};
    
    for (const col of numericCols) {
      result[col] = [];
      const colData = this._data.get(col)! as Float64Array | Int32Array;
      
      for (const key of groupKeys) {
        const indices = groups.get(key)!;
        const values = indices.map(i => colData[i]).filter(v => !isNaN(v));
        
        let aggregated: number;
        switch (func) {
          case 'mean':
            aggregated = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
            break;
          case 'sum':
            aggregated = values.reduce((a, b) => a + b, 0);
            break;
          case 'count':
            aggregated = values.length;
            break;
          default:
            aggregated = NaN;
        }
        
        result[col].push(aggregated);
      }
    }
    
    return new DataFrame(result, { index: groupKeys, columns: numericCols });
  }

  /**
   * Resample time series data
   */
  resample(rule: string, on?: string): Resampler {
    const dateColumn = on || this.findDateColumn();
    if (!dateColumn) {
      throw new Error('No datetime column found for resampling. Specify with "on" parameter.');
    }
    
    return new Resampler(this, dateColumn, rule);
  }

  /**
   * Find the first datetime column
   */
  private findDateColumn(): string | null {
    for (const column of this._columns) {
      if (isDateType(this._dtypes.get(column)!)) {
        return column;
      }
    }
    return null;
  }

  /**
   * Rolling window operations
   */
  rolling(window: number, minPeriods?: number): any {
    return {
      mean: () => this.rollingApply(window, 'mean', minPeriods),
      sum: () => this.rollingApply(window, 'sum', minPeriods),
      min: () => this.rollingApply(window, 'min', minPeriods),
      max: () => this.rollingApply(window, 'max', minPeriods),
    };
  }

  /**
   * Apply rolling function
   */
  private rollingApply(window: number, func: AggFunction, minPeriods?: number): DataFrame {
    const newData: Record<string, DataValue[]> = {};
    
    for (const column of this._columns) {
      const series = this.getColumn(column);
      if (isNumericType(series.dtype)) {
        const rolled = series.rolling({ window, minPeriods });
        switch (func) {
          case 'mean':
            newData[column] = rolled.mean().toArray();
            break;
          case 'sum':
            newData[column] = rolled.sum().toArray();
            break;
          case 'min':
            newData[column] = rolled.min().toArray();
            break;
          case 'max':
            newData[column] = rolled.max().toArray();
            break;
        }
      } else {
        newData[column] = series.toArray();
      }
    }
    
    return new DataFrame(newData, { index: this._index.toArray(), columns: this._columns });
  }

  /**
   * Sort by column values
   */
  sort(by: string | string[], ascending: boolean | boolean[] = true): DataFrame {
    const sortColumns = Array.isArray(by) ? by : [by];
    const ascendingArray = Array.isArray(ascending) ? ascending : [ascending];
    
    // Create array of row indices with sort keys
    const indices = Array.from({ length: this.shape[0] }, (_, i) => i);
    
    indices.sort((a, b) => {
      for (let i = 0; i < sortColumns.length; i++) {
        const column = sortColumns[i];
        const asc = ascendingArray[i] ?? ascendingArray[0];
        const data = this._data.get(column)!;
        
        const valA = data[a];
        const valB = data[b];
        
        if (valA == null && valB == null) continue;
        if (valA == null) return 1;
        if (valB == null) return -1;
        
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
      }
      return 0;
    });
    
    return this.getRows(indices);
  }

  /**
   * Create a copy of the DataFrame
   */
  copy(): DataFrame {
    const newData: Record<string, DataValue[]> = {};
    for (const column of this._columns) {
      newData[column] = Array.from(this._data.get(column)!);
    }
    
    const copy = new DataFrame(newData, { 
      index: this._index.toArray(), 
      columns: this._columns 
    });
    
    // Copy manipulation history
    copy._manipulationHistory = [...this._manipulationHistory];
    
    return copy;
  }

  /**
   * Export to various formats
   */
  to(format: ExportFormat): any {
    switch (format) {
      case 'json':
        return this.toJSON();
      case 'csv':
        return this.toCSV();
      case 'records':
        return this.toRecords();
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert to JSON (column-oriented)
   */
  toJSON(): Record<string, DataValue[]> {
    const result: Record<string, DataValue[]> = {};
    for (const column of this._columns) {
      result[column] = Array.from(this._data.get(column)!);
    }
    return result;
  }

  /**
   * Convert to CSV string
   */
  toCSV(): string {
    const lines: string[] = [];
    
    // Header
    lines.push(this._columns.join(','));
    
    // Data rows
    for (let i = 0; i < this.shape[0]; i++) {
      const row: string[] = [];
      for (const column of this._columns) {
        const data = this._data.get(column)!;
        const value = data[i];
        row.push(value == null ? '' : String(value));
      }
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  /**
   * Convert to array of records
   */
  toRecords(): Record<string, DataValue>[] {
    const records: Record<string, DataValue>[] = [];
    
    for (let i = 0; i < this.shape[0]; i++) {
      const record: Record<string, DataValue> = {};
      for (const column of this._columns) {
        const data = this._data.get(column)!;
        record[column] = data[i];
      }
      records.push(record);
    }
    
    return records;
  }

  /**
   * Set a column as the index
   */
  setIndex(column: string): DataFrame {
    if (!this._columns.includes(column)) {
      throw new Error(`Column '${column}' not found`);
    }

    const indexData = this._data.get(column)!;
    const newIndex = new Index(indexData);
    
    // Create new data without the index column
    const newData: Record<string, DataValue[]> = {};
    for (const col of this._columns) {
      if (col !== column) {
        newData[col] = Array.from(this._data.get(col)!);
      }
    }

    const newColumns = this._columns.filter(col => col !== column);
    
    return new DataFrame(newData, { 
      index: newIndex.toArray(), 
      columns: newColumns 
    });
  }

  /**
   * Convert a column to date type
   */
  convertColumnToDate(column: string): DataFrame {
    if (!this._columns.includes(column)) {
      throw new Error(`Column '${column}' not found`);
    }

    const data = this._data.get(column)!;
    const convertedData = data.map(value => {
      if (value == null) return null;
      
      // Try to parse as date
      const date = new Date(value as any);
      return isNaN(date.getTime()) ? null : date;
    });

    const newData: Record<string, DataValue[]> = {};
    for (const col of this._columns) {
      if (col === column) {
        newData[col] = convertedData;
      } else {
        newData[col] = Array.from(this._data.get(col)!);
      }
    }

    const result = new DataFrame(newData, { 
      index: this._index.toArray(), 
      columns: this._columns 
    });

    // Update dtype
    result._dtypes.set(column, 'datetime');
    
    return result;
  }

  /**
   * Filter data by date range
   */
  filterByDateRange(dateColumn: string, startDate: Date, endDate: Date): DataFrame {
    if (!this._columns.includes(dateColumn)) {
      throw new Error(`Date column '${dateColumn}' not found`);
    }

    const dateData = this._data.get(dateColumn)!;
    const indices: number[] = [];

    for (let i = 0; i < dateData.length; i++) {
      const value = dateData[i];
      if (value == null) continue;

      const date = new Date(value as any);
      if (!isNaN(date.getTime()) && date >= startDate && date <= endDate) {
        indices.push(i);
      }
    }

    return this.getRows(indices);
  }

  /**
   * Resample data with aggregation method
   */
  resample(rule: string, method: AggFunction = 'mean'): DataFrame {
    // This is a simplified implementation
    // In a full implementation, this would group by time periods and aggregate
    
    // For now, we'll just apply rolling aggregation as a proxy
    if (this.shape[0] === 0) return this.copy();
    
    // Map pandas frequency strings to window sizes
    const frequencyToWindow: Record<string, number> = {
      'D': 24,    // Daily
      'W': 168,   // Weekly  
      'ME': 720,  // Month End
      'QE': 2160, // Quarter End
      'YE': 8760, // Year End
      '1H': 1,    // Hourly
      '1min': 1,  // Minute
      '5min': 5,  // 5 minutes
      '15min': 15 // 15 minutes
    };

    const window = frequencyToWindow[rule] || 1;
    
    // Apply rolling aggregation to numeric columns
    const newData: Record<string, DataValue[]> = {};
    
    for (const column of this._columns) {
      const series = this.getColumn(column);
      if (isNumericType(series.dtype)) {
        const rolled = series.rolling({ window });
        switch (method) {
          case 'mean':
            newData[column] = rolled.mean().toArray();
            break;
          case 'sum':
            newData[column] = rolled.sum().toArray();
            break;
          case 'first':
          case 'last':
          case 'min':
          case 'max':
          case 'count':
            // For now, just use mean for these
            newData[column] = rolled.mean().toArray();
            break;
          default:
            newData[column] = series.toArray();
        }
      } else {
        newData[column] = series.toArray();
      }
    }
    
    return new DataFrame(newData, { 
      index: this._index.toArray(), 
      columns: this._columns 
    });
  }

  /**
   * Rolling window with specific method and window size
   */
  rolling(window: number, method: AggFunction = 'mean'): DataFrame {
    const newData: Record<string, DataValue[]> = {};
    
    for (const column of this._columns) {
      const series = this.getColumn(column);
      if (isNumericType(series.dtype)) {
        const rolled = series.rolling({ window });
        switch (method) {
          case 'mean':
            newData[column] = rolled.mean().toArray();
            break;
          case 'sum':
            newData[column] = rolled.sum().toArray();
            break;
          case 'min':
            newData[column] = rolled.min().toArray();
            break;
          case 'max':
            newData[column] = rolled.max().toArray();
            break;
          default:
            newData[column] = rolled.mean().toArray();
        }
      } else {
        newData[column] = series.toArray();
      }
    }
    
    return new DataFrame(newData, { 
      index: this._index.toArray(), 
      columns: this._columns 
    });
  }

  /**
   * String representation
   */
  toString(): string {
    const maxRows = 10;
    const maxCols = 5;
    
    const displayCols = this._columns.slice(0, maxCols);
    const lines: string[] = [];
    
    // Header
    const header = [''].concat(displayCols);
    if (this._columns.length > maxCols) {
      header.push('...');
    }
    lines.push(header.join('\t'));
    
    // Data rows
    const numRowsToShow = Math.min(maxRows, this.shape[0]);
    for (let i = 0; i < numRowsToShow; i++) {
      const row = [String(this._index.get(i))];
      
      for (const column of displayCols) {
        const data = this._data.get(column)!;
        const value = data[i];
        row.push(value == null ? 'NaN' : String(value));
      }
      
      if (this._columns.length > maxCols) {
        row.push('...');
      }
      
      lines.push(row.join('\t'));
    }
    
    if (this.shape[0] > maxRows) {
      lines.push('...');
    }
    
    lines.push(`\n[${this.shape[0]} rows x ${this.shape[1]} columns]`);
    
    return lines.join('\n');
  }
}