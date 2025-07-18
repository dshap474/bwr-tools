/**
 * Chart Generator for Pixel Perfect Testing
 * 
 * This utility generates charts using the BWR plotting system
 * and exports them for pixel-perfect comparison with reference images.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parseFile } from '@/lib/plots/file-parser';
import { DataFrame } from '@/lib/plots';
import { ScatterChart } from '@/components/charts/scatter';
import { MetricShareAreaChart } from '@/components/charts/area';
import { BarChart, StackedBarChart } from '@/components/charts/bar';
import { BWRPlotSpec } from '@/lib/plotly-wrapper';

export interface ChartGenerationOptions {
  outputPath?: string;
  format?: 'png' | 'svg' | 'pdf';
  width?: number;
  height?: number;
  dpi?: number;
}

export class BWRChartGenerator {
  private dataFrame!: DataFrame; // Use definite assignment assertion
  private dataPath: string;

  constructor(csvPath: string) {
    this.dataPath = csvPath;
  }

  /**
   * Load CSV data into DataFrame
   */
  async loadData(): Promise<void> {
    const csvContent = readFileSync(this.dataPath, 'utf-8');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvFile = new File([csvBlob], 'dataset.csv', { type: 'text/csv' });
    
    const parseResult = await parseFile(csvFile);
    
    if (!parseResult.success || !parseResult.data) {
      throw new Error(`Failed to load data: ${parseResult.errors.join(', ')}`);
    }

    this.dataFrame = parseResult.data;
    console.log('Data loaded successfully:', {
      rows: this.dataFrame.shape[0],
      columns: this.dataFrame.shape[1],
      columnNames: this.dataFrame.columns
    });
  }

  /**
   * Generate time series line chart (likely the reference chart type)
   */
  generateTimeSeriesLineChart(options: ChartGenerationOptions = {}): BWRPlotSpec {
    const chartData = {
      dataframe: this.dataFrame,
      xColumn: 'dt',
      yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
    };

    const chartConfig = {
      title: 'Transaction Fees Over Time',
      subtitle: 'BWR Analysis',
      xAxisTitle: 'Date',
      yAxisTitle: 'Fees (USD)',
      width: options.width || 1200,
      height: options.height || 800,
      showLegend: true,
      showWatermark: true,
      markerSize: 4,
      lineWidth: 2,
      opacity: 0.8,
      showTrendline: false
    };

    const chart = new ScatterChart(chartData, chartConfig);
    return chart.render();
  }

  /**
   * Group daily data by month for stacked bar chart
   */
  public groupDataByMonth(): any {
    const monthlyData: Record<string, any> = {};
    
    // Get the data arrays and ensure they're numeric
    const dates = this.dataFrame.getColumn('dt').toArray();
    const priorityFees = this.dataFrame.getColumn('txfees_priorityfees_usd').toArray().map((v: any) => parseFloat(v) || 0);
    const baseFees = this.dataFrame.getColumn('txfees_basefee_usd').toArray().map((v: any) => parseFloat(v) || 0);
    const l1Fees = this.dataFrame.getColumn('txfees_l1fee_usd').toArray().map((v: any) => parseFloat(v) || 0);
    
    // Group by month
    for (let i = 0; i < dates.length; i++) {
      const dateValue = dates[i];
      if (!dateValue) continue;
      
      const date = new Date(dateValue as string | number | Date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          txfees_priorityfees_usd: 0,
          txfees_basefee_usd: 0,
          txfees_l1fee_usd: 0,
          count: 0
        };
      }
      
      monthlyData[monthKey].txfees_priorityfees_usd += priorityFees[i] || 0;
      monthlyData[monthKey].txfees_basefee_usd += baseFees[i] || 0;
      monthlyData[monthKey].txfees_l1fee_usd += l1Fees[i] || 0;
      monthlyData[monthKey].count += 1;
    }
    
    // Convert to arrays for DataFrame
    const months = Object.keys(monthlyData).sort();
    const monthlyArrays: any = {
      dt: months,
      txfees_priorityfees_usd: [],
      txfees_basefee_usd: [],
      txfees_l1fee_usd: []
    };
    
    for (const month of months) {
      monthlyArrays.txfees_priorityfees_usd.push(monthlyData[month].txfees_priorityfees_usd);
      monthlyArrays.txfees_basefee_usd.push(monthlyData[month].txfees_basefee_usd);
      monthlyArrays.txfees_l1fee_usd.push(monthlyData[month].txfees_l1fee_usd);
    }
    
    // Import DataFrame class
    const { DataFrame } = require('@/lib/plots');
    
    // Create new DataFrame with monthly data
    return new DataFrame(monthlyArrays);
  }

  /**
   * Generate stacked bar chart (matching the reference image)
   */
  generateStackedBarChartMonthly(options: ChartGenerationOptions = {}): BWRPlotSpec {
    // Group data by month first
    const monthlyData = this.groupDataByMonth();
    
    const chartData = {
      dataframe: monthlyData,
      xColumn: 'dt',
      yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
    };

    const chartConfig = {
      title: 'Base: Network REV',
      subtitle: 'In 2024 Base generated $88.9M in REV. This is a reasonable comp for the potential of Robinhood in its first year',
      xAxisTitle: '',
      yAxisTitle: '',
      width: options.width || 1920,
      height: options.height || 1080,
      showLegend: true,
      showWatermark: true,
      sortColumns: true, // Sort columns by sum in descending order
      barGap: 0.15,
      opacity: 0.8
    };

    const chart = new StackedBarChart(chartData, chartConfig);
    return chart.render();
  }

  /**
   * Generate stacked area chart
   */
  generateStackedAreaChart(options: ChartGenerationOptions = {}): BWRPlotSpec {
    const chartData = {
      dataframe: this.dataFrame,
      xColumn: 'dt',
      yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
    };

    const chartConfig = {
      title: 'Transaction Fee Composition',
      subtitle: 'Share of Total Fees Over Time',
      xAxisTitle: 'Date',
      yAxisTitle: 'Fee Share (%)',
      width: options.width || 1200,
      height: options.height || 800,
      showLegend: true,
      showWatermark: true,
      fillOpacity: 0.7,
      lineWidth: 1
    };

    const chart = new MetricShareAreaChart(chartData, chartConfig);
    return chart.render();
  }

  /**
   * Generate bar chart (for debugging/alternative view)
   */
  generateBarChart(options: ChartGenerationOptions = {}): BWRPlotSpec {
    // Sample the data to show recent values only
    const recentData = this.dataFrame.head(30); // Last 30 days
    
    const chartData = {
      dataframe: recentData,
      xColumn: 'dt',
      yColumns: ['txfees_priorityfees_usd', 'txfees_basefee_usd', 'txfees_l1fee_usd']
    };

    const chartConfig = {
      title: 'Recent Transaction Fees (Bar Chart)',
      subtitle: 'Last 30 Days',
      xAxisTitle: 'Date',
      yAxisTitle: 'Fees (USD)',
      width: options.width || 1200,
      height: options.height || 800,
      showLegend: true,
      showWatermark: true,
      orientation: 'vertical' as const,
      barWidth: 0.8,
      opacity: 0.8
    };

    const chart = new BarChart(chartData, chartConfig);
    return chart.render();
  }

  /**
   * Export chart specification to JSON for analysis
   */
  exportChartSpec(spec: BWRPlotSpec, outputPath: string): void {
    const jsonString = JSON.stringify(spec, null, 2);
    writeFileSync(outputPath, jsonString);
    console.log(`Chart specification exported to: ${outputPath}`);
  }

  /**
   * Get data summary for debugging
   */
  getDataSummary(): any {
    return {
      shape: this.dataFrame.shape,
      columns: this.dataFrame.columns,
             dtRange: {
         min: this.dataFrame.getColumn('dt')?.toArray()[0],
         max: this.dataFrame.getColumn('dt')?.toArray()[this.dataFrame.shape[0] - 1]
       },
      feeStats: {
        priorityFees: this.getColumnStats('txfees_priorityfees_usd'),
        baseFees: this.getColumnStats('txfees_basefee_usd'),
        l1Fees: this.getColumnStats('txfees_l1fee_usd')
      }
    };
  }

  private getColumnStats(columnName: string): any {
    const column = this.dataFrame.getColumn(columnName);
    if (!column) return null;

    const values = column.toArray().filter((v: any) => v !== null && !isNaN(v as number)) as number[];
    if (values.length === 0) return null;

    values.sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: values[Math.floor(values.length / 2)]
    };
  }
}

/**
 * Main execution function for CLI usage
 */
export async function generateTestCharts(csvPath: string, outputDir: string): Promise<void> {
  const generator = new BWRChartGenerator(csvPath);
  await generator.loadData();

  console.log('Data Summary:', generator.getDataSummary());

  // Generate different chart types
  const lineChart = generator.generateTimeSeriesLineChart();
  const areaChart = generator.generateStackedAreaChart();
  const barChart = generator.generateBarChart();
  const stackedBarChart = generator.generateStackedBarChartMonthly();

  // Export specifications
  generator.exportChartSpec(lineChart, join(outputDir, 'line-chart-spec.json'));
  generator.exportChartSpec(areaChart, join(outputDir, 'area-chart-spec.json'));
  generator.exportChartSpec(barChart, join(outputDir, 'bar-chart-spec.json'));
  generator.exportChartSpec(stackedBarChart, join(outputDir, 'stacked-bar-chart-spec.json'));

  console.log('Charts generated successfully!');
}

// CLI execution
if (require.main === module) {
  const csvPath = join(__dirname, 'dataset.csv');
  const outputDir = __dirname;
  
  generateTestCharts(csvPath, outputDir)
    .then(() => console.log('Generation complete'))
    .catch(err => console.error('Generation failed:', err));
} 