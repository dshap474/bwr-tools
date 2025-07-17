// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ DataFrame Tests                                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { describe, it, expect, beforeEach } from 'vitest';
import { DataFrame } from './dataframe/DataFrame';
import { Series } from './dataframe/Series';
import { DatetimeIndex, Index } from './dataframe/Index';
import { ColumnType } from './dataframe/types';
import { 
  getScaleAndSuffix, 
  scaleDataFrame,
  roundAndAlignDates,
  calculateYAxisGridParams,
  niceNumber 
} from './index';

describe('DataFrame Implementation', () => {
  describe('DataFrame Basic Operations', () => {
    let df: DataFrame;
    
    beforeEach(() => {
      const data = {
        'A': [1, 2, 3, 4, 5],
        'B': [10.5, 20.5, 30.5, 40.5, 50.5],
        'C': ['a', 'b', 'c', 'd', 'e'],
        'date': ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05']
      };
      df = new DataFrame(data);
    });
    
    it('should create DataFrame with correct shape', () => {
      expect(df.shape).toEqual([5, 4]);
      expect(df.columns).toEqual(['A', 'B', 'C', 'date']);
    });
    
    it('should get column as Series', () => {
      const colA = df.getColumn('A');
      expect(colA).toBeInstanceOf(Series);
      expect(colA.length).toBe(5);
      expect(colA.dtype).toBe(ColumnType.INTEGER);
    });
    
    it('should get correct dtypes', () => {
      const dtypes = df.dtypes;
      expect(dtypes['A']).toBe(ColumnType.INTEGER);
      expect(dtypes['B']).toBe(ColumnType.FLOAT);
      expect(dtypes['C']).toBe(ColumnType.STRING);
    });
    
    it('should get head and tail', () => {
      const head = df.head(3);
      expect(head.shape).toEqual([3, 4]);
      
      const tail = df.tail(2);
      expect(tail.shape).toEqual([2, 4]);
    });
    
    it('should drop columns', () => {
      const dropped = df.drop(['C', 'date']);
      expect(dropped.columns).toEqual(['A', 'B']);
      expect(dropped.shape).toEqual([5, 2]);
    });
    
    it('should rename columns', () => {
      const renamed = df.rename({ 'A': 'Alpha', 'B': 'Beta' });
      expect(renamed.columns).toEqual(['Alpha', 'Beta', 'C', 'date']);
    });
    
    it('should describe numeric columns', () => {
      const desc = df.describe();
      expect(desc.columns).toEqual(['A', 'B']);
      expect(desc.shape[0]).toBe(8); // count, mean, std, min, 25%, 50%, 75%, max
    });
  });
  
  describe('Series Operations', () => {
    let series: Series;
    
    beforeEach(() => {
      series = new Series([1, 2, 3, 4, 5, NaN], undefined, 'test_series');
    });
    
    it('should calculate basic statistics', () => {
      expect(series.mean()).toBeCloseTo(3); // (1+2+3+4+5)/5 = 3
      expect(series.sum()).toBe(15);
      expect(series.min()).toBe(1);
      expect(series.max()).toBe(5);
      expect(series.count()).toBe(5); // NaN excluded
    });
    
    it('should handle missing values', () => {
      const isNull = series.isna();
      expect(isNull[5]).toBe(true); // NaN should be detected as null
      expect(isNull[0]).toBe(false);
      
      const dropped = series.dropna();
      expect(dropped.length).toBe(5);
    });
    
    it('should calculate rolling statistics', () => {
      const rolling = series.rolling({ window: 3 });
      const rollingMean = rolling.mean();
      
      expect(rollingMean.length).toBe(series.length);
      expect(rollingMean.iloc(2)).toBeCloseTo(2); // (1+2+3)/3 = 2
    });
  });
  
  describe('Index Operations', () => {
    it('should create DatetimeIndex from dates', () => {
      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      const dtIndex = new DatetimeIndex(dates);
      
      expect(dtIndex.length).toBe(3);
      expect(dtIndex.min()).toBeInstanceOf(Date);
      expect(dtIndex.max()).toBeInstanceOf(Date);
    });
    
    it('should round dates correctly', () => {
      const dates = ['2023-01-01T10:30:00', '2023-01-01T15:45:00', '2023-01-02T08:15:00'];
      const dtIndex = new DatetimeIndex(dates);
      const rounded = dtIndex.round('D');
      
      // All should round to start of day
      const roundedArray = rounded.toArray() as Date[];
      expect(roundedArray[0].getHours()).toBe(0);
      expect(roundedArray[1].getHours()).toBe(0);
    });
    
    it('should create date ranges', () => {
      const range = DatetimeIndex.dateRange('2023-01-01', '2023-01-05', 'D');
      expect(range.length).toBe(5);
    });
  });
  
  describe('Value Scaling', () => {
    it('should determine correct scale and suffix', () => {
      expect(getScaleAndSuffix(1500)).toEqual({ scale: 1000, suffix: 'K' });
      expect(getScaleAndSuffix(2500000)).toEqual({ scale: 1000000, suffix: 'M' });
      expect(getScaleAndSuffix(1500000000)).toEqual({ scale: 1000000000, suffix: 'B' });
      expect(getScaleAndSuffix(500)).toEqual({ scale: 1, suffix: '' });
    });
    
    it('should scale DataFrame correctly', () => {
      const data = {
        'values': [1000, 2000, 3000, 4000, 5000],
        'large_values': [1000000, 2000000, 3000000, 4000000, 5000000]
      };
      const df = new DataFrame(data);
      
      const { scaledDf, scaleInfo } = scaleDataFrame(df);
      
      expect(scaleInfo['values']).toEqual({ scale: 1000, suffix: 'K' });
      expect(scaleInfo['large_values']).toEqual({ scale: 1000000, suffix: 'M' });
      
      // Check scaled values
      const scaledValues = scaledDf.getColumn('values').toArray() as number[];
      expect(scaledValues[0]).toBe(1); // 1000 / 1000
      expect(scaledValues[4]).toBe(5); // 5000 / 1000
    });
  });
  
  describe('Date Alignment', () => {
    it('should round and align dates across DataFrames', () => {
      // Create two DataFrames with slightly different date ranges
      const df1 = new DataFrame({
        'value1': [1, 2, 3],
        'date': ['2023-01-01T10:00:00', '2023-01-02T15:00:00', '2023-01-03T20:00:00']
      });
      
      const df2 = new DataFrame({
        'value2': [10, 20, 30],
        'date': ['2023-01-01T08:00:00', '2023-01-02T12:00:00', '2023-01-04T09:00:00']
      });
      
      // Convert date columns to datetime index (simplified for test)
      const dataframes = [df1, df2];
      
      const aligned = roundAndAlignDates(dataframes, { roundFreq: 'D' });
      
      expect(aligned).toHaveLength(2);
      // Note: Full alignment would require proper datetime index conversion
      // This is a simplified test of the function structure
    });
  });
  
  describe('Nice Numbers', () => {
    it('should generate nice numbers', () => {
      expect(niceNumber(0.72, true)).toBe(1);
      expect(niceNumber(1.6, true)).toBe(2);
      expect(niceNumber(4.8, true)).toBe(5);
      expect(niceNumber(12, true)).toBe(10);
    });
    
    it('should calculate nice y-axis parameters', () => {
      const yData = [10, 25, 30, 45, 50];
      const params = calculateYAxisGridParams(yData);
      
      expect(params.tickmode).toBe('linear');
      expect(params.range).toHaveLength(2);
      expect(params.range[0]).toBeLessThanOrEqual(10); // Should include minimum
      expect(params.range[1]).toBeGreaterThanOrEqual(50); // Should include maximum
      expect(params.dtick).toBeGreaterThan(0);
    });
    
    it('should handle all positive data correctly', () => {
      const yData = [5, 10, 15, 20, 25];
      const params = calculateYAxisGridParams(yData);
      
      // For all positive data, minimum should be 0
      expect(params.range[0]).toBe(0);
      expect(params.tick0).toBe(0);
    });
    
    it('should handle negative data correctly', () => {
      const yData = [-10, -5, 0, 5, 10];
      const params = calculateYAxisGridParams(yData);
      
      expect(params.range[0]).toBeLessThanOrEqual(-10);
      expect(params.range[1]).toBeGreaterThanOrEqual(10);
    });
  });
  
  describe('Data Type Detection', () => {
    it('should correctly infer column types', () => {
      const data = {
        'integers': [1, 2, 3, 4, 5],
        'floats': [1.1, 2.2, 3.3, 4.4, 5.5],
        'strings': ['a', 'b', 'c', 'd', 'e'],
        'dates': [new Date('2023-01-01'), new Date('2023-01-02'), new Date('2023-01-03')],
        'booleans': [true, false, true, false, true]
      };
      const df = new DataFrame(data);
      
      expect(df.dtypes['integers']).toBe(ColumnType.INTEGER);
      expect(df.dtypes['floats']).toBe(ColumnType.FLOAT);
      expect(df.dtypes['strings']).toBe(ColumnType.STRING);
      expect(df.dtypes['dates']).toBe(ColumnType.DATE);
      expect(df.dtypes['booleans']).toBe(ColumnType.BOOLEAN);
    });
  });
  
  describe('Data Operations', () => {
    let df: DataFrame;
    
    beforeEach(() => {
      df = new DataFrame({
        'A': [1, 2, null, 4, 5],
        'B': [10, null, 30, 40, 50],
        'C': ['x', 'y', 'z', 'w', 'v']
      });
    });
    
    it('should handle null values in dropna', () => {
      const dropped = df.dropna('any');
      expect(dropped.shape[0]).toBeLessThan(5); // Should remove rows with any null
      
      const droppedAll = df.dropna('all');
      expect(droppedAll.shape[0]).toBe(5); // No rows are all null
    });
    
    it('should fill null values', () => {
      const filled = df.fillna(0);
      const colA = filled.getColumn('A').toArray();
      const colB = filled.getColumn('B').toArray();
      
      expect(colA[2]).toBe(0); // null should be filled with 0
      expect(colB[1]).toBe(0); // null should be filled with 0
    });
    
    it('should sort by column values', () => {
      const sorted = df.sort('A');
      const colA = sorted.getColumn('A').toArray();
      
      // Should be sorted ascending (nulls at end)
      expect(colA[0]).toBe(1);
      expect(colA[1]).toBe(2);
      expect(colA[2]).toBe(4);
      expect(colA[3]).toBe(5);
    });
  });
  
  describe('Export Operations', () => {
    let df: DataFrame;
    
    beforeEach(() => {
      df = new DataFrame({
        'A': [1, 2, 3],
        'B': [10.5, 20.5, 30.5],
        'C': ['x', 'y', 'z']
      });
    });
    
    it('should export to JSON', () => {
      const json = df.to('json');
      expect(json).toHaveProperty('A');
      expect(json).toHaveProperty('B');
      expect(json).toHaveProperty('C');
      expect(json['A']).toEqual([1, 2, 3]);
    });
    
    it('should export to CSV', () => {
      const csv = df.to('csv');
      expect(csv).toContain('A,B,C');
      expect(csv).toContain('1,10.5,x');
    });
    
    it('should export to records', () => {
      const records = df.to('records');
      expect(records).toHaveLength(3);
      expect(records[0]).toEqual({ A: 1, B: 10.5, C: 'x' });
    });
  });
});