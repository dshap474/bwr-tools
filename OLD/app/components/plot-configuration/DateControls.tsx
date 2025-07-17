// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Date Controls Component                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { detectDates, detectUnixTimestamps } from '../../lib/file-parser';

export interface DateControlsProps {
  columns: string[];
  selectedColumn?: string;
  isDate: boolean;
  onColumnChange: (column: string) => void;
  onDateChange: (isDate: boolean) => void;
  onFormatDetected?: (format: string, confidence: number) => void;
  sampleData?: Record<string, any[]>;
  disabled?: boolean;
  className?: string;
}

export interface DateDetectionInfo {
  isDetected: boolean;
  format: string;
  confidence: number;
  examples: string[];
  warnings: string[];
}

export function DateControls({
  columns,
  selectedColumn,
  isDate,
  onColumnChange,
  onDateChange,
  onFormatDetected,
  sampleData,
  disabled = false,
  className = ''
}: DateControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customFormat, setCustomFormat] = useState('');

  // Detect date information for the selected column
  const dateDetection = useMemo((): DateDetectionInfo => {
    if (!selectedColumn || !sampleData?.[selectedColumn]) {
      return {
        isDetected: false,
        format: '',
        confidence: 0,
        examples: [],
        warnings: []
      };
    }

    const values = sampleData[selectedColumn]
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => String(v));

    if (values.length === 0) {
      return {
        isDetected: false,
        format: '',
        confidence: 0,
        examples: [],
        warnings: ['No valid values found']
      };
    }

    // Check for standard date patterns
    const dateResult = detectDates(values);
    
    // Check for Unix timestamps
    const timestampResult = detectUnixTimestamps(sampleData[selectedColumn]);

    const warnings: string[] = [];
    let bestResult = dateResult;

    // Prefer timestamp detection if confidence is higher
    if (timestampResult.isTimestamp && timestampResult.confidence > dateResult.confidence) {
      bestResult = {
        isDate: true,
        format: `Unix ${timestampResult.format}`,
        confidence: timestampResult.confidence,
        examples: timestampResult.examples.map(String)
      };
    }

    // Add warnings for ambiguous cases
    if (bestResult.confidence < 0.8 && bestResult.confidence > 0.3) {
      warnings.push('Date detection is uncertain. Please verify manually.');
    }

    if (dateResult.confidence > 0.3 && timestampResult.confidence > 0.3) {
      warnings.push('Multiple date formats detected. Choose the correct one.');
    }

    return {
      isDetected: bestResult.isDate,
      format: bestResult.format,
      confidence: bestResult.confidence,
      examples: bestResult.examples,
      warnings
    };
  }, [selectedColumn, sampleData]);

  // Auto-trigger format detection callback
  useEffect(() => {
    if (dateDetection.isDetected && onFormatDetected) {
      onFormatDetected(dateDetection.format, dateDetection.confidence);
    }
  }, [dateDetection, onFormatDetected]);

  // Auto-suggest date detection
  useEffect(() => {
    if (selectedColumn && dateDetection.isDetected && dateDetection.confidence > 0.8 && !isDate) {
      // Don't auto-enable, but we could show a suggestion
    }
  }, [selectedColumn, dateDetection, isDate]);

  const renderConfidenceIndicator = (confidence: number) => {
    let color = 'text-red-400';
    let label = 'Low';
    
    if (confidence >= 0.9) {
      color = 'text-green-400';
      label = 'High';
    } else if (confidence >= 0.7) {
      color = 'text-yellow-400';
      label = 'Medium';
    }

    return (
      <span className={`text-xs ${color}`}>
        {label} ({(confidence * 100).toFixed(0)}%)
      </span>
    );
  };

  const renderDateExamples = () => {
    if (dateDetection.examples.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Sample values:</div>
        <div className="text-xs text-gray-300 font-mono">
          {dateDetection.examples.slice(0, 3).map((example, index) => (
            <div key={index}>{example}</div>
          ))}
        </div>
      </div>
    );
  };

  const getColumnIcon = (columnName: string) => {
    if (!sampleData?.[columnName]) return '📝';
    
    const values = sampleData[columnName].filter(v => v !== null && v !== undefined && v !== '');
    if (values.length === 0) return '❓';

    // Quick type detection for icon
    const sample = String(values[0]);
    if (/^\d{4}-\d{2}-\d{2}/.test(sample)) return '📅';
    if (/^\d+$/.test(sample) && sample.length >= 10) return '⏰'; // Timestamp
    if (/^\d+(\.\d+)?$/.test(sample)) return '🔢';
    return '📝';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-300">Date Configuration</h4>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-400 hover:text-gray-300"
          disabled={disabled}
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </button>
      </div>

      {/* Column Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Index/X-Axis Column
        </label>
        <select
          value={selectedColumn || ''}
          onChange={(e) => onColumnChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
          disabled={disabled}
        >
          <option value="">Select column...</option>
          {columns.map(col => (
            <option key={col} value={col}>
              {getColumnIcon(col)} {col}
            </option>
          ))}
        </select>
      </div>

      {/* Date Detection */}
      {selectedColumn && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isDate}
                onChange={(e) => onDateChange(e.target.checked)}
                className="rounded border-gray-600 text-blue-500"
                disabled={disabled}
              />
              <span className="text-sm font-medium text-gray-300">
                Is Date Column?
              </span>
            </label>

            {dateDetection.isDetected && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Auto-detected:</span>
                {renderConfidenceIndicator(dateDetection.confidence)}
              </div>
            )}
          </div>

          {/* Date Detection Results */}
          {dateDetection.isDetected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Detected Format:</span>
                <span className="text-green-400 font-mono">{dateDetection.format}</span>
              </div>

              {dateDetection.warnings.length > 0 && (
                <div className="bg-yellow-950/30 border border-yellow-500/30 rounded p-2">
                  <div className="text-xs font-medium text-yellow-400 mb-1">Warnings:</div>
                  {dateDetection.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-yellow-300">
                      ⚠️ {warning}
                    </div>
                  ))}
                </div>
              )}

              {!isDate && dateDetection.confidence > 0.8 && (
                <div className="bg-blue-950/30 border border-blue-500/30 rounded p-2">
                  <div className="text-xs text-blue-300">
                    💡 This column appears to contain dates. Consider enabling "Is Date Column?"
                  </div>
                </div>
              )}

              {renderDateExamples()}
            </div>
          )}

          {/* Manual Override */}
          {isDate && !dateDetection.isDetected && (
            <div className="bg-orange-950/30 border border-orange-500/30 rounded p-2">
              <div className="text-xs text-orange-300">
                ⚠️ Date format not auto-detected. Manual configuration may be required.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Options */}
      {showAdvanced && isDate && selectedColumn && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h5 className="font-medium text-gray-300 mb-3">Advanced Date Options</h5>
          
          <div className="space-y-4">
            {/* Custom Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Date Format
              </label>
              <input
                type="text"
                value={customFormat}
                onChange={(e) => setCustomFormat(e.target.value)}
                placeholder="e.g., YYYY-MM-DD, MM/DD/YYYY"
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                disabled={disabled}
              />
              <div className="text-xs text-gray-500 mt-1">
                Leave empty to use auto-detected format: {dateDetection.format || 'None detected'}
              </div>
            </div>

            {/* Timezone Handling */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                disabled={disabled}
              >
                <option value="UTC">UTC (Recommended)</option>
                <option value="local">Local Timezone</option>
                <option value="auto">Auto-detect</option>
              </select>
            </div>

            {/* Date Range Validation */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-600 text-blue-500"
                disabled={disabled}
              />
              <label className="text-sm text-gray-300">
                Validate date ranges (1900-2100)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {selectedColumn && sampleData && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDateChange(!isDate)}
            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors"
            disabled={disabled}
          >
            {isDate ? 'Mark as Non-Date' : 'Mark as Date'}
          </button>
          
          {dateDetection.isDetected && !isDate && (
            <button
              onClick={() => onDateChange(true)}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              disabled={disabled}
            >
              Apply Auto-Detection
            </button>
          )}
        </div>
      )}
    </div>
  );
}