// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Processing Options Component                                                        │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo } from 'react';
import {
  ProcessingOptionsProps,
  ProcessingConfig,
  ProcessingFunction,
  ChartType,
  getChartTypeConfig,
  ProcessingValidation
} from './types';

const PROCESSING_FUNCTIONS: Record<ProcessingFunction, {
  label: string;
  description: string;
  parameters: Record<string, { type: 'number' | 'string' | 'select'; options?: string[]; default: any; label: string; }>;
  applicableColumns: 'numeric' | 'datetime' | 'all';
  icon: string;
}> = {
  resample: {
    label: 'Resample',
    description: 'Resample time series data to different frequencies',
    parameters: {
      rule: { type: 'select', options: ['D', 'W', 'ME', 'QE', 'YE', '1H', '1min', '5min', '15min'], default: 'D', label: 'Frequency' },
      method: { type: 'select', options: ['mean', 'sum', 'first', 'last', 'min', 'max'], default: 'mean', label: 'Aggregation Method' }
    },
    applicableColumns: 'datetime',
    icon: '⏱️'
  },
  rolling: {
    label: 'Rolling Window',
    description: 'Apply rolling window calculations',
    parameters: {
      window: { type: 'number', default: 5, label: 'Window Size' },
      method: { type: 'select', options: ['mean', 'sum', 'min', 'max', 'std'], default: 'mean', label: 'Method' },
      minPeriods: { type: 'number', default: 1, label: 'Min Periods' }
    },
    applicableColumns: 'numeric',
    icon: '📊'
  },
  smooth: {
    label: 'Smoothing',
    description: 'Apply smoothing algorithms to reduce noise',
    parameters: {
      method: { type: 'select', options: ['moving_average', 'exponential', 'savgol'], default: 'moving_average', label: 'Method' },
      window: { type: 'number', default: 5, label: 'Window Size' },
      alpha: { type: 'number', default: 0.3, label: 'Alpha (for exponential)' }
    },
    applicableColumns: 'numeric',
    icon: '🌊'
  },
  scale: {
    label: 'Scale Data',
    description: 'Scale data to different ranges or units',
    parameters: {
      method: { type: 'select', options: ['minmax', 'standard', 'robust'], default: 'minmax', label: 'Scaling Method' },
      feature_range_min: { type: 'number', default: 0, label: 'Min Value (MinMax)' },
      feature_range_max: { type: 'number', default: 1, label: 'Max Value (MinMax)' }
    },
    applicableColumns: 'numeric',
    icon: '📏'
  },
  normalize: {
    label: 'Normalize',
    description: 'Normalize data to unit norm',
    parameters: {
      norm: { type: 'select', options: ['l1', 'l2', 'max'], default: 'l2', label: 'Norm Type' }
    },
    applicableColumns: 'numeric',
    icon: '⚖️'
  },
  log_transform: {
    label: 'Log Transform',
    description: 'Apply logarithmic transformation',
    parameters: {
      base: { type: 'select', options: ['natural', '10', '2'], default: 'natural', label: 'Log Base' },
      offset: { type: 'number', default: 1, label: 'Offset (to handle zeros)' }
    },
    applicableColumns: 'numeric',
    icon: '📐'
  },
  difference: {
    label: 'Difference',
    description: 'Calculate differences between consecutive values',
    parameters: {
      periods: { type: 'number', default: 1, label: 'Periods' },
      method: { type: 'select', options: ['diff', 'pct_change'], default: 'diff', label: 'Method' }
    },
    applicableColumns: 'numeric',
    icon: '📈'
  }
};

export interface EnhancedProcessingOptionsProps extends ProcessingOptionsProps {
  pythonCompatMode?: boolean;
  sampleData?: Record<string, any[]>;
  selectedColumns?: string[];
}

export function ProcessingOptions({
  columns,
  processing,
  onProcessingChange,
  chartType,
  disabled = false,
  className = '',
  pythonCompatMode = false,
  sampleData,
  selectedColumns = []
}: EnhancedProcessingOptionsProps) {
  const [expandedProcessing, setExpandedProcessing] = useState<Set<string>>(new Set());
  const [newProcessingFunction, setNewProcessingFunction] = useState<ProcessingFunction | ''>('');
  const [newProcessingColumn, setNewProcessingColumn] = useState('');

  const chartConfig = getChartTypeConfig(chartType);

  // Analyze columns for processing applicability
  const columnAnalysis = useMemo(() => {
    // This would ideally come from the DataFrame or data analysis
    // For now, we'll make educated guesses based on column names
    const analysis: Record<string, 'numeric' | 'datetime' | 'string'> = {};
    
    for (const column of columns) {
      // Simple heuristics - in real implementation this would come from actual data analysis
      if (column.toLowerCase().includes('date') || column.toLowerCase().includes('time')) {
        analysis[column] = 'datetime';
      } else if (column.toLowerCase().includes('price') || 
                 column.toLowerCase().includes('amount') || 
                 column.toLowerCase().includes('count') ||
                 column.toLowerCase().includes('value')) {
        analysis[column] = 'numeric';
      } else {
        analysis[column] = 'string';
      }
    }
    
    return analysis;
  }, [columns]);

  // Get available processing functions for chart type
  const availableProcessingFunctions = useMemo(() => {
    let functions = chartConfig.supportedProcessing.filter(func => 
      Object.keys(PROCESSING_FUNCTIONS).includes(func)
    ) as ProcessingFunction[];

    // Python app specific filtering based on chart types
    if (pythonCompatMode) {
      // SMOOTHING_PLOT_TYPES = ["Scatter Plot", "Metric Share Area Plot"]
      if (chartType === 'scatter' || chartType === 'metricsharearea') {
        if (!functions.includes('smooth')) functions.push('smooth');
        if (!functions.includes('rolling')) functions.push('rolling');
      }
      
      // RESAMPLING_PLOT_TYPES = ["Grouped Bar (Timeseries)", "Stacked Bar (Timeseries)"]
      if (chartType === 'multibar' || chartType === 'stackedbar') {
        if (!functions.includes('resample')) functions.push('resample');
      }
    }

    return functions;
  }, [chartConfig.supportedProcessing, pythonCompatMode, chartType]);

  // Validate processing configuration
  const validateProcessing = (config: ProcessingConfig): ProcessingValidation => {
    const errors: string[] = [];
    
    if (!config.column) {
      errors.push('Column is required');
    }
    
    if (!config.function) {
      errors.push('Processing function is required');
    }

    const funcConfig = PROCESSING_FUNCTIONS[config.function];
    if (funcConfig && config.column) {
      const columnType = columnAnalysis[config.column];
      
      if (funcConfig.applicableColumns === 'numeric' && columnType !== 'numeric') {
        errors.push(`${funcConfig.label} can only be applied to numeric columns`);
      }
      
      if (funcConfig.applicableColumns === 'datetime' && columnType !== 'datetime') {
        errors.push(`${funcConfig.label} can only be applied to datetime columns`);
      }
    }

    // Validate parameters
    if (funcConfig) {
      for (const [paramName, paramConfig] of Object.entries(funcConfig.parameters)) {
        const value = config.parameters[paramName];
        
        if (paramConfig.type === 'number' && (value == null || isNaN(Number(value)))) {
          errors.push(`${paramConfig.label} must be a valid number`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      outputColumns: config.column ? [`${config.column}_${config.function}`] : []
    };
  };

  const addProcessing = () => {
    if (!newProcessingFunction || !newProcessingColumn) return;

    const funcConfig = PROCESSING_FUNCTIONS[newProcessingFunction];
    const defaultParameters: Record<string, any> = {};
    
    for (const [paramName, paramConfig] of Object.entries(funcConfig.parameters)) {
      defaultParameters[paramName] = paramConfig.default;
    }

    const newProcessing: ProcessingConfig = {
      id: `processing-${Date.now()}`,
      function: newProcessingFunction,
      column: newProcessingColumn,
      parameters: defaultParameters,
      enabled: true
    };

    onProcessingChange([...processing, newProcessing]);
    setNewProcessingFunction('');
    setNewProcessingColumn('');
    setExpandedProcessing(prev => new Set([...prev, newProcessing.id]));
  };

  const updateProcessing = (processingId: string, updates: Partial<ProcessingConfig>) => {
    const newProcessing = processing.map(proc =>
      proc.id === processingId ? { ...proc, ...updates } : proc
    );
    onProcessingChange(newProcessing);
  };

  const removeProcessing = (processingId: string) => {
    const newProcessing = processing.filter(proc => proc.id !== processingId);
    onProcessingChange(newProcessing);
    setExpandedProcessing(prev => {
      const next = new Set(prev);
      next.delete(processingId);
      return next;
    });
  };

  const toggleProcessingExpanded = (processingId: string) => {
    setExpandedProcessing(prev => {
      const next = new Set(prev);
      if (next.has(processingId)) {
        next.delete(processingId);
      } else {
        next.add(processingId);
      }
      return next;
    });
  };

  const getApplicableColumns = (func: ProcessingFunction): string[] => {
    const funcConfig = PROCESSING_FUNCTIONS[func];
    if (funcConfig.applicableColumns === 'all') return columns;
    
    return columns.filter(col => columnAnalysis[col] === funcConfig.applicableColumns);
  };

  const renderParameterInput = (
    processingId: string,
    paramName: string,
    paramConfig: any,
    currentValue: any
  ) => {
    const updateParameter = (value: any) => {
      const proc = processing.find(p => p.id === processingId);
      if (proc) {
        updateProcessing(processingId, {
          parameters: { ...proc.parameters, [paramName]: value }
        });
      }
    };

    if (paramConfig.type === 'select') {
      return (
        <select
          value={currentValue || paramConfig.default}
          onChange={(e) => updateParameter(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
          disabled={disabled}
        >
          {paramConfig.options.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    if (paramConfig.type === 'number') {
      return (
        <input
          type="number"
          value={currentValue ?? paramConfig.default}
          onChange={(e) => updateParameter(parseFloat(e.target.value) || paramConfig.default)}
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
          step="any"
          disabled={disabled}
        />
      );
    }

    return (
      <input
        type="text"
        value={currentValue || paramConfig.default}
        onChange={(e) => updateParameter(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
        disabled={disabled}
      />
    );
  };

  const renderProcessingCard = (proc: ProcessingConfig) => {
    const validation = validateProcessing(proc);
    const isExpanded = expandedProcessing.has(proc.id);
    const funcConfig = PROCESSING_FUNCTIONS[proc.function];

    return (
      <div key={proc.id} className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={proc.enabled}
                onChange={(e) => updateProcessing(proc.id, { enabled: e.target.checked })}
                className="rounded border-gray-600 text-blue-500"
                disabled={disabled}
              />
              <span className="text-lg">{funcConfig.icon}</span>
              <div>
                <div className="text-sm text-gray-300">
                  {funcConfig.label} → {proc.column}
                </div>
                <div className="text-xs text-gray-500">
                  {funcConfig.description}
                </div>
              </div>
              {!validation.isValid && (
                <span className="text-red-400 text-xs">⚠️</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleProcessingExpanded(proc.id)}
                className="text-gray-400 hover:text-gray-300 p-1"
                disabled={disabled}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <button
                onClick={() => removeProcessing(proc.id)}
                className="text-red-400 hover:text-red-300 p-1"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Column</label>
                  <select
                    value={proc.column}
                    onChange={(e) => updateProcessing(proc.id, { column: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    disabled={disabled}
                  >
                    <option value="">Select column...</option>
                    {getApplicableColumns(proc.function).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Function</label>
                  <select
                    value={proc.function}
                    onChange={(e) => {
                      const newFunc = e.target.value as ProcessingFunction;
                      const newFuncConfig = PROCESSING_FUNCTIONS[newFunc];
                      const defaultParams: Record<string, any> = {};
                      
                      for (const [paramName, paramConfig] of Object.entries(newFuncConfig.parameters)) {
                        defaultParams[paramName] = paramConfig.default;
                      }

                      updateProcessing(proc.id, { 
                        function: newFunc,
                        parameters: defaultParams,
                        column: getApplicableColumns(newFunc).includes(proc.column) ? proc.column : ''
                      });
                    }}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    disabled={disabled}
                  >
                    {availableProcessingFunctions.map(func => (
                      <option key={func} value={func}>
                        {PROCESSING_FUNCTIONS[func].icon} {PROCESSING_FUNCTIONS[func].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parameters */}
              {Object.keys(funcConfig.parameters).length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-300 mb-3">Parameters</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(funcConfig.parameters).map(([paramName, paramConfig]) => (
                      <div key={paramName}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {paramConfig.label}
                        </label>
                        {renderParameterInput(
                          proc.id,
                          paramName,
                          paramConfig,
                          proc.parameters[paramName]
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!validation.isValid && (
                <div className="bg-red-950/30 border border-red-500 rounded p-3">
                  <div className="text-red-400 text-sm">
                    {validation.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const enabledProcessing = processing.filter(p => p.enabled);
  const validProcessing = enabledProcessing.filter(p => validateProcessing(p).isValid);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Data Processing</h3>
        <div className="text-sm text-gray-400">
          {validProcessing.length}/{enabledProcessing.length} operations active
        </div>
      </div>

      {/* Add New Processing */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={newProcessingFunction}
            onChange={(e) => setNewProcessingFunction(e.target.value as ProcessingFunction)}
            className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
            disabled={disabled}
          >
            <option value="">Select function...</option>
            {availableProcessingFunctions.map(func => (
              <option key={func} value={func}>
                {PROCESSING_FUNCTIONS[func].icon} {PROCESSING_FUNCTIONS[func].label}
              </option>
            ))}
          </select>
          
          <select
            value={newProcessingColumn}
            onChange={(e) => setNewProcessingColumn(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
            disabled={disabled || !newProcessingFunction}
          >
            <option value="">Select column...</option>
            {newProcessingFunction && getApplicableColumns(newProcessingFunction).map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          
          <button
            onClick={addProcessing}
            disabled={!newProcessingFunction || !newProcessingColumn || disabled}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Add Processing
          </button>
        </div>
      </div>

      {/* Existing Processing */}
      {processing.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">⚙️</div>
          <div>No data processing applied</div>
          <div className="text-sm">Add processing steps to transform your data</div>
        </div>
      ) : (
        <div className="space-y-3">
          {processing.map(renderProcessingCard)}
        </div>
      )}

      {/* Processing Summary */}
      {processing.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h5 className="font-medium text-gray-300 mb-3">Processing Summary</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Steps:</span>
              <div className="text-gray-200">{processing.length}</div>
            </div>
            <div>
              <span className="text-gray-400">Active:</span>
              <div className="text-gray-200">{enabledProcessing.length}</div>
            </div>
            <div>
              <span className="text-gray-400">Valid:</span>
              <div className={validProcessing.length === enabledProcessing.length ? 'text-green-400' : 'text-orange-400'}>
                {validProcessing.length}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <div className={validProcessing.length === enabledProcessing.length ? 'text-green-400' : 'text-orange-400'}>
                {validProcessing.length === enabledProcessing.length ? '✓ Ready' : '⚠️ Issues'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}