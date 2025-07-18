import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFile } from '@/lib/plots/file-parser';
import { DataFrame } from '@/lib/plots';
import { ScatterChart } from '@/components/charts/scatter';
import { MetricShareAreaChart } from '@/components/charts/area';
import { StackedBarChart } from '@/components/charts/bar';
import { BWRConfig } from '@/lib/bwr-plots/config';
import { BWRChartGenerator } from './chart-generator';
import { compareImages, loadImage, saveComparisonReport, generateVisualReport } from './pixel-comparison';
import React from 'react';

describe('BWR Plots Pixel Perfect Test', () => {
  let testDataFrame: DataFrame;
  let testData: any;

  beforeAll(async () => {
    // Load the test dataset
    const csvPath = join(__dirname, 'dataset.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Create a File object from the CSV content
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvFile = new File([csvBlob], 'dataset.csv', { type: 'text/csv' });
    
    // Parse the CSV file using the existing parser
    const parseResult = await parseFile(csvFile);
    
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).not.toBeNull();
    
    testDataFrame = parseResult.data!;
    testData = parseResult;
    
    console.log('Test data loaded:', {
      rows: testDataFrame.shape[0],
      columns: testDataFrame.shape[1],
      columnNames: testDataFrame.columns
    });
  });

  test('Dataset loads correctly', () => {
    expect(testDataFrame).toBeDefined();
    expect(testDataFrame.shape[0]).toBeGreaterThan(700); // Should have ~713 rows
    expect(testDataFrame.columns).toEqual([
      'txfees_priorityfees_usd',
      'txfees_basefee_usd', 
      'txfees_l1fee_usd',
      'dt'
    ]);
  });

  test('Data types are detected correctly', () => {
    // Check that dt column is detected as datetime
    const dtColumn = testDataFrame.getColumn('dt');
    expect(dtColumn).toBeDefined();
    
    // Check that fee columns are numeric
    const priorityFeesColumn = testDataFrame.getColumn('txfees_priorityfees_usd');
    const baseFeesColumn = testDataFrame.getColumn('txfees_basefee_usd');
    const l1FeesColumn = testDataFrame.getColumn('txfees_l1fee_usd');
    
    expect(priorityFeesColumn).toBeDefined();
    expect(baseFeesColumn).toBeDefined();
    expect(l1FeesColumn).toBeDefined();
  });

  test('Generate time series line chart', async () => {
    // Configuration for time series chart matching the example
    const chartConfig = {
      title: 'Transaction Fees Over Time',
      subtitle: 'BWR Time Series Analysis',
      xAxisTitle: 'Date',
      yAxisTitle: 'Fees (USD)',
      width: 1200,
      height: 800,
      showLegend: true,
      showWatermark: true
    };

    // Test if we can create a scatter chart with the data
    expect(() => {
      const chartData = {
        dataframe: testDataFrame,
        xColumn: 'dt',
        yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
      };
      const chart = new ScatterChart(chartData, chartConfig);
    }).not.toThrow();
  });

  test('Generate stacked area chart', async () => {
    // Test metric share area chart (good for showing fee composition)
    const chartConfig = {
      title: 'Transaction Fee Composition Over Time',
      subtitle: 'Priority, Base, and L1 Fees',
      xAxisTitle: 'Date',
      yAxisTitle: 'Fee Share (%)',
      width: 1200,
      height: 800,
      showLegend: true,
      showWatermark: true
    };

    expect(() => {
      const chartData = {
        dataframe: testDataFrame,
        xColumn: 'dt',
        yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
      };
      const chart = new MetricShareAreaChart(chartData, chartConfig);
    }).not.toThrow();
  });

  test('Generate stacked bar chart matching reference', async () => {
    // Create chart generator and load data
    const generator = new BWRChartGenerator(join(__dirname, 'dataset.csv'));
    await generator.loadData();
    
    // Generate the stacked bar chart with monthly grouping
    const chartSpec = generator.generateStackedBarChartMonthly({
      width: 1920,
      height: 1080
    });
    
    // Verify the chart spec is generated
    expect(chartSpec).toBeDefined();
    expect(chartSpec.data).toBeDefined();
    expect(chartSpec.layout).toBeDefined();
    
    // Check that we have the right number of traces (3 bar traces + 3 legend traces)
    expect(chartSpec.data.length).toBe(6);
    
    // Verify traces are in correct order (reversed for stacking)
    const barTraces = chartSpec.data.filter((trace: any) => trace.type === 'bar');
    expect(barTraces.length).toBe(3);
    
    // Check legend traces
    const legendTraces = chartSpec.data.filter((trace: any) => trace.type === 'scatter');
    expect(legendTraces.length).toBe(3);
    legendTraces.forEach((trace: any) => {
      expect(trace.showlegend).toBe(true);
      expect(trace.marker.symbol).toBe('circle');
    });
  });

  // Pixel comparison test
  test('Compare generated chart with reference image', async () => {
    // Paths
    const referencePath = join(__dirname, 'example.png');
    const actualPath = join(__dirname, 'actual.png');
    const diffPath = join(__dirname, 'diff.png');
    const reportPath = join(__dirname, 'comparison-report.json');
    const htmlReportPath = join(__dirname, 'comparison-report.html');
    
    // Check reference exists
    const referenceExists = require('fs').existsSync(referencePath);
    expect(referenceExists).toBe(true);
    
    // Generate the chart
    const generator = new BWRChartGenerator(join(__dirname, 'dataset.csv'));
    await generator.loadData();
    
    // Create the stacked bar chart with exact config
    const chart = new StackedBarChart({
      dataframe: generator.groupDataByMonth(),
      xColumn: 'dt',
      yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
    }, {
      title: 'Base: Network REV',
      subtitle: 'In 2024 Base generated $88.9M in REV. This is a reasonable comp for the potential of Robinhood in its first year',
      width: 1920,
      height: 1080,
      showLegend: true,
      showWatermark: true,
      sortColumns: true,
      barGap: 0.15,
      opacity: 0.8
    });
    
    // Export to PNG using server-side export
    const { exportChartToImage, saveImageToFile } = await import('@/lib/plotly-wrapper/image-export.server');
    const chartSpec = chart.getExportConfig();
    const imageBuffer = await exportChartToImage(chartSpec, 'png');
    await saveImageToFile(imageBuffer, actualPath);
    
    // Load reference image
    const referenceBuffer = await loadImage(referencePath);
    
    // Compare images
    const result = await compareImages(imageBuffer, referenceBuffer, {
      threshold: 0.05, // 5% difference allowed
      includeAA: true,
      outputDiff: diffPath
    });
    
    // Save comparison report
    await saveComparisonReport(result, reportPath);
    
    // Generate visual HTML report
    await generateVisualReport(
      actualPath,
      referencePath,
      diffPath,
      result,
      htmlReportPath
    );
    
    // Log results
    console.log(`Pixel comparison result:
      - Match: ${result.match}
      - Difference: ${result.diffPercentage.toFixed(2)}%
      - Different pixels: ${result.diffPixels}
      - Total pixels: ${result.totalPixels}
      - Reports saved to: ${htmlReportPath}
    `);
    
    // Test assertion - allow up to 5% difference
    expect(result.diffPercentage).toBeLessThanOrEqual(5);
  }, 60000); // Increase timeout for image generation
}); 