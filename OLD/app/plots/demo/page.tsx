'use client';

// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Chart Demo Page                                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

import React, { useState, useEffect } from 'react';
import { DataFrame } from '../lib';
import { ScatterPlot } from '../components';
import { TestDataGenerator } from '../components';
import ChartTypesDemo from './chart-types-demo';

export default function ChartDemoPage() {
  const [demoMode, setDemoMode] = useState<'scatter' | 'all-charts'>('all-charts');
  const [selectedDataset, setSelectedDataset] = useState<string>('simple');
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataInfo, setDataInfo] = useState<any>(null);

  // Generate test datasets
  const datasets = {
    simple: TestDataGenerator.generateLinearData(20),
    sinusoidal: TestDataGenerator.generateSinusoidalData(100),
    correlated: TestDataGenerator.generateCorrelatedData(150, 0.8),
    financial: TestDataGenerator.generateFinancialData(60),
    withMissing: TestDataGenerator.generateDataWithMissing(50, 0.1),
    large: TestDataGenerator.generateLargeDataset(5000)
  };

  const currentDataset = datasets[selectedDataset as keyof typeof datasets];

  const handleConfigReady = (config: any) => {
    setChartConfig(config);
    setError(null);
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setChartConfig(null);
  };

  const handleDataChange = (chart: any) => {
    if (chart) {
      setDataInfo(chart.getDataInfo());
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-400 mb-2">
            BWR Charts Demo
          </h1>
          <p className="text-gray-400">
            Testing chart implementations with pixel-perfect BWR theme
          </p>
          
          {/* Demo Mode Selector */}
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setDemoMode('all-charts')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                demoMode === 'all-charts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Chart Types
            </button>
            <button
              onClick={() => setDemoMode('scatter')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                demoMode === 'scatter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Scatter Plot Testing
            </button>
          </div>
        </div>

        {/* Chart Types Demo */}
        {demoMode === 'all-charts' && (
          <ChartTypesDemo />
        )}

        {/* Scatter Plot Testing Mode */}
        {demoMode === 'scatter' && (
          <>
            {/* Controls */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Dataset Selection</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(datasets).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedDataset(key)}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedDataset === key
                    ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                    : 'border-gray-600 hover:border-gray-500 text-gray-300'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dataset Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Data Preview */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Dataset Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Shape:</span>{' '}
                <span className="text-green-400">
                  {currentDataset.shape[0]} × {currentDataset.shape[1]}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Columns:</span>{' '}
                <span className="text-blue-400">
                  {currentDataset.columns.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Types:</span>
                <div className="mt-1 text-xs">
                  {Object.entries(currentDataset.dtypes).map(([col, type]) => (
                    <div key={col} className="text-gray-300">
                      {col}: <span className="text-yellow-400">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data Sample */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Data Sample</h3>
            <div className="overflow-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-600">
                    {currentDataset.columns.slice(0, 4).map((col) => (
                      <th key={col} className="text-left p-1 text-gray-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentDataset.head(5).to('records').map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-700">
                      {currentDataset.columns.slice(0, 4).map((col) => (
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

          {/* Chart Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Chart Status</h3>
            <div className="space-y-2 text-sm">
              {error ? (
                <div className="text-red-400">
                  <div className="font-medium">Error:</div>
                  <div className="text-xs mt-1">{error}</div>
                </div>
              ) : chartConfig ? (
                <div className="text-green-400">
                  <div className="font-medium">✓ Chart Generated</div>
                  <div className="text-xs mt-1 text-gray-400">
                    Config: {JSON.stringify(chartConfig).length} chars
                  </div>
                </div>
              ) : (
                <div className="text-yellow-400">
                  <div className="font-medium">⏳ Generating...</div>
                </div>
              )}
              
              {dataInfo && (
                <div className="mt-4 text-xs text-gray-400">
                  <div>Validation: {dataInfo.validation?.isValid ? '✓' : '✗'}</div>
                  {dataInfo.validation?.warnings?.length > 0 && (
                    <div className="text-yellow-400 mt-1">
                      Warnings: {dataInfo.validation.warnings.length}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Display */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Scatter Plot</h3>
          
          <div className="border border-gray-600 rounded-lg overflow-hidden">
            <ScatterPlot
              data={currentDataset}
              xColumn={getXColumn(selectedDataset)}
              yColumns={getYColumns(selectedDataset)}
              y2Columns={getY2Columns(selectedDataset)}
              colorColumn={getColorColumn(selectedDataset)}
              title={`${selectedDataset.charAt(0).toUpperCase() + selectedDataset.slice(1)} Dataset`}
              subtitle="BWR Tools Chart Demo"
              enableDualAxis={selectedDataset === 'financial'}
              onConfigReady={handleConfigReady}
              onError={handleError}
              onDataChange={handleDataChange}
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>

        {/* Configuration Display */}
        {chartConfig && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Generated Plotly Configuration</h3>
            <details className="cursor-pointer">
              <summary className="text-blue-400 hover:text-blue-300 mb-2">
                Show/Hide Configuration JSON
              </summary>
              <pre className="text-xs bg-gray-900 p-4 rounded overflow-auto max-h-96 text-gray-300">
                {JSON.stringify(chartConfig, null, 2)}
              </pre>
            </details>
          </div>
        )}

            {/* Python Server Test */}
            <div className="mt-8 bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Python Server Integration</h3>
              <PythonServerTest />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper functions to determine chart configuration based on dataset
function getXColumn(dataset: string): string {
  switch (dataset) {
    case 'sinusoidal':
    case 'financial':
      return 'date';
    case 'correlated':
      return 'x';
    default:
      return 'x';
  }
}

function getYColumns(dataset: string): string[] {
  switch (dataset) {
    case 'sinusoidal':
      return ['sine', 'cosine'];
    case 'financial':
      return ['close'];
    case 'correlated':
      return ['y'];
    case 'withMissing':
      return ['y', 'z'];
    case 'large':
      return ['y'];
    default:
      return ['y'];
  }
}

function getY2Columns(dataset: string): string[] | undefined {
  switch (dataset) {
    case 'financial':
      return ['volume'];
    default:
      return undefined;
  }
}

function getColorColumn(dataset: string): string | undefined {
  switch (dataset) {
    case 'correlated':
      return 'color_value';
    case 'large':
      return 'group';
    default:
      return undefined;
  }
}

// Component to test Python server integration
function PythonServerTest() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    try {
      const response = await fetch('http://localhost:5001/health');
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const testPythonGeneration = async () => {
    if (serverStatus !== 'online') return;

    try {
      const response = await fetch('http://localhost:5001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'scatter',
          data: { x: [1, 2, 3], y: [1, 4, 9] },
          config: { x: 'x', y: ['y'], title: 'Test' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      }
    } catch (error) {
      console.error('Python test failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            serverStatus === 'checking' ? 'bg-yellow-400' :
            serverStatus === 'online' ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <span className="text-sm">
            Server: {serverStatus === 'checking' ? 'Checking...' : 
                    serverStatus === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <button
          onClick={testPythonGeneration}
          disabled={serverStatus !== 'online'}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
        >
          Test Python Generation
        </button>
      </div>

      {serverStatus === 'offline' && (
        <div className="text-sm text-yellow-400">
          💡 Start Python server with: <code className="bg-gray-700 px-2 py-1 rounded">cd tools/dev-server && python server.py</code>
        </div>
      )}

      {testResult && (
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-400">Python Test Result</summary>
          <pre className="mt-2 bg-gray-900 p-2 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}