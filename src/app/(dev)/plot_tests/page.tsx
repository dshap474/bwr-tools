'use client';

import { useEffect, useState } from 'react';
import { BWRChart } from '@/lib/bwr-plots/react/BWRChart';
import { parseCsvToObject, processDataForStackedBar } from '@/lib/bwr-plots/data/processors';
import { DataFrame } from '@/lib/bwr-plots/data/DataFrame';

export default function PlotTestsPage() {
  const [csvData, setCsvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartSuccess, setChartSuccess] = useState<boolean>(false);

  const addDebug = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data);
    setDebugInfo(prev => [...prev, { timestamp, message, data }]);
  };

  useEffect(() => {
    async function loadData() {
      try {
        addDebug('Starting data load...');
        
        // Load the CSV data
        const response = await fetch('/dataset.csv');
        addDebug('Fetch response status', { ok: response.ok, status: response.status });
        
        if (!response.ok) {
          throw new Error(`Failed to load dataset.csv: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        addDebug('CSV text loaded', { length: csvText.length, preview: csvText.substring(0, 200) });
        
        // Parse CSV using our consolidated system
        const parsedData = parseCsvToObject(csvText);
        addDebug('CSV parsed', { 
          keys: Object.keys(parsedData), 
          firstColumnLength: parsedData[Object.keys(parsedData)[0]]?.length 
        });
        
        // Create DataFrame
        const df = new DataFrame(parsedData);
        addDebug('DataFrame created', { 
          shape: df.shape, 
          columns: df.columns,
          dtypes: df.dtypes
        });
        
        // Process data exactly like Python (monthly grouping)
        const processedData = processDataForStackedBar(df, {
          groupByMonth: true,
          xaxis_is_date: true
        });
        addDebug('Data processed for stacked bar', {
          isDataFrame: processedData instanceof DataFrame,
          shape: processedData.shape,
          columns: processedData.columns
        });
        
        setCsvData(processedData);
        setLoading(false);
        addDebug('Data loading complete');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error loading data:', err);
        addDebug('Error loading data', { error: errorMessage, stack: err instanceof Error ? err.stack : undefined });
        setError(errorMessage);
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">BWR Plot Test - Stacked Bar Chart</h1>
          <div className="flex items-center justify-center h-96">
            <div className="text-lg">Loading chart data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">BWR Plot Test - Stacked Bar Chart</h1>
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-8">
            <p className="text-red-600">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">BWR Plot Test - Stacked Bar Chart</h1>
        <p className="text-gray-600 mb-8">
          Testing pixel-perfect rendering using consolidated BWR plotting system
        </p>
        
        {csvData && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
            <div className="w-full overflow-x-auto">
              <div style={{ width: '1920px', height: '1080px' }}>
                <BWRChart
                  chartType="stacked_bar_chart"
                  data={csvData}
                  options={{
                    title: 'Base: Network REV',
                    subtitle: 'In 2024 Base generated $88.9M in REV. This is a reasonable comp for the potential of Robinhood in its first year',
                    source: 'Uploaded Data',
                    xaxis_is_date: true,
                    sort_descending: false,
                    opacity: 0.8,
                    bargap: 0.15
                  }}
                  config={{
                    general: { width: 1920, height: 1080 }
                  }}
                  onError={(err) => {
                    console.error('Chart error:', err);
                    setChartError(err.message);
                    addDebug('Chart generation error', { 
                      message: err.message, 
                      stack: err.stack,
                      name: err.name 
                    });
                  }}
                  onSuccess={(spec) => {
                    console.log('Chart generated successfully:', spec);
                    setChartSuccess(true);
                    addDebug('Chart generated successfully', { 
                      dataLength: spec.data?.length,
                      hasLayout: !!spec.layout,
                      hasConfig: !!spec.config
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Reference Image</h2>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <img 
              src="/example.png" 
              alt="Reference chart" 
              className="w-full"
            />
          </div>
        </div>

        {/* Debug Information Section */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Debug Information</h2>
          
          {/* Chart Status */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold mb-2">Chart Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center">
                <span className="font-medium mr-2">Chart Success:</span>
                <span className={chartSuccess ? 'text-green-600' : 'text-gray-400'}>
                  {chartSuccess ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">Chart Error:</span>
                <span className={chartError ? 'text-red-600' : 'text-gray-400'}>
                  {chartError || 'None'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">Data Loaded:</span>
                <span className={csvData ? 'text-green-600' : 'text-red-600'}>
                  {csvData ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              {csvData && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Data Type:</span>
                  <span>{csvData.constructor.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Debug Log */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold mb-2">Debug Log</h3>
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2 text-xs font-mono">
                {debugInfo.map((item, index) => (
                  <div key={index} className="border-b pb-2">
                    <div className="text-gray-500">{item.timestamp}</div>
                    <div className="font-semibold">{item.message}</div>
                    {item.data && (
                      <pre className="text-gray-600 overflow-x-auto">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}