// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Multi-Chart Type Demo Component                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState } from 'react';
import { DataFrame } from '../lib';
import { 
  ScatterPlot, 
  BarPlot, 
  MultiBarPlot, 
  StackedBarPlot,
  MetricShareAreaPlot,
  TablePlot 
} from '../components';

type ChartType = 'scatter' | 'bar' | 'multibar' | 'stackedbar' | 'metricsharearea' | 'table';

interface ChartTypeDemoProps {
  className?: string;
}

export default function ChartTypesDemo({ className }: ChartTypeDemoProps) {
  const [selectedChart, setSelectedChart] = useState<ChartType>('metricsharearea');
  const [error, setError] = useState<string | null>(null);

  // Generate test datasets for different chart types
  const testData = {
    scatter: generateScatterData(),
    bar: generateBarData(),
    multibar: generateMultiBarData(),
    stackedbar: generateStackedBarData(),
    metricsharearea: generateMetricShareAreaData(),
    table: generateTableData(),
  };

  const currentData = testData[selectedChart];

  const chartTypes: Array<{ key: ChartType; label: string; description: string }> = [
    { key: 'scatter', label: 'Scatter Plot', description: 'X-Y coordinate plotting with optional dual axis' },
    { key: 'bar', label: 'Bar Chart', description: 'Single series categorical bar chart' },
    { key: 'multibar', label: 'Multi-Bar Chart', description: 'Grouped bars with multiple series' },
    { key: 'stackedbar', label: 'Stacked Bar', description: 'Stacked bars with reversed color priority' },
    { key: 'metricsharearea', label: 'Metric Share Area', description: 'Normalized stacked area chart with percentage display' },
    { key: 'table', label: 'Table', description: 'DataFrame to HTML table with BWR dark styling' },
  ];

  const handleError = (err: Error) => {
    setError(err.message);
  };

  const renderChart = () => {
    try {
      setError(null);
      
      switch (selectedChart) {
        case 'scatter':
          return (
            <ScatterPlot
              data={currentData}
              xColumn="x"
              yColumns={['y']}
              title="Scatter Plot Demo"
              subtitle="Testing scatter plot implementation"
              onError={handleError}
              style={{ minHeight: '500px' }}
            />
          );
          
        case 'bar':
          return (
            <BarPlot
              dataframe={currentData}
              xColumn="category"
              yColumns={['value']}
              title="Bar Chart Demo"
              subtitle="Single series bar chart"
              colorByCategory={true}
              onError={handleError}
              style={{ minHeight: '500px' }}
            />
          );
          
        case 'multibar':
          return (
            <MultiBarPlot
              dataframe={currentData}
              xColumn="category"
              yColumns={['series_a', 'series_b', 'series_c']}
              title="Multi-Bar Chart Demo"
              subtitle="Grouped bars with circle legend markers"
              showValues={false}
              onError={handleError}
              style={{ minHeight: '500px' }}
            />
          );
          
        case 'stackedbar':
          return (
            <StackedBarPlot
              dataframe={currentData}
              xColumn="category"
              yColumns={['low_priority', 'medium_priority', 'high_priority']}
              title="Stacked Bar Chart Demo"
              subtitle="Testing reversed color priority mapping"
              sortColumns={true}
              showValues={false}
              onError={handleError}
              style={{ minHeight: '500px' }}
            />
          );

        case 'metricsharearea':
          return (
            <MetricShareAreaPlot
              dataframe={currentData}
              xColumn="date"
              yColumns={['product_a', 'product_b', 'product_c', 'product_d']}
              title="Market Share Evolution"
              subtitle="Normalized percentage view with last-row column sorting"
              smoothing={false}
              smoothingWindow={7}
              onError={handleError}
              style={{ minHeight: '500px' }}
            />
          );

        case 'table':
          return (
            <TablePlot
              dataframe={currentData}
              title="Sample Data Table"
              subtitle="BWR styled table with alternating rows and auto-formatting"
              maxRows={10}
              autoInferFormatters={true}
              onError={handleError}
              style={{ minHeight: '500px' }}
            />
          );
          
        default:
          return <div className="text-red-400">Unknown chart type</div>;
      }
    } catch (err) {
      return (
        <div className="text-red-400 p-4">
          Error rendering chart: {err instanceof Error ? err.message : 'Unknown error'}
        </div>
      );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Chart Type Selector */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Chart Type Selection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chartTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setSelectedChart(type.key)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedChart === type.key
                  ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                  : 'border-gray-600 hover:border-gray-500 text-gray-300'
              }`}
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-sm text-gray-400 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dataset Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Dataset</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dataset Stats */}
          <div>
            <h4 className="font-medium mb-2">Dataset Info</h4>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-400">Shape:</span>{' '}
                <span className="text-green-400">
                  {currentData.shape[0]} × {currentData.shape[1]}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Columns:</span>{' '}
                <span className="text-blue-400">
                  {currentData.columns.join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <h4 className="font-medium mb-2">Data Sample</h4>
            <div className="overflow-auto max-h-32">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-600">
                    {currentData.columns.slice(0, 4).map((col) => (
                      <th key={col} className="text-left p-1 text-gray-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentData.head(3).to('records').map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-700">
                      {currentData.columns.slice(0, 4).map((col) => (
                        <td key={col} className="p-1 text-gray-300">
                          {typeof row[col] === 'number' 
                            ? row[col].toFixed(2) 
                            : String(row[col] || 'null')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="text-red-400 font-medium">Chart Error</div>
          <div className="text-red-300 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Chart Display */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {chartTypes.find(t => t.key === selectedChart)?.label}
        </h3>
        
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          {renderChart()}
        </div>
      </div>

      {/* Python Comparison Instructions */}
      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
        <h4 className="text-blue-400 font-medium mb-2">Visual Regression Testing</h4>
        <div className="text-blue-300 text-sm space-y-1">
          <div>• Start Python server: <code className="bg-gray-700 px-2 py-1 rounded">cd tools/dev-server && python server.py</code></div>
          <div>• Current chart type: <span className="font-medium">{selectedChart}</span></div>
          <div>• Expected: Circle legend markers for multi/stacked bar and area charts</div>
          <div>• Expected: Reversed color priority for stacked bars (highest sum gets last color)</div>
          {selectedChart === 'metricsharearea' && (
            <div className="mt-2 space-y-1">
              <div>• <span className="text-yellow-400">Area Chart Testing:</span></div>
              <div>• Column sorting by last row values (Product C should get highest priority)</div>
              <div>• Y-axis shows 0-100% with 20% intervals</div>
              <div>• Data normalized so each time point sums to 100%</div>
              <div>• Hover shows percentages with column name</div>
            </div>
          )}
          {selectedChart === 'table' && (
            <div className="mt-2 space-y-1">
              <div>• <span className="text-yellow-400">Table Testing:</span></div>
              <div>• Alternating row colors (even: #1A1A1A, odd: #1A1A1A)</div>
              <div>• Header background: #2a2a2a</div>
              <div>• Auto-inferred formatters for Price, Rating, Date columns</div>
              <div>• Left-aligned text throughout</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Test data generators
function generateScatterData(): DataFrame {
  const size = 50;
  const data: Record<string, number[]> = { x: [], y: [] };
  
  for (let i = 0; i < size; i++) {
    data.x.push(i);
    data.y.push(Math.sin(i * 0.1) * 50 + Math.random() * 20);
  }
  
  return new DataFrame(data);
}

function generateBarData(): DataFrame {
  const categories = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  const data: Record<string, any[]> = {
    category: categories,
    value: [25, 40, 60, 35, 80]
  };
  
  return new DataFrame(data);
}

function generateMultiBarData(): DataFrame {
  const categories = ['Q1', 'Q2', 'Q3', 'Q4'];
  const data: Record<string, any[]> = {
    category: categories,
    series_a: [100, 120, 140, 110],  // Revenue
    series_b: [80, 90, 100, 95],     // Costs
    series_c: [20, 30, 40, 15]       // Profit
  };
  
  return new DataFrame(data);
}

function generateStackedBarData(): DataFrame {
  const categories = ['Team A', 'Team B', 'Team C', 'Team D'];
  const data: Record<string, any[]> = {
    category: categories,
    low_priority: [10, 15, 8, 12],      // Sum: 45 (lowest, should get first color)
    medium_priority: [25, 30, 20, 28],  // Sum: 103 (middle, should get middle color) 
    high_priority: [40, 35, 45, 42]     // Sum: 162 (highest, should get LAST color - reversed priority)
  };
  
  return new DataFrame(data);
}

function generateMetricShareAreaData(): DataFrame {
  // Generate date range
  const startDate = new Date('2024-01-01');
  const dates: string[] = [];
  const numDays = 180; // 6 months
  
  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  // Generate market share data that evolves over time
  // Note: These will be normalized automatically by the chart
  const data: Record<string, any[]> = {
    date: dates,
    product_a: [], // Traditional product declining
    product_b: [], // Steady performer
    product_c: [], // Growing newcomer
    product_d: [], // Volatile performer
  };
  
  for (let i = 0; i < numDays; i++) {
    const progress = i / numDays; // 0 to 1
    
    // Product A: Declining market share (starts high, ends low)
    data.product_a.push(50 - progress * 20 + Math.sin(i * 0.1) * 3);
    
    // Product B: Steady with slight growth
    data.product_b.push(25 + progress * 5 + Math.cos(i * 0.05) * 2);
    
    // Product C: Growing newcomer (starts low, ends high)
    data.product_c.push(15 + progress * 20 + Math.sin(i * 0.15) * 2);
    
    // Product D: Volatile with cyclical pattern
    data.product_d.push(10 + Math.sin(i * 0.2) * 8 + Math.cos(i * 0.03) * 3);
  }
  
  return new DataFrame(data);
}

function generateTableData(): DataFrame {
  const data: Record<string, any[]> = {
    'ID': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'Product': [
      'BWR Analytics Pro', 'Chart Builder', 'Data Visualizer', 
      'Dashboard Suite', 'Report Generator', 'Metric Tracker',
      'Performance Monitor', 'Insight Engine', 'Trend Analyzer', 'Plot Master'
    ],
    'Category': [
      'Analytics', 'Tools', 'Visualization', 'Dashboards', 'Reports',
      'Metrics', 'Monitoring', 'Intelligence', 'Analysis', 'Plotting'
    ],
    'Price': [299.99, 149.50, 199.00, 399.99, 89.99, 179.50, 249.00, 459.99, 129.99, 99.50],
    'Units Sold': [1250, 2100, 1800, 950, 3200, 1600, 1100, 800, 2400, 2800],
    'Rating': [4.8, 4.2, 4.5, 4.9, 3.8, 4.1, 4.3, 4.7, 4.0, 4.4],
    'Launch Date': [
      '2024-01-15', '2024-02-28', '2024-03-10', '2024-01-05',
      '2024-04-20', '2024-02-14', '2024-03-25', '2024-01-30',
      '2024-04-08', '2024-02-12'
    ],
    'Active': [true, true, true, false, true, true, false, true, true, true]
  };
  
  return new DataFrame(data);
}