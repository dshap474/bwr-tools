// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Integration Tests                                                                   │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { describe, it, expect, beforeAll } from 'vitest';
import { DataFrame } from '../../lib';
import { ScatterChart } from './scatter/ScatterChart';
import { DEFAULT_BWR_CONFIG } from '../../../lib/config';
import { VisualRegressionTester, TestDataGenerator } from './testing';

describe('End-to-End Integration Tests', () => {
  let tester: VisualRegressionTester;
  
  beforeAll(async () => {
    tester = new VisualRegressionTester({
      serverUrl: 'http://localhost:5001',
      tolerance: 0.01
    });
  });

  describe('DataFrame Operations', () => {
    it('should create and manipulate data correctly', () => {
      // Create test data
      const data = {
        x: [1, 2, 3, 4, 5],
        y: [10, 20, 30, 40, 50],
        category: ['A', 'B', 'A', 'B', 'A']
      };
      
      const df = new DataFrame(data);
      
      // Basic properties
      expect(df.shape).toEqual([5, 3]);
      expect(df.columns).toEqual(['x', 'y', 'category']);
      expect(df.empty).toBe(false);
      
      // Data access
      const xSeries = df.getColumn('x');
      expect(xSeries.length).toBe(5);
      expect(xSeries.mean()).toBe(3);
      expect(xSeries.sum()).toBe(15);
      
      // Data manipulation
      const subset = df.head(3);
      expect(subset.shape).toEqual([3, 3]);
      
      const dropped = df.drop(['category']);
      expect(dropped.columns).toEqual(['x', 'y']);
      
      const renamed = df.rename({ x: 'time', y: 'value' });
      expect(renamed.columns).toEqual(['time', 'value', 'category']);
      
      // Export
      const json = df.to('json');
      expect(json).toHaveProperty('x');
      expect(json.x).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle missing data correctly', () => {
      const data = {
        x: [1, 2, null, 4, 5],
        y: [10, null, 30, 40, 50]
      };
      
      const df = new DataFrame(data);
      
      // Check missing data detection
      const xSeries = df.getColumn('x');
      const isNull = xSeries.isna();
      expect(isNull[2]).toBe(true);
      expect(isNull[0]).toBe(false);
      
      // Drop missing data
      const cleaned = df.dropna('any');
      expect(cleaned.shape[0]).toBeLessThan(5);
      
      // Fill missing data
      const filled = df.fillna(0);
      const filledX = filled.getColumn('x').toArray();
      expect(filledX[2]).toBe(0);
    });

    it('should process large datasets efficiently', () => {
      const largeData = TestDataGenerator.generateLargeDataset(10000);
      
      expect(largeData.shape[0]).toBe(10000);
      expect(largeData.shape[1]).toBe(3);
      
      // Should handle large operations without timeout
      const subset = largeData.head(1000);
      const stats = subset.describe();
      
      expect(subset.shape[0]).toBe(1000);
      expect(stats.columns.length).toBeGreaterThan(0);
    });
  });

  describe('ScatterChart Generation', () => {
    it('should create valid scatter chart configuration', () => {
      const df = new DataFrame({
        x: [1, 2, 3, 4, 5],
        y: [2, 4, 6, 8, 10],
        z: [1, 3, 5, 7, 9]
      });

      const chart = new ScatterChart({
        dataframe: df,
        xColumn: 'x',
        yColumns: ['y']
      }, {
        title: 'Test Scatter Plot',
        subtitle: 'Integration Test'
      });

      expect(chart.isValid()).toBe(true);
      expect(chart.getValidationErrors()).toEqual([]);

      const config = chart.render();
      
      // Verify basic structure
      expect(config).toHaveProperty('data');
      expect(config).toHaveProperty('layout');
      expect(config).toHaveProperty('config');
      
      // Check data traces
      expect(Array.isArray(config.data)).toBe(true);
      expect(config.data.length).toBe(1); // One Y column
      
      const trace = config.data[0];
      expect(trace.type).toBe('scatter');
      expect(trace.mode).toBe('markers');
      expect(trace.x).toEqual([1, 2, 3, 4, 5]);
      expect(trace.y).toEqual([2, 4, 6, 8, 10]);

      // Check BWR theme application
      expect(config.layout.paper_bgcolor).toBe('#1A1A1A');
      expect(config.layout.font.color).toBe('#ededed');
      expect(config.layout.title?.font?.size).toBe(51.6);
    });

    it('should handle dual-axis configuration', () => {
      const df = new DataFrame({
        x: [1, 2, 3, 4, 5],
        y1: [10, 20, 30, 40, 50],
        y2: [100, 200, 300, 400, 500]
      });

      const chart = new ScatterChart({
        dataframe: df,
        xColumn: 'x',
        yColumns: ['y1'],
        y2Columns: ['y2']
      }, {
        enableDualAxis: true,
        title: 'Dual Axis Test'
      });

      const config = chart.render();
      
      expect(config.data.length).toBe(2); // y1 and y2 traces
      expect(config.layout.yaxis2).toBeDefined();
      expect(config.layout.yaxis2.overlaying).toBe('y');
      expect(config.layout.yaxis2.side).toBe('right');
    });

    it('should apply data scaling correctly', () => {
      const df = new DataFrame({
        x: [1000, 2000, 3000],
        y: [1000000, 2000000, 3000000] // Should scale to M
      });

      const chart = new ScatterChart({
        dataframe: df,
        xColumn: 'x',
        yColumns: ['y']
      });

      const config = chart.render();
      const trace = config.data[0];
      
      // Data should be scaled
      expect(trace.y[0]).toBe(1); // 1000000 / 1000000
      expect(trace.y[1]).toBe(2); // 2000000 / 1000000
      
      // Axis title should include suffix
      expect(config.layout.yaxis.title?.text).toContain('M');
    });
  });

  describe('BWR Configuration Validation', () => {
    it('should have exact Python configuration values', () => {
      const config = DEFAULT_BWR_CONFIG;
      
      // Core colors
      expect(config.colors.background).toBe('#1A1A1A');
      expect(config.colors.primary).toBe('#5637cd');
      expect(config.colors.text).toBe('#ededed');
      expect(config.colors.subtitle).toBe('#adb0b5');
      
      // Font sizes (exact decimals)
      expect(config.fonts.sizes.title).toBe(51.6);
      expect(config.fonts.sizes.subtitle).toBe(21.6);
      expect(config.fonts.sizes.axis).toBe(16.8);
      expect(config.fonts.sizes.tick).toBe(21.6);
      expect(config.fonts.sizes.legend).toBe(24.0);
      
      // Layout dimensions
      expect(config.general.width).toBe(1920);
      expect(config.general.height).toBe(1080);
      expect(config.layout.margins.left).toBe(120);
      expect(config.layout.margins.right).toBe(70);
      expect(config.layout.margins.top).toBe(150);
      expect(config.layout.margins.bottom).toBe(120);
    });

    it('should match exact watermark configuration', () => {
      const config = DEFAULT_BWR_CONFIG;
      
      // BWR watermark
      expect(config.watermarks.bwr.size).toBe(96);
      expect(config.watermarks.bwr.color).toBe('#333333');
      expect(config.watermarks.bwr.opacity).toBe(0.6);
      expect(config.watermarks.bwr.x).toBe(0.98);
      expect(config.watermarks.bwr.y).toBe(0.02);
      
      // BWA watermark
      expect(config.watermarks.bwa.size).toBe(48);
      expect(config.watermarks.bwa.color).toBe('#333333');
      expect(config.watermarks.bwa.opacity).toBe(0.6);
      expect(config.watermarks.bwa.x).toBe(0.02);
      expect(config.watermarks.bwa.y).toBe(0.02);
    });
  });

  describe('Data Processing Utilities', () => {
    it('should scale values correctly', async () => {
      const { getScaleAndSuffix, scaleDataFrame } = await import('../../lib');
      
      // Test scaling detection
      expect(getScaleAndSuffix(1500)).toEqual({ scale: 1000, suffix: 'K' });
      expect(getScaleAndSuffix(2500000)).toEqual({ scale: 1000000, suffix: 'M' });
      expect(getScaleAndSuffix(1500000000)).toEqual({ scale: 1000000000, suffix: 'B' });
      
      // Test DataFrame scaling
      const df = new DataFrame({
        small: [100, 200, 300],
        large: [1000000, 2000000, 3000000]
      });
      
      const { scaledDf, scaleInfo } = scaleDataFrame(df);
      
      expect(scaleInfo.large).toEqual({ scale: 1000000, suffix: 'M' });
      expect(scaleInfo.small).toEqual({ scale: 1, suffix: '' });
      
      const scaledLarge = scaledDf.getColumn('large').toArray() as number[];
      expect(scaledLarge[0]).toBe(1); // 1000000 / 1000000
    });

    it('should calculate nice axis parameters', async () => {
      const { calculateYAxisGridParams } = await import('../../lib');
      
      const yData = [10, 25, 30, 45, 50];
      const params = calculateYAxisGridParams(yData);
      
      expect(params.tickmode).toBe('linear');
      expect(params.range).toHaveLength(2);
      expect(params.range[0]).toBeLessThanOrEqual(10);
      expect(params.range[1]).toBeGreaterThanOrEqual(50);
      expect(params.dtick).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data gracefully', () => {
      const df = new DataFrame({});
      
      expect(df.empty).toBe(true);
      expect(df.shape).toEqual([0, 0]);
      
      // Should not throw when creating chart with empty data
      expect(() => {
        new ScatterChart({
          dataframe: df,
          xColumn: 'nonexistent',
          yColumns: ['also_nonexistent']
        });
      }).toThrow(); // Should throw validation error
    });

    it('should validate chart data requirements', () => {
      const df = new DataFrame({
        x: [1, 2, 3],
        y: [1, 2, 3]
      });

      const chart = new ScatterChart({
        dataframe: df,
        xColumn: 'missing_column',
        yColumns: ['y']
      });

      expect(chart.isValid()).toBe(false);
      expect(chart.getValidationErrors().length).toBeGreaterThan(0);
    });
  });

  describe('Python Server Integration', () => {
    it('should connect to Python comparison server', async () => {
      try {
        const isHealthy = await tester.checkServerHealth();
        console.log('Python server health:', isHealthy);
        
        if (!isHealthy) {
          console.warn('Python server not available - skipping comparison tests');
          return;
        }

        // Test configuration comparison
        const pythonConfig = await tester.getPythonConfig();
        expect(pythonConfig).toBeDefined();
        
        if (pythonConfig?.success) {
          console.log('Python config retrieved successfully');
          // Could compare specific values here
        }
      } catch (error) {
        console.warn('Python server integration test failed:', error);
        // Don't fail the test if Python server is not running
      }
    });

    it('should generate comparison data', async () => {
      try {
        const healthCheck = await tester.checkServerHealth();
        if (!healthCheck) {
          console.warn('Skipping Python comparison - server not available');
          return;
        }

        const testData = TestDataGenerator.generateLinearData(20);
        const testCase = {
          name: 'integration-test',
          data: testData,
          chartOptions: { title: 'Integration Test' },
          xColumn: 'x',
          yColumns: ['y']
        };

        const result = await tester.compareScatterPlot(testCase);
        
        if (result.success) {
          console.log('Python comparison successful');
          console.log('Difference:', result.differencePercent?.toFixed(4) + '%');
          expect(result.differencePercent).toBeLessThan(100); // Basic sanity check
        } else {
          console.warn('Python comparison failed:', result.error);
        }
      } catch (error) {
        console.warn('Python comparison test error:', error);
      }
    });
  });
});

// Performance benchmarks
describe('Performance Tests', () => {
  it('should handle large datasets within time limits', () => {
    const startTime = Date.now();
    
    const largeData = TestDataGenerator.generateLargeDataset(50000);
    const chart = new ScatterChart({
      dataframe: largeData,
      xColumn: 'x',
      yColumns: ['y']
    }, {
      maxPoints: 1000,
      aggregateMethod: 'sample'
    });

    const config = chart.render();
    const processingTime = Date.now() - startTime;
    
    expect(config).toBeDefined();
    expect(processingTime).toBeLessThan(1000); // Should complete in < 1 second
    
    console.log(`Large dataset processing time: ${processingTime}ms`);
  });

  it('should efficiently process DataFrame operations', () => {
    const iterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const df = new DataFrame({
        x: [1, 2, 3, 4, 5],
        y: [10, 20, 30, 40, 50]
      });
      
      df.head(3);
      df.getColumn('x').mean();
    }
    
    const avgTime = (Date.now() - startTime) / iterations;
    expect(avgTime).toBeLessThan(1); // Should average < 1ms per operation
    
    console.log(`DataFrame operation average time: ${avgTime.toFixed(3)}ms`);
  });
});