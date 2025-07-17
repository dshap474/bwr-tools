// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Index Classes                                                                       │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataValue } from './types';

/**
 * Base Index class for DataFrame indexing
 */
export class Index {
  protected _data: DataValue[];
  protected _name?: string;

  constructor(data: DataValue[], name?: string) {
    this._data = [...data];
    this._name = name;
  }

  /**
   * Length of the index
   */
  get length(): number {
    return this._data.length;
  }

  /**
   * Name of the index
   */
  get name(): string | undefined {
    return this._name;
  }

  /**
   * Get the underlying data array
   */
  toArray(): DataValue[] {
    return [...this._data];
  }

  /**
   * Get value at position
   */
  get(position: number): DataValue {
    if (position < 0 || position >= this._data.length) {
      throw new Error(`Index out of bounds: ${position}`);
    }
    return this._data[position];
  }

  /**
   * Slice the index
   */
  slice(start?: number, end?: number): Index {
    const sliced = this._data.slice(start, end);
    return new Index(sliced, this._name);
  }

  /**
   * Check if index contains value
   */
  contains(value: DataValue): boolean {
    return this._data.includes(value);
  }

  /**
   * Get position of value
   */
  indexOf(value: DataValue): number {
    return this._data.indexOf(value);
  }

  /**
   * Get positions of multiple values
   */
  getPositions(values: DataValue[]): number[] {
    return values.map(value => this.indexOf(value));
  }

  /**
   * Check if index is monotonic increasing
   */
  isMonotonicIncreasing(): boolean {
    for (let i = 1; i < this._data.length; i++) {
      if (this._data[i] < this._data[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if index is unique
   */
  isUnique(): boolean {
    const seen = new Set();
    for (const value of this._data) {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
    }
    return true;
  }

  /**
   * Get duplicate values
   */
  getDuplicates(): DataValue[] {
    const seen = new Set();
    const duplicates = new Set();
    
    for (const value of this._data) {
      if (seen.has(value)) {
        duplicates.add(value);
      } else {
        seen.add(value);
      }
    }
    
    return Array.from(duplicates);
  }

  /**
   * Remove duplicates, keeping first occurrence
   */
  dropDuplicates(): Index {
    const unique = [];
    const seen = new Set();
    
    for (const value of this._data) {
      if (!seen.has(value)) {
        unique.push(value);
        seen.add(value);
      }
    }
    
    return new Index(unique, this._name);
  }

  /**
   * Sort the index
   */
  sort(ascending: boolean = true): Index {
    const sorted = [...this._data].sort((a, b) => {
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      
      if (a < b) return ascending ? -1 : 1;
      if (a > b) return ascending ? 1 : -1;
      return 0;
    });
    
    return new Index(sorted, this._name);
  }

  /**
   * Union with another index
   */
  union(other: Index): Index {
    const combined = new Set([...this._data, ...other._data]);
    return new Index(Array.from(combined), this._name);
  }

  /**
   * Intersection with another index
   */
  intersection(other: Index): Index {
    const otherSet = new Set(other._data);
    const intersection = this._data.filter(value => otherSet.has(value));
    return new Index(intersection, this._name);
  }

  /**
   * Check equality with another index
   */
  equals(other: Index): boolean {
    if (this._data.length !== other._data.length) {
      return false;
    }
    
    for (let i = 0; i < this._data.length; i++) {
      if (this._data[i] !== other._data[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create a copy of the index
   */
  copy(): Index {
    return new Index(this._data, this._name);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const preview = this._data.slice(0, 5).map(v => String(v)).join(', ');
    const suffix = this._data.length > 5 ? ', ...' : '';
    return `Index([${preview}${suffix}], length=${this._data.length})`;
  }
}

/**
 * Specialized index for datetime data
 */
export class DatetimeIndex extends Index {
  protected _data: Date[];
  private _freq?: string;

  constructor(data: (Date | string | number)[], name?: string, freq?: string) {
    // Convert all data to Date objects
    const dates = data.map(d => {
      if (d instanceof Date) return new Date(d);
      if (typeof d === 'string') return new Date(d);
      if (typeof d === 'number') return new Date(d);
      throw new Error(`Cannot convert ${d} to Date`);
    });
    
    super(dates, name);
    this._data = dates;
    this._freq = freq;
  }

  /**
   * Get the frequency of the datetime index
   */
  get freq(): string | undefined {
    return this._freq;
  }

  /**
   * Infer the frequency from the data
   */
  inferredFreq(): string | null {
    if (this._data.length < 2) return null;
    
    // Calculate differences between consecutive dates
    const diffs = [];
    for (let i = 1; i < this._data.length; i++) {
      diffs.push(this._data[i].getTime() - this._data[i - 1].getTime());
    }
    
    // Check if all differences are the same
    const firstDiff = diffs[0];
    if (!diffs.every(diff => diff === firstDiff)) {
      return null; // Irregular frequency
    }
    
    // Convert milliseconds to frequency string
    const diffMs = firstDiff;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffMs === 1000 * 60 * 60 * 24) return 'D'; // Daily
    if (diffMs === 1000 * 60 * 60 * 24 * 7) return 'W'; // Weekly
    if (diffDays >= 28 && diffDays <= 31) return 'M'; // Monthly (approximate)
    if (diffMs === 1000 * 60 * 60) return 'H'; // Hourly
    if (diffMs === 1000 * 60) return 'T'; // Minutely
    
    return null;
  }

  /**
   * Round dates to specified frequency
   */
  round(freq: string): DatetimeIndex {
    const rounded = this._data.map(date => this.roundDate(date, freq));
    return new DatetimeIndex(rounded, this._name, freq);
  }

  /**
   * Floor dates to specified frequency
   */
  floor(freq: string): DatetimeIndex {
    const floored = this._data.map(date => this.floorDate(date, freq));
    return new DatetimeIndex(floored, this._name, freq);
  }

  /**
   * Ceiling dates to specified frequency
   */
  ceil(freq: string): DatetimeIndex {
    const ceiled = this._data.map(date => this.ceilDate(date, freq));
    return new DatetimeIndex(ceiled, this._name, freq);
  }

  /**
   * Round a single date to frequency
   */
  private roundDate(date: Date, freq: string): Date {
    const d = new Date(date);
    
    switch (freq.toUpperCase()) {
      case 'D': // Daily
        d.setHours(0, 0, 0, 0);
        break;
      case 'H': // Hourly
        d.setMinutes(0, 0, 0);
        break;
      case 'T': // Minutely
        d.setSeconds(0, 0);
        break;
      case 'S': // Seconds
        d.setMilliseconds(0);
        break;
      case 'W': // Weekly (round to Monday)
        const dayOfWeek = d.getDay();
        const daysToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        d.setDate(d.getDate() + daysToMonday);
        d.setHours(0, 0, 0, 0);
        break;
      case 'M': // Monthly
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
      case 'Y': // Yearly
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        break;
      default:
        throw new Error(`Unsupported frequency: ${freq}`);
    }
    
    return d;
  }

  /**
   * Floor a single date to frequency
   */
  private floorDate(date: Date, freq: string): Date {
    return this.roundDate(date, freq);
  }

  /**
   * Ceiling a single date to frequency
   */
  private ceilDate(date: Date, freq: string): Date {
    const floored = this.floorDate(date, freq);
    
    // If already at boundary, return as is
    if (date.getTime() === floored.getTime()) {
      return floored;
    }
    
    // Add one period
    const d = new Date(floored);
    switch (freq.toUpperCase()) {
      case 'D':
        d.setDate(d.getDate() + 1);
        break;
      case 'H':
        d.setHours(d.getHours() + 1);
        break;
      case 'T':
        d.setMinutes(d.getMinutes() + 1);
        break;
      case 'S':
        d.setSeconds(d.getSeconds() + 1);
        break;
      case 'W':
        d.setDate(d.getDate() + 7);
        break;
      case 'M':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'Y':
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    
    return d;
  }

  /**
   * Get minimum date
   */
  min(): Date {
    if (this._data.length === 0) {
      throw new Error('Cannot get min of empty DatetimeIndex');
    }
    return new Date(Math.min(...this._data.map(d => d.getTime())));
  }

  /**
   * Get maximum date
   */
  max(): Date {
    if (this._data.length === 0) {
      throw new Error('Cannot get max of empty DatetimeIndex');
    }
    return new Date(Math.max(...this._data.map(d => d.getTime())));
  }

  /**
   * Create date range
   */
  static dateRange(
    start: Date | string,
    end: Date | string,
    freq: string = 'D',
    periods?: number
  ): DatetimeIndex {
    const startDate = new Date(start);
    const endDate = periods ? null : new Date(end);
    
    const dates: Date[] = [];
    let current = new Date(startDate);
    
    let count = 0;
    while (true) {
      if (periods && count >= periods) break;
      if (endDate && current > endDate) break;
      
      dates.push(new Date(current));
      
      // Increment by frequency
      switch (freq.toUpperCase()) {
        case 'D':
          current.setDate(current.getDate() + 1);
          break;
        case 'H':
          current.setHours(current.getHours() + 1);
          break;
        case 'T':
          current.setMinutes(current.getMinutes() + 1);
          break;
        case 'S':
          current.setSeconds(current.getSeconds() + 1);
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
          throw new Error(`Unsupported frequency: ${freq}`);
      }
      
      count++;
    }
    
    return new DatetimeIndex(dates, undefined, freq);
  }

  /**
   * Sort the datetime index
   */
  sort(ascending: boolean = true): DatetimeIndex {
    const sorted = [...this._data].sort((a, b) => {
      const diff = a.getTime() - b.getTime();
      return ascending ? diff : -diff;
    });
    
    return new DatetimeIndex(sorted, this._name, this._freq);
  }

  /**
   * Create a copy of the datetime index
   */
  copy(): DatetimeIndex {
    return new DatetimeIndex(this._data, this._name, this._freq);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    const preview = this._data.slice(0, 5).map(d => d.toISOString().split('T')[0]).join(', ');
    const suffix = this._data.length > 5 ? ', ...' : '';
    const freqStr = this._freq ? `, freq='${this._freq}'` : '';
    return `DatetimeIndex([${preview}${suffix}], length=${this._data.length}${freqStr})`;
  }
}