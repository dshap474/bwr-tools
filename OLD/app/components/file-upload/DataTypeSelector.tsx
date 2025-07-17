// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Data Type Selector Component                                                       │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  DataType,
  ColumnInfo,
  inferDataType,
  detectUnixTimestamps,
  formatFileSize
} from '../../lib/file-parser';

export interface DataTypeSelectorProps {
  columns: ColumnInfo[];
  sampleData: Record<string, any[]>;
  onColumnTypeChange?: (columnName: string, newType: DataType) => void;
  onTimestampFormatChange?: (columnName: string, format: 'seconds' | 'milliseconds') => void;
  className?: string;
}

const DATA_TYPE_OPTIONS: Array<{ value: DataType; label: string; description: string }> = [
  { value: 'string', label: 'Text', description: 'String/text data' },
  { value: 'integer', label: 'Integer', description: 'Whole numbers' },
  { value: 'float', label: 'Number', description: 'Decimal numbers' },
  { value: 'date', label: 'Date', description: 'Date values' },
  { value: 'datetime', label: 'DateTime', description: 'Date and time values' },
  { value: 'boolean', label: 'Boolean', description: 'True/false values' },
  { value: 'currency', label: 'Currency', description: 'Monetary values' },
  { value: 'percentage', label: 'Percentage', description: 'Percentage values' },
];

export const DataTypeSelector: React.FC<DataTypeSelectorProps> = ({
  columns,
  sampleData,
  onColumnTypeChange,
  onTimestampFormatChange,
  className
}) => {
  const [columnTypes, setColumnTypes] = useState<Record<string, DataType>>({});
  const [timestampFormats, setTimestampFormats] = useState<Record<string, 'seconds' | 'milliseconds'>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Initialize column types from props
  useEffect(() => {
    const types: Record<string, DataType> = {};
    const formats: Record<string, 'seconds' | 'milliseconds'> = {};
    
    for (const column of columns) {
      types[column.name] = column.inferredType;
      
      // Check for timestamp formats
      if (column.inferredType === 'integer' || column.inferredType === 'float') {
        const values = sampleData[column.name]?.filter(v => typeof v === 'number') || [];
        if (values.length > 0) {
          const timestampCheck = detectUnixTimestamps(values);
          if (timestampCheck.isTimestamp) {
            formats[column.name] = timestampCheck.format!;
          }
        }
      }
    }
    
    setColumnTypes(types);
    setTimestampFormats(formats);
  }, [columns, sampleData]);
  
  const handleTypeChange = (columnName: string, newType: DataType) => {
    setColumnTypes(prev => ({
      ...prev,
      [columnName]: newType
    }));
    onColumnTypeChange?.(columnName, newType);
  };
  
  const handleTimestampFormatChange = (columnName: string, format: 'seconds' | 'milliseconds') => {
    setTimestampFormats(prev => ({
      ...prev,
      [columnName]: format
    }));
    onTimestampFormatChange?.(columnName, format);
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };
  
  const renderTimestampOptions = (column: ColumnInfo) => {
    const values = sampleData[column.name]?.filter(v => typeof v === 'number') || [];
    if (values.length === 0) return null;
    
    const timestampCheck = detectUnixTimestamps(values);
    if (!timestampCheck.isTimestamp) return null;
    
    return (
      <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <div className="text-sm font-medium text-blue-400 mb-2">
          Unix Timestamp Detected
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id={`${column.name}-seconds`}
              name={`${column.name}-timestamp`}
              value="seconds"
              checked={timestampFormats[column.name] === 'seconds'}
              onChange={() => handleTimestampFormatChange(column.name, 'seconds')}
              className="text-blue-500"
            />
            <label htmlFor={`${column.name}-seconds`} className="text-sm text-gray-300">
              Seconds (10 digits) - Example: {timestampCheck.examples[0]}
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id={`${column.name}-milliseconds`}
              name={`${column.name}-timestamp`}
              value="milliseconds"
              checked={timestampFormats[column.name] === 'milliseconds'}
              onChange={() => handleTimestampFormatChange(column.name, 'milliseconds')}
              className="text-blue-500"
            />
            <label htmlFor={`${column.name}-milliseconds`} className="text-sm text-gray-300">
              Milliseconds (13 digits)
            </label>
          </div>
        </div>
      </div>
    );
  };
  
  const renderColumnRow = (column: ColumnInfo, index: number) => {
    const currentType = columnTypes[column.name] || column.inferredType;
    const values = sampleData[column.name] || [];
    
    return (
      <div
        key={column.name}
        className={clsx(
          'grid grid-cols-12 gap-4 p-4 border-b border-gray-700 last:border-b-0',
          index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
        )}
      >
        {/* Column name */}
        <div className="col-span-3">
          <div className="font-medium text-gray-200">{column.name}</div>
          <div className="text-xs text-gray-400">
            {column.originalName !== column.name && `(${column.originalName})`}
          </div>
        </div>
        
        {/* Sample values */}
        <div className="col-span-3">
          <div className="space-y-1">
            {column.sampleValues.slice(0, 3).map((value, i) => (
              <div key={i} className="text-xs text-gray-300 truncate">
                {value === null ? (
                  <span className="text-gray-500 italic">null</span>
                ) : (
                  String(value)
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Inferred type and confidence */}
        <div className="col-span-2">
          <div className="text-sm text-gray-300">
            {DATA_TYPE_OPTIONS.find(opt => opt.value === column.inferredType)?.label || column.inferredType}
          </div>
          <div className={clsx('text-xs', getConfidenceColor(column.confidence))}>
            {getConfidenceText(column.confidence)} ({Math.round(column.confidence * 100)}%)
          </div>
        </div>
        
        {/* Type selector */}
        <div className="col-span-3">
          <select
            value={currentType}
            onChange={(e) => handleTypeChange(column.name, e.target.value as DataType)}
            className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
          >
            {DATA_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Data quality */}
        <div className="col-span-1">
          <div className="text-xs text-gray-400">
            <div>Null: {column.nullCount}</div>
            <div>Unique: {column.uniqueCount}</div>
          </div>
        </div>
        
        {/* Timestamp options (if applicable) */}
        {showAdvanced && renderTimestampOptions(column)}
      </div>
    );
  };
  
  const summary = {
    totalColumns: columns.length,
    highConfidence: columns.filter(c => c.confidence >= 0.9).length,
    mediumConfidence: columns.filter(c => c.confidence >= 0.7 && c.confidence < 0.9).length,
    lowConfidence: columns.filter(c => c.confidence < 0.7).length,
    detectedTimestamps: Object.keys(timestampFormats).length
  };
  
  return (
    <div className={clsx('space-y-4', className)}>
      {/* Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Data Type Detection Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Columns:</span>
            <div className="text-gray-200 font-medium">{summary.totalColumns}</div>
          </div>
          <div>
            <span className="text-green-400">High Confidence:</span>
            <div className="text-gray-200 font-medium">{summary.highConfidence}</div>
          </div>
          <div>
            <span className="text-yellow-400">Medium Confidence:</span>
            <div className="text-gray-200 font-medium">{summary.mediumConfidence}</div>
          </div>
          <div>
            <span className="text-red-400">Low Confidence:</span>
            <div className="text-gray-200 font-medium">{summary.lowConfidence}</div>
          </div>
        </div>
        
        {summary.detectedTimestamps > 0 && (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="text-sm text-blue-400">
              {summary.detectedTimestamps} column{summary.detectedTimestamps > 1 ? 's' : ''} detected as Unix timestamp{summary.detectedTimestamps > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
      
      {/* Advanced options toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-200">Column Data Types</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>
      
      {/* Column list */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-700 border-b border-gray-600 text-sm font-medium text-gray-300">
          <div className="col-span-3">Column Name</div>
          <div className="col-span-3">Sample Values</div>
          <div className="col-span-2">Detected Type</div>
          <div className="col-span-3">Assign Type</div>
          <div className="col-span-1">Quality</div>
        </div>
        
        {/* Column rows */}
        <div className="max-h-96 overflow-y-auto">
          {columns.map((column, index) => renderColumnRow(column, index))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            // Reset to inferred types
            const resetTypes: Record<string, DataType> = {};
            for (const column of columns) {
              resetTypes[column.name] = column.inferredType;
            }
            setColumnTypes(resetTypes);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
        >
          Reset to Detected
        </button>
        <button
          onClick={() => {
            // Apply all changes
            for (const [columnName, type] of Object.entries(columnTypes)) {
              onColumnTypeChange?.(columnName, type);
            }
            for (const [columnName, format] of Object.entries(timestampFormats)) {
              onTimestampFormatChange?.(columnName, format);
            }
          }}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
};

export default DataTypeSelector;