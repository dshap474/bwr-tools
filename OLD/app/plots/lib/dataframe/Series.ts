// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Series Class                                                                        │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { Index, DatetimeIndex } from './Index';
import { 
  ColumnData, 
  ColumnType, 
  DataValue, 
  RollingOptions, 
  AggFunction,
  FillMethod,
  DataSummary 
} from './types';

/**
 * Rolling window operations for Series
 */
class Rolling {
  constructor(
    private series: Series,
    private options: RollingOptions
  ) {}

  /**
   * Calculate rolling mean
   */
  mean(): Series {
    return this.apply('mean');
  }

  /**
   * Calculate rolling sum
   */
  sum(): Series {
    return this.apply('sum');
  }

  /**
   * Calculate rolling minimum
   */
  min(): Series {
    return this.apply('min');
  }

  /**
   * Calculate rolling maximum
   */
  max(): Series {
    return this.apply('max');
  }

  /**
   * Calculate rolling standard deviation
   */
  std(): Series {
    return this.apply('std');
  }

  /**
   * Apply rolling function
   */
  private apply(func: AggFunction): Series {
    const { window, minPeriods = 1, center = false } = this.options;
    const values = this.series._getNumericData();
    const result = new Float64Array(values.length);
    
    for (let i = 0; i < values.length; i++) {
      let start: number, end: number;
      
      if (center) {
        const halfWindow = Math.floor(window / 2);
        start = Math.max(0, i - halfWindow);
        end = Math.min(values.length, i + halfWindow + 1);
      } else {
        start = Math.max(0, i - window + 1);
        end = i + 1;
      }
      
      const windowValues = values.slice(start, end);
      const validValues = windowValues.filter(v => !isNaN(v));
      
      if (validValues.length >= minPeriods) {
        result[i] = this.calculateAggregation(validValues, func);
      } else {
        result[i] = NaN;
      }
    }
    
    return new Series(result, this.series._index, this.series._name, ColumnType.FLOAT);
  }

  /**
   * Calculate aggregation function on array
   */
  private calculateAggregation(values: number[], func: AggFunction): number {
    switch (func) {
      case 'mean':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'std':
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      default:
        throw new Error(`Unsupported aggregation function: ${func}`);
    }
  }
}

/**
 * Series class representing a single column of data
 */
export class Series {
  private _data: ColumnData;
  protected _index: Index;
  protected _name?: string;
  private _dtype: ColumnType;

  constructor(
    data: ColumnData | DataValue[],
    index?: Index | DataValue[],
    name?: string,
    dtype?: ColumnType
  ) {
    // Handle index
    if (index) {
      this._index = Array.isArray(index) ? new Index(index) : index;
    } else {
      // Create default numeric index
      const length = Array.isArray(data) ? data.length : data.length;
      this._index = new Index(Array.from({ length }, (_, i) => i));
    }

    this._name = name;

    // Convert data to appropriate format and infer type
    if (Array.isArray(data)) {
      const { convertedData, inferredType } = this.convertAndInferType(data);
      this._data = convertedData;
      this._dtype = dtype || inferredType;
    } else {
      this._data = data;
      this._dtype = dtype || this.inferTypeFromTypedArray(data);
    }

    // Validate lengths match
    if (this._data.length !== this._index.length) {
      throw new Error('Length of data and index must match');
    }
  }

  /**
   * Convert array data to typed arrays and infer type
   */
  private convertAndInferType(data: DataValue[]): { convertedData: ColumnData; inferredType: ColumnType } {
    if (data.length === 0) {
      return { convertedData: new Float64Array(0), inferredType: ColumnType.FLOAT };
    }

    // Sample first few non-null values to infer type
    const sample = data.filter(v => v != null).slice(0, 10);
    
    if (sample.every(v => v instanceof Date)) {
      return { convertedData: data as Date[], inferredType: ColumnType.DATE };
    }
    
    if (sample.every(v => typeof v === 'boolean')) {
      return { convertedData: data as boolean[], inferredType: ColumnType.BOOLEAN };
    }
    
    if (sample.every(v => typeof v === 'string')) {
      return { convertedData: data as string[], inferredType: ColumnType.STRING };
    }
    
    if (sample.every(v => Number.isInteger(Number(v)))) {
      const intArray = new Int32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        intArray[i] = data[i] == null ? 0 : Number(data[i]);
      }
      return { convertedData: intArray, inferredType: ColumnType.INTEGER };
    }
    
    if (sample.every(v => !isNaN(Number(v)))) {
      const floatArray = new Float64Array(data.length);
      for (let i = 0; i < data.length; i++) {
        floatArray[i] = data[i] == null ? NaN : Number(data[i]);
      }
      return { convertedData: floatArray, inferredType: ColumnType.FLOAT };
    }
    
    // Default to string
    return { convertedData: data.map(v => String(v || '')) as string[], inferredType: ColumnType.STRING };
  }

  /**
   * Infer type from typed array
   */
  private inferTypeFromTypedArray(data: ColumnData): ColumnType {
    if (data instanceof Float64Array) return ColumnType.FLOAT;
    if (data instanceof Int32Array) return ColumnType.INTEGER;
    if (Array.isArray(data) && data.length > 0) {
      if (data[0] instanceof Date) return ColumnType.DATE;
      if (typeof data[0] === 'boolean') return ColumnType.BOOLEAN;
      return ColumnType.STRING;
    }
    return ColumnType.STRING;
  }

  /**
   * Get numeric data for calculations
   */
  _getNumericData(): Float64Array {
    if (this._data instanceof Float64Array) {
      return this._data;
    }
    if (this._data instanceof Int32Array) {
      return new Float64Array(this._data);
    }
    throw new Error(`Cannot get numeric data from ${this._dtype} series`);
  }

  // Properties
  get length(): number {
    return this._data.length;
  }

  get name(): string | undefined {
    return this._name;
  }

  get dtype(): ColumnType {
    return this._dtype;
  }

  get index(): Index {
    return this._index;
  }

  get shape(): [number] {
    return [this.length];
  }

  /**
   * Get value at position
   */
  iloc(position: number): DataValue {
    if (position < 0 || position >= this.length) {
      throw new Error(`Position ${position} out of bounds`);
    }
    return this._data[position];
  }

  /**
   * Get value by index label
   */
  loc(label: DataValue): DataValue {
    const position = this._index.indexOf(label);
    if (position === -1) {
      throw new Error(`Label ${label} not found in index`);
    }
    return this._data[position];
  }

  /**
   * Get slice of series
   */
  slice(start?: number, end?: number): Series {
    const slicedData = Array.isArray(this._data) 
      ? this._data.slice(start, end)
      : this._data.slice(start, end);
    const slicedIndex = this._index.slice(start, end);
    return new Series(slicedData, slicedIndex, this._name, this._dtype);
  }

  /**
   * Get first n values
   */
  head(n: number = 5): Series {
    return this.slice(0, n);
  }

  /**
   * Get last n values
   */
  tail(n: number = 5): Series {
    return this.slice(-n);
  }

  /**
   * Check for null/NaN values
   */
  isna(): boolean[] {
    const result = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      const value = this._data[i];
      result[i] = value == null || (typeof value === 'number' && isNaN(value));
    }
    return result;
  }

  /**
   * Check for non-null values
   */
  notna(): boolean[] {
    return this.isna().map(x => !x);
  }

  /**
   * Drop null/NaN values
   */
  dropna(): Series {
    const validIndices: number[] = [];
    for (let i = 0; i < this.length; i++) {
      const value = this._data[i];
      if (value != null && !(typeof value === 'number' && isNaN(value))) {
        validIndices.push(i);
      }
    }

    const newData = Array.isArray(this._data)
      ? validIndices.map(i => this._data[i])
      : validIndices.map(i => this._data[i]);
    const newIndex = new Index(validIndices.map(i => this._index.get(i)));

    return new Series(newData, newIndex, this._name, this._dtype);
  }

  /**
   * Fill null/NaN values
   */
  fillna(value: DataValue | FillMethod): Series {
    if (typeof value === 'string') {
      return this.fillnaMethod(value as FillMethod);
    }

    const filled = Array.isArray(this._data) ? [...this._data] : Array.from(this._data);
    for (let i = 0; i < filled.length; i++) {
      const current = filled[i];
      if (current == null || (typeof current === 'number' && isNaN(current))) {
        filled[i] = value;
      }
    }

    return new Series(filled, this._index.copy(), this._name, this._dtype);
  }

  /**
   * Fill using method
   */
  private fillnaMethod(method: FillMethod): Series {
    const filled = Array.isArray(this._data) ? [...this._data] : Array.from(this._data);

    switch (method) {
      case 'forward':
        for (let i = 1; i < filled.length; i++) {
          const current = filled[i];
          if (current == null || (typeof current === 'number' && isNaN(current))) {
            filled[i] = filled[i - 1];
          }
        }
        break;
      case 'backward':
        for (let i = filled.length - 2; i >= 0; i--) {
          const current = filled[i];
          if (current == null || (typeof current === 'number' && isNaN(current))) {
            filled[i] = filled[i + 1];
          }
        }
        break;
      default:
        throw new Error(`Unsupported fill method: ${method}`);
    }

    return new Series(filled, this._index.copy(), this._name, this._dtype);
  }

  /**
   * Count non-null values
   */
  count(): number {
    return this.notna().filter(Boolean).length;
  }

  /**
   * Calculate mean (numeric only)
   */
  mean(): number {
    const numData = this._getNumericData();
    const valid = Array.from(numData).filter(x => !isNaN(x));
    if (valid.length === 0) return NaN;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  /**
   * Calculate sum (numeric only)
   */
  sum(): number {
    const numData = this._getNumericData();
    return Array.from(numData).filter(x => !isNaN(x)).reduce((a, b) => a + b, 0);
  }

  /**
   * Calculate minimum (numeric only)
   */
  min(): number {
    const numData = this._getNumericData();
    const valid = Array.from(numData).filter(x => !isNaN(x));
    if (valid.length === 0) return NaN;
    return Math.min(...valid);
  }

  /**
   * Calculate maximum (numeric only)
   */
  max(): number {
    const numData = this._getNumericData();
    const valid = Array.from(numData).filter(x => !isNaN(x));
    if (valid.length === 0) return NaN;
    return Math.max(...valid);
  }

  /**
   * Calculate standard deviation (numeric only)
   */
  std(): number {
    const mean = this.mean();
    if (isNaN(mean)) return NaN;
    
    const numData = this._getNumericData();
    const valid = Array.from(numData).filter(x => !isNaN(x));
    if (valid.length <= 1) return NaN;
    
    const variance = valid.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (valid.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Calculate quantile
   */
  quantile(q: number): number {
    if (q < 0 || q > 1) {
      throw new Error('Quantile must be between 0 and 1');
    }
    
    const numData = this._getNumericData();
    const valid = Array.from(numData).filter(x => !isNaN(x)).sort((a, b) => a - b);
    
    if (valid.length === 0) return NaN;
    if (valid.length === 1) return valid[0];
    
    const index = q * (valid.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return valid[lower];
    }
    
    const weight = index - lower;
    return valid[lower] * (1 - weight) + valid[upper] * weight;
  }

  /**
   * Calculate median
   */
  median(): number {
    return this.quantile(0.5);
  }

  /**
   * Generate descriptive statistics
   */
  describe(): DataSummary {
    if (this._dtype === ColumnType.STRING || this._dtype === ColumnType.BOOLEAN) {
      return {
        count: this.count(),
      };
    }

    return {
      count: this.count(),
      mean: this.mean(),
      std: this.std(),
      min: this.min(),
      q25: this.quantile(0.25),
      q50: this.median(),
      q75: this.quantile(0.75),
      max: this.max(),
    };
  }

  /**
   * Get unique values
   */
  unique(): DataValue[] {
    const unique = new Set();
    for (let i = 0; i < this.length; i++) {
      unique.add(this._data[i]);
    }
    return Array.from(unique);
  }

  /**
   * Count unique values
   */
  nunique(): number {
    return this.unique().length;
  }

  /**
   * Value counts
   */
  valueCounts(): Map<DataValue, number> {
    const counts = new Map();
    for (let i = 0; i < this.length; i++) {
      const value = this._data[i];
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
  }

  /**
   * Sort values
   */
  sort(ascending: boolean = true): Series {
    const indices = Array.from({ length: this.length }, (_, i) => i);
    indices.sort((a, b) => {
      const valA = this._data[a];
      const valB = this._data[b];
      
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });

    const sortedData = indices.map(i => this._data[i]);
    const sortedIndex = new Index(indices.map(i => this._index.get(i)));

    return new Series(sortedData, sortedIndex, this._name, this._dtype);
  }

  /**
   * Rolling window operations
   */
  rolling(options: RollingOptions): Rolling {
    return new Rolling(this, options);
  }

  /**
   * Create a copy of the series
   */
  copy(): Series {
    const dataCopy = Array.isArray(this._data) ? [...this._data] : this._data.slice();
    return new Series(dataCopy, this._index.copy(), this._name, this._dtype);
  }

  /**
   * Convert to array
   */
  toArray(): DataValue[] {
    return Array.from(this._data);
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, DataValue> {
    const result: Record<string, DataValue> = {};
    for (let i = 0; i < this.length; i++) {
      const key = String(this._index.get(i));
      result[key] = this._data[i];
    }
    return result;
  }

  /**
   * String representation
   */
  toString(): string {
    const preview = [];
    const maxItems = 10;
    
    for (let i = 0; i < Math.min(this.length, maxItems); i++) {
      const indexLabel = this._index.get(i);
      const value = this._data[i];
      preview.push(`${indexLabel}: ${value}`);
    }
    
    if (this.length > maxItems) {
      preview.push('...');
    }
    
    const nameStr = this._name ? `Name: ${this._name}, ` : '';
    return `${preview.join('\n')}\n${nameStr}Length: ${this.length}, dtype: ${this._dtype}`;
  }
}