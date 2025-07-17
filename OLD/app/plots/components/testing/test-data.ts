// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Test Data Generation                                                                │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from '../../lib';

/**
 * Generate synthetic data for testing various chart scenarios
 */
export class TestDataGenerator {
  
  /**
   * Generate simple linear data
   */
  static generateLinearData(points: number = 100): DataFrame {
    const data: Record<string, number[]> = {
      x: [],
      y: [],
      y2: []
    };

    for (let i = 0; i < points; i++) {
      data.x.push(i);
      data.y.push(i * 2 + Math.random() * 10);
      data.y2.push(i * 0.5 + Math.random() * 5);
    }

    return new DataFrame(data);
  }

  /**
   * Generate sinusoidal data for time series testing
   */
  static generateSinusoidalData(points: number = 365): DataFrame {
    const data: Record<string, any[]> = {
      date: [],
      sine: [],
      cosine: [],
      trend: [],
      noise: []
    };

    const startDate = new Date('2023-01-01');

    for (let i = 0; i < points; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.date.push(date.toISOString().split('T')[0]);
      data.sine.push(Math.sin(i / 20) * 100 + 200);
      data.cosine.push(Math.cos(i / 30) * 50 + 100);
      data.trend.push(i * 0.5 + Math.random() * 20);
      data.noise.push(Math.random() * 100);
    }

    return new DataFrame(data);
  }

  /**
   * Generate categorical data for bar charts
   */
  static generateCategoricalData(categories: string[] = ['A', 'B', 'C', 'D', 'E']): DataFrame {
    const data: Record<string, any[]> = {
      category: [],
      value1: [],
      value2: [],
      value3: []
    };

    for (const category of categories) {
      data.category.push(category);
      data.value1.push(Math.random() * 100 + 50);
      data.value2.push(Math.random() * 80 + 20);
      data.value3.push(Math.random() * 120 + 30);
    }

    return new DataFrame(data);
  }

  /**
   * Generate scatter data with correlation
   */
  static generateCorrelatedData(points: number = 200, correlation: number = 0.8): DataFrame {
    const data: Record<string, number[]> = {
      x: [],
      y: [],
      size: [],
      color_value: []
    };

    for (let i = 0; i < points; i++) {
      const x = Math.random() * 100;
      const noise = Math.random() * (1 - Math.abs(correlation)) * 100;
      const y = x * correlation + noise;
      
      data.x.push(x);
      data.y.push(y);
      data.size.push(Math.random() * 20 + 5);
      data.color_value.push(Math.floor(Math.random() * 5));
    }

    return new DataFrame(data);
  }

  /**
   * Generate data with missing values
   */
  static generateDataWithMissing(points: number = 100, missingPercent: number = 0.1): DataFrame {
    const data: Record<string, any[]> = {
      x: [],
      y: [],
      z: []
    };

    for (let i = 0; i < points; i++) {
      data.x.push(Math.random() < missingPercent ? null : i);
      data.y.push(Math.random() < missingPercent ? null : Math.random() * 100);
      data.z.push(Math.random() < missingPercent ? null : Math.sin(i / 10) * 50);
    }

    return new DataFrame(data);
  }

  /**
   * Generate financial time series data
   */
  static generateFinancialData(days: number = 252): DataFrame {
    const data: Record<string, any[]> = {
      date: [],
      open: [],
      high: [],
      low: [],
      close: [],
      volume: []
    };

    const startDate = new Date('2023-01-01');
    let price = 100;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Random walk with slight upward trend
      const change = (Math.random() - 0.48) * 5;
      price = Math.max(10, price + change);
      
      const open = price;
      const close = price + (Math.random() - 0.5) * 3;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000000 + 100000);

      data.date.push(date.toISOString().split('T')[0]);
      data.open.push(open);
      data.high.push(high);
      data.low.push(Math.max(0, low));
      data.close.push(close);
      data.volume.push(volume);
      
      price = close;
    }

    return new DataFrame(data);
  }

  /**
   * Generate large dataset for performance testing
   */
  static generateLargeDataset(points: number = 100000): DataFrame {
    const data: Record<string, number[]> = {
      x: [],
      y: [],
      group: []
    };

    for (let i = 0; i < points; i++) {
      data.x.push(Math.random() * 1000);
      data.y.push(Math.random() * 1000);
      data.group.push(Math.floor(Math.random() * 10));
    }

    return new DataFrame(data);
  }

  /**
   * Generate data with extreme values (outliers)
   */
  static generateDataWithOutliers(points: number = 100, outlierPercent: number = 0.05): DataFrame {
    const data: Record<string, number[]> = {
      x: [],
      y: [],
      is_outlier: []
    };

    for (let i = 0; i < points; i++) {
      const isOutlier = Math.random() < outlierPercent;
      
      if (isOutlier) {
        data.x.push(Math.random() * 1000 + 500); // Extreme X values
        data.y.push(Math.random() * 1000 + 500); // Extreme Y values
        data.is_outlier.push(1);
      } else {
        data.x.push(Math.random() * 100); // Normal range
        data.y.push(Math.random() * 100); // Normal range
        data.is_outlier.push(0);
      }
    }

    return new DataFrame(data);
  }

  /**
   * Generate multi-dimensional data
   */
  static generateMultiDimensionalData(points: number = 1000): DataFrame {
    const data: Record<string, any[]> = {
      x: [],
      y1: [],
      y2: [],
      y3: [],
      y4: [],
      category: [],
      date: []
    };

    const categories = ['Tech', 'Finance', 'Healthcare', 'Energy', 'Consumer'];
    const startDate = new Date('2023-01-01');

    for (let i = 0; i < points; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor(i / 5));
      
      data.x.push(i);
      data.y1.push(Math.sin(i / 50) * 100 + Math.random() * 20);
      data.y2.push(Math.cos(i / 30) * 80 + Math.random() * 15);
      data.y3.push(Math.random() * 200 + 50);
      data.y4.push(Math.log(i + 1) * 10 + Math.random() * 5);
      data.category.push(categories[i % categories.length]);
      data.date.push(date.toISOString().split('T')[0]);
    }

    return new DataFrame(data);
  }
}

/**
 * Pre-generated test datasets for quick access
 */
export const TEST_DATASETS = {
  // Small datasets for quick tests
  simple: TestDataGenerator.generateLinearData(20),
  categorical: TestDataGenerator.generateCategoricalData(['Red', 'Green', 'Blue']),
  
  // Medium datasets for typical use cases
  timeSeries: TestDataGenerator.generateSinusoidalData(100),
  financial: TestDataGenerator.generateFinancialData(60),
  correlated: TestDataGenerator.generateCorrelatedData(150, 0.7),
  
  // Edge cases
  withMissing: TestDataGenerator.generateDataWithMissing(50, 0.2),
  withOutliers: TestDataGenerator.generateDataWithOutliers(80, 0.1),
  
  // Large datasets
  large: TestDataGenerator.generateLargeDataset(10000),
  multiDimensional: TestDataGenerator.generateMultiDimensionalData(500),
};

/**
 * Get dataset by name with error handling
 */
export function getTestDataset(name: keyof typeof TEST_DATASETS): DataFrame {
  const dataset = TEST_DATASETS[name];
  if (!dataset) {
    throw new Error(`Test dataset '${name}' not found. Available: ${Object.keys(TEST_DATASETS).join(', ')}`);
  }
  return dataset;
}

/**
 * Create custom test data with specific characteristics
 */
export interface CustomDataOptions {
  points?: number;
  dimensions?: number;
  missingPercent?: number;
  outlierPercent?: number;
  correlation?: number;
  includeCategories?: boolean;
  includeDates?: boolean;
  dataType?: 'linear' | 'sinusoidal' | 'random' | 'financial';
}

export function createCustomTestData(options: CustomDataOptions = {}): DataFrame {
  const {
    points = 100,
    dimensions = 2,
    missingPercent = 0,
    outlierPercent = 0,
    correlation = 0,
    includeCategories = false,
    includeDates = false,
    dataType = 'random'
  } = options;

  switch (dataType) {
    case 'linear':
      return TestDataGenerator.generateLinearData(points);
    case 'sinusoidal':
      return TestDataGenerator.generateSinusoidalData(points);
    case 'financial':
      return TestDataGenerator.generateFinancialData(points);
    default:
      return TestDataGenerator.generateCorrelatedData(points, correlation);
  }
}