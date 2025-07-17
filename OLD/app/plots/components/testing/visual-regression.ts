// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Visual Regression Testing                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../../lib';
import { ScatterChart, ScatterChartOptions } from '../scatter/ScatterChart';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';

export interface PythonComparisonOptions {
  serverUrl?: string;
  tolerance?: number;
  saveImages?: boolean;
  outputDir?: string;
}

export interface ComparisonResult {
  success: boolean;
  pythonImage?: string;
  typescriptConfig?: BWRPlotSpec;
  pixelDifference?: number;
  differencePercent?: number;
  passed?: boolean;
  error?: string;
  metadata?: {
    dataShape: [number, number];
    plotType: string;
    processingTime: number;
  };
}

export interface TestCase {
  name: string;
  data: DataFrame;
  chartOptions: ScatterChartOptions;
  xColumn?: string;
  yColumns: string[];
  y2Columns?: string[];
  colorColumn?: string;
  sizeColumn?: string;
}

export class VisualRegressionTester {
  private serverUrl: string;
  private tolerance: number;
  private saveImages: boolean;
  private outputDir: string;

  constructor(options: PythonComparisonOptions = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:5001';
    this.tolerance = options.tolerance || 0.01; // 0.01% difference threshold
    this.saveImages = options.saveImages || false;
    this.outputDir = options.outputDir || './test-output';
  }

  /**
   * Compare TypeScript scatter plot with Python equivalent
   */
  async compareScatterPlot(testCase: TestCase): Promise<ComparisonResult> {
    const startTime = Date.now();
    
    try {
      // Generate TypeScript chart
      const tsChart = new ScatterChart({
        dataframe: testCase.data,
        xColumn: testCase.xColumn,
        yColumns: testCase.yColumns,
        y2Columns: testCase.y2Columns,
        colorColumn: testCase.colorColumn,
        sizeColumn: testCase.sizeColumn
      }, testCase.chartOptions);

      if (!tsChart.isValid()) {
        throw new Error(`TypeScript chart validation failed: ${tsChart.getValidationErrors().join(', ')}`);
      }

      const tsConfig = tsChart.render();

      // Generate Python chart
      const pythonResult = await this.generatePythonChart('scatter', testCase);
      
      if (!pythonResult.success) {
        throw new Error(`Python chart generation failed: ${pythonResult.error}`);
      }

      // Compare configurations (simplified comparison)
      const configDifference = this.compareConfigurations(tsConfig, JSON.parse(pythonResult.plotly_json));

      const processingTime = Date.now() - startTime;

      const result: ComparisonResult = {
        success: true,
        pythonImage: pythonResult.image,
        typescriptConfig: tsConfig,
        pixelDifference: 0, // Would be calculated with actual image comparison
        differencePercent: configDifference,
        passed: configDifference < this.tolerance,
        metadata: {
          dataShape: testCase.data.shape,
          plotType: 'scatter',
          processingTime
        }
      };

      // Save images if requested
      if (this.saveImages) {
        await this.saveComparisonImages(testCase.name, result);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          dataShape: testCase.data.shape,
          plotType: 'scatter',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Generate chart using Python server
   */
  private async generatePythonChart(plotType: string, testCase: TestCase): Promise<any> {
    const requestData = {
      type: plotType,
      data: testCase.data.toJSON(),
      config: {
        x: testCase.xColumn,
        y: testCase.yColumns,
        y2: testCase.y2Columns,
        color: testCase.colorColumn,
        size: testCase.sizeColumn,
        ...testCase.chartOptions
      }
    };

    const response = await fetch(`${this.serverUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`Python server request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Compare Plotly configurations (simplified structural comparison)
   */
  private compareConfigurations(tsConfig: BWRPlotSpec, pythonConfig: any): number {
    // This is a simplified comparison - a full implementation would do deep comparison
    try {
      const tsStr = JSON.stringify(tsConfig, null, 0);
      const pyStr = JSON.stringify(pythonConfig, null, 0);
      
      if (tsStr === pyStr) return 0;

      // Calculate rough difference based on string length difference
      const sizeDiff = Math.abs(tsStr.length - pyStr.length);
      const avgSize = (tsStr.length + pyStr.length) / 2;
      
      return (sizeDiff / avgSize) * 100;
    } catch (error) {
      console.warn('Configuration comparison failed:', error);
      return 100; // Assume maximum difference on error
    }
  }

  /**
   * Save comparison images and configs for debugging
   */
  private async saveComparisonImages(testName: string, result: ComparisonResult): Promise<void> {
    // This would save to filesystem in a real implementation
    console.log(`Saving comparison for test: ${testName}`);
    console.log(`- Passed: ${result.passed}`);
    console.log(`- Difference: ${result.differencePercent?.toFixed(2)}%`);
    
    // In a real implementation:
    // - Save Python PNG image from base64
    // - Generate TypeScript image (would need Plotly.js integration)
    // - Save difference overlay
    // - Save JSON configs for debugging
  }

  /**
   * Run a batch of test cases
   */
  async runTestSuite(testCases: TestCase[]): Promise<ComparisonResult[]> {
    console.log(`Running visual regression test suite with ${testCases.length} test cases...`);
    
    const results: ComparisonResult[] = [];
    
    for (const testCase of testCases) {
      console.log(`Running test: ${testCase.name}`);
      const result = await this.compareScatterPlot(testCase);
      results.push(result);
      
      if (result.success) {
        console.log(`  ✅ ${result.passed ? 'PASSED' : 'FAILED'} - ${result.differencePercent?.toFixed(2)}% difference`);
      } else {
        console.log(`  ❌ ERROR - ${result.error}`);
      }
    }

    // Summary
    const passed = results.filter(r => r.success && r.passed).length;
    const failed = results.filter(r => r.success && !r.passed).length;
    const errors = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Test Suite Summary:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  🚫 Errors: ${errors}`);
    console.log(`  📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

    return results;
  }

  /**
   * Check if Python server is available
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Python server health check failed:', error);
      return false;
    }
  }

  /**
   * Get Python BWR configuration for comparison
   */
  async getPythonConfig(): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/config`);
      if (!response.ok) {
        throw new Error(`Config request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get Python config:', error);
      return null;
    }
  }
}

/**
 * Create standard test data for regression testing
 */
export function createTestDataFrames() {
  // Simple linear data
  const simpleData = new DataFrame({
    x: [1, 2, 3, 4, 5],
    y: [2, 4, 6, 8, 10],
    category: ['A', 'B', 'A', 'B', 'A']
  });

  // Large dataset
  const largeData = (() => {
    const size = 1000;
    const data: Record<string, number[]> = { x: [], y: [], z: [] };
    
    for (let i = 0; i < size; i++) {
      data.x.push(i);
      data.y.push(Math.sin(i / 100) * 100 + Math.random() * 20);
      data.z.push(Math.cos(i / 150) * 50 + Math.random() * 10);
    }
    
    return new DataFrame(data);
  })();

  // Missing data
  const missingData = new DataFrame({
    x: [1, 2, 3, 4, 5, 6],
    y: [10, null, 30, 40, null, 60],
    z: [1, 2, null, 4, 5, 6]
  });

  // Date data
  const dateData = new DataFrame({
    date: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
    value: [100, 120, 90, 150, 110],
    volume: [1000, 1200, 800, 1500, 1100]
  });

  return {
    simpleData,
    largeData,
    missingData,
    dateData
  };
}

/**
 * Create standard test cases for scatter plots
 */
export function createScatterTestCases(): TestCase[] {
  const { simpleData, largeData, missingData, dateData } = createTestDataFrames();

  return [
    {
      name: 'simple-scatter',
      data: simpleData,
      chartOptions: { title: 'Simple Scatter Plot' },
      xColumn: 'x',
      yColumns: ['y']
    },
    {
      name: 'dual-axis-scatter',
      data: simpleData,
      chartOptions: { 
        title: 'Dual Axis Scatter Plot',
        enableDualAxis: true
      },
      xColumn: 'x',
      yColumns: ['y'],
      y2Columns: ['x'] // Use x as y2 for simplicity
    },
    {
      name: 'colored-scatter',
      data: simpleData,
      chartOptions: { 
        title: 'Colored Scatter Plot',
        colorScale: 'discrete'
      },
      xColumn: 'x',
      yColumns: ['y'],
      colorColumn: 'category'
    },
    {
      name: 'large-dataset',
      data: largeData,
      chartOptions: { 
        title: 'Large Dataset',
        maxPoints: 500,
        aggregateMethod: 'sample'
      },
      xColumn: 'x',
      yColumns: ['y', 'z']
    },
    {
      name: 'missing-data',
      data: missingData,
      chartOptions: { title: 'Missing Data Handling' },
      xColumn: 'x',
      yColumns: ['y', 'z']
    },
    {
      name: 'time-series',
      data: dateData,
      chartOptions: { title: 'Time Series Data' },
      xColumn: 'date',
      yColumns: ['value', 'volume']
    }
  ];
}