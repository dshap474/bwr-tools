// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Filter Controls Component                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo } from 'react';
import {
  FilterControlsProps,
  FilterConfig,
  FilterOperator,
  FilterValidation
} from './types';

export interface DateFilterConfig {
  mode: 'lookback' | 'dateWindow' | 'none';
  lookbackDays?: number;
  startDate?: string;
  endDate?: string;
}

export interface EnhancedFilterControlsProps extends FilterControlsProps {
  dateColumn?: string;
  isDateColumn?: boolean;
  dateFilter?: DateFilterConfig;
  onDateFilterChange?: (config: DateFilterConfig) => void;
  showDateFilterOptions?: boolean;
}

const FILTER_OPERATORS: Record<FilterOperator, { label: string; valueType: 'single' | 'multiple' | 'none'; dataTypes: string[] }> = {
  equals: { label: 'Equals', valueType: 'single', dataTypes: ['string', 'number', 'date'] },
  not_equals: { label: 'Not Equals', valueType: 'single', dataTypes: ['string', 'number', 'date'] },
  greater_than: { label: 'Greater Than', valueType: 'single', dataTypes: ['number', 'date'] },
  less_than: { label: 'Less Than', valueType: 'single', dataTypes: ['number', 'date'] },
  contains: { label: 'Contains', valueType: 'single', dataTypes: ['string'] },
  not_contains: { label: 'Does Not Contain', valueType: 'single', dataTypes: ['string'] },
  in: { label: 'In List', valueType: 'multiple', dataTypes: ['string', 'number'] },
  not_in: { label: 'Not In List', valueType: 'multiple', dataTypes: ['string', 'number'] },
  is_null: { label: 'Is Empty', valueType: 'none', dataTypes: ['string', 'number', 'date'] },
  is_not_null: { label: 'Is Not Empty', valueType: 'none', dataTypes: ['string', 'number', 'date'] }
};

export function FilterControls({
  columns,
  filters,
  onFiltersChange,
  sampleData,
  disabled = false,
  className = '',
  dateColumn,
  isDateColumn = false,
  dateFilter = { mode: 'none' },
  onDateFilterChange,
  showDateFilterOptions = false
}: EnhancedFilterControlsProps) {
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [newFilterColumn, setNewFilterColumn] = useState('');

  // Helper functions for date filtering
  const calculateLookbackDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const validateDateRange = (startDate?: string, endDate?: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        errors.push('Start date must be before end date');
      }
      
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 3650) { // 10 years
        errors.push('Date range cannot exceed 10 years');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const getDateFilterSummary = (): string => {
    if (!isDateColumn || dateFilter.mode === 'none') {
      return 'No date filtering';
    }
    
    if (dateFilter.mode === 'lookback') {
      return `Last ${dateFilter.lookbackDays || 30} days`;
    }
    
    if (dateFilter.mode === 'dateWindow') {
      const start = dateFilter.startDate || 'Not set';
      const end = dateFilter.endDate || 'Not set';
      return `${start} to ${end}`;
    }
    
    return 'Invalid date filter';
  };

  // Analyze column data types and unique values
  const columnAnalysis = useMemo(() => {
    if (!sampleData) return {};

    const analysis: Record<string, { type: string; uniqueValues: any[]; sampleValues: any[] }> = {};

    for (const column of columns) {
      const values = sampleData[column] || [];
      const nonNullValues = values.filter(v => v != null);
      
      let type = 'string';
      if (nonNullValues.length > 0) {
        const firstValue = nonNullValues[0];
        if (typeof firstValue === 'number') {
          type = 'number';
        } else if (firstValue instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(firstValue))) {
          type = 'date';
        }
      }

      const uniqueValues = Array.from(new Set(nonNullValues))
        .sort()
        .slice(0, 50); // Limit to first 50 unique values

      analysis[column] = {
        type,
        uniqueValues,
        sampleValues: nonNullValues.slice(0, 10)
      };
    }

    return analysis;
  }, [columns, sampleData]);

  // Generate filter validation
  const validateFilter = (filter: FilterConfig): FilterValidation => {
    const errors: string[] = [];
    let affectedRows = 0;

    if (!filter.column) {
      errors.push('Column is required');
    }

    if (!filter.operator) {
      errors.push('Operator is required');
    }

    const operatorConfig = FILTER_OPERATORS[filter.operator];
    if (operatorConfig?.valueType === 'single' && (filter.value == null || filter.value === '')) {
      errors.push('Value is required');
    }

    if (operatorConfig?.valueType === 'multiple' && (!Array.isArray(filter.value) || filter.value.length === 0)) {
      errors.push('At least one value is required');
    }

    // Estimate affected rows (simplified)
    if (sampleData && filter.column && sampleData[filter.column]) {
      const columnValues = sampleData[filter.column];
      affectedRows = Math.round(columnValues.length * 0.8); // Rough estimate
    }

    return {
      isValid: errors.length === 0,
      errors,
      affectedRows
    };
  };

  const addFilter = () => {
    if (!newFilterColumn) return;

    const newFilter: FilterConfig = {
      id: `filter-${Date.now()}`,
      column: newFilterColumn,
      operator: 'equals',
      value: '',
      enabled: true
    };

    onFiltersChange([...filters, newFilter]);
    setNewFilterColumn('');
    setExpandedFilters(prev => new Set([...prev, newFilter.id]));
  };

  const updateFilter = (filterId: string, updates: Partial<FilterConfig>) => {
    const newFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    onFiltersChange(newFilters);
  };

  const removeFilter = (filterId: string) => {
    const newFilters = filters.filter(filter => filter.id !== filterId);
    onFiltersChange(newFilters);
    setExpandedFilters(prev => {
      const next = new Set(prev);
      next.delete(filterId);
      return next;
    });
  };

  const toggleFilterExpanded = (filterId: string) => {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        next.add(filterId);
      }
      return next;
    });
  };

  const getAvailableOperators = (column: string): FilterOperator[] => {
    const columnType = columnAnalysis[column]?.type || 'string';
    return Object.entries(FILTER_OPERATORS)
      .filter(([, config]) => config.dataTypes.includes(columnType))
      .map(([operator]) => operator as FilterOperator);
  };

  const renderValueInput = (filter: FilterConfig) => {
    const operatorConfig = FILTER_OPERATORS[filter.operator];
    const columnInfo = columnAnalysis[filter.column];

    if (operatorConfig.valueType === 'none') {
      return null;
    }

    if (operatorConfig.valueType === 'multiple') {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Values (comma-separated)</label>
          <textarea
            value={Array.isArray(filter.value) ? filter.value.join(', ') : ''}
            onChange={(e) => {
              const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
              updateFilter(filter.id, { value: values });
            }}
            placeholder="value1, value2, value3..."
            className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
            rows={3}
            disabled={disabled}
          />
          {columnInfo?.uniqueValues.length > 0 && (
            <div className="text-xs text-gray-400">
              Suggestions: {columnInfo.uniqueValues.slice(0, 10).join(', ')}
              {columnInfo.uniqueValues.length > 10 && '...'}
            </div>
          )}
        </div>
      );
    }

    // Single value input
    if (columnInfo?.type === 'number') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
          <input
            type="number"
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, { value: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
            disabled={disabled}
          />
        </div>
      );
    }

    if (columnInfo?.type === 'date') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
          <input
            type="date"
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
            disabled={disabled}
          />
        </div>
      );
    }

    // String input with suggestions
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
        <input
          type="text"
          value={filter.value || ''}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
          placeholder="Enter value..."
          disabled={disabled}
        />
        {columnInfo?.uniqueValues.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">Common values:</div>
            <div className="flex flex-wrap gap-1">
              {columnInfo.uniqueValues.slice(0, 8).map((value, index) => (
                <button
                  key={index}
                  onClick={() => updateFilter(filter.id, { value: String(value) })}
                  className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded hover:bg-gray-500 transition-colors"
                  disabled={disabled}
                >
                  {String(value)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFilterCard = (filter: FilterConfig) => {
    const validation = validateFilter(filter);
    const isExpanded = expandedFilters.has(filter.id);

    return (
      <div key={filter.id} className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={(e) => updateFilter(filter.id, { enabled: e.target.checked })}
                className="rounded border-gray-600 text-blue-500"
                disabled={disabled}
              />
              <span className="text-sm text-gray-300">
                {filter.column} {FILTER_OPERATORS[filter.operator]?.label} {
                  filter.operator !== 'is_null' && filter.operator !== 'is_not_null'
                    ? Array.isArray(filter.value) 
                      ? `[${filter.value.length} values]`
                      : String(filter.value)
                    : ''
                }
              </span>
              {!validation.isValid && (
                <span className="text-red-400 text-xs">⚠️</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                ~{validation.affectedRows} rows
              </span>
              <button
                onClick={() => toggleFilterExpanded(filter.id)}
                className="text-gray-400 hover:text-gray-300 p-1"
                disabled={disabled}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <button
                onClick={() => removeFilter(filter.id)}
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
                    value={filter.column}
                    onChange={(e) => updateFilter(filter.id, { 
                      column: e.target.value,
                      operator: 'equals',
                      value: ''
                    })}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    disabled={disabled}
                  >
                    <option value="">Select column...</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Operator</label>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { 
                      operator: e.target.value as FilterOperator,
                      value: FILTER_OPERATORS[e.target.value as FilterOperator].valueType === 'multiple' ? [] : ''
                    })}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    disabled={disabled || !filter.column}
                  >
                    {getAvailableOperators(filter.column).map(op => (
                      <option key={op} value={op}>
                        {FILTER_OPERATORS[op].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {renderValueInput(filter)}

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

  const enabledFilters = filters.filter(f => f.enabled);
  const validFilters = enabledFilters.filter(f => validateFilter(f).isValid);

  const renderDateFilterControls = () => {
    if (!showDateFilterOptions || !isDateColumn || !dateColumn) {
      return null;
    }

    const dateValidation = validateDateRange(dateFilter.startDate, dateFilter.endDate);

    return (
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-blue-300">📅 Date Filtering</h4>
          <div className="text-xs text-blue-400">
            Column: {dateColumn}
          </div>
        </div>

        {/* Filter Mode Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Filter Mode</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="dateFilterMode"
                  value="none"
                  checked={dateFilter.mode === 'none'}
                  onChange={() => onDateFilterChange?.({ mode: 'none' })}
                  className="text-blue-500"
                  disabled={disabled}
                />
                <span className="text-sm text-gray-300">No Date Filtering</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="dateFilterMode"
                  value="lookback"
                  checked={dateFilter.mode === 'lookback'}
                  onChange={() => onDateFilterChange?.({ 
                    mode: 'lookback', 
                    lookbackDays: dateFilter.lookbackDays || 30 
                  })}
                  className="text-blue-500"
                  disabled={disabled}
                />
                <span className="text-sm text-gray-300">Lookback Period</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="dateFilterMode"
                  value="dateWindow"
                  checked={dateFilter.mode === 'dateWindow'}
                  onChange={() => onDateFilterChange?.({ 
                    mode: 'dateWindow',
                    startDate: dateFilter.startDate || calculateLookbackDate(365),
                    endDate: dateFilter.endDate || calculateLookbackDate(0)
                  })}
                  className="text-blue-500"
                  disabled={disabled}
                />
                <span className="text-sm text-gray-300">Date Window</span>
              </label>
            </div>
          </div>

          {/* Lookback Period Controls */}
          {dateFilter.mode === 'lookback' && (
            <div className="bg-gray-800 rounded p-3 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lookback Period (Days)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="365"
                  value={dateFilter.lookbackDays || 30}
                  onChange={(e) => onDateFilterChange?.({
                    ...dateFilter,
                    lookbackDays: parseInt(e.target.value)
                  })}
                  className="flex-1"
                  disabled={disabled}
                />
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={dateFilter.lookbackDays || 30}
                  onChange={(e) => onDateFilterChange?.({
                    ...dateFilter,
                    lookbackDays: parseInt(e.target.value) || 30
                  })}
                  className="w-20 bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded p-2"
                  disabled={disabled}
                />
                <span className="text-sm text-gray-400">days</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                From: {calculateLookbackDate(dateFilter.lookbackDays || 30)} to Today
              </div>
            </div>
          )}

          {/* Date Window Controls */}
          {dateFilter.mode === 'dateWindow' && (
            <div className="bg-gray-800 rounded p-3 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter.startDate || ''}
                    onChange={(e) => onDateFilterChange?.({
                      ...dateFilter,
                      startDate: e.target.value
                    })}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter.endDate || ''}
                    onChange={(e) => onDateFilterChange?.({
                      ...dateFilter,
                      endDate: e.target.value
                    })}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    disabled={disabled}
                  />
                </div>
              </div>

              {!dateValidation.isValid && (
                <div className="mt-3 bg-red-950/30 border border-red-500 rounded p-2">
                  <div className="text-red-400 text-sm">
                    {dateValidation.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Presets for Lookback */}
          {dateFilter.mode === 'lookback' && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400">Quick presets:</span>
              {[7, 30, 90, 180, 365].map(days => (
                <button
                  key={days}
                  onClick={() => onDateFilterChange?.({ ...dateFilter, lookbackDays: days })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    dateFilter.lookbackDays === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={disabled}
                >
                  {days}d
                </button>
              ))}
            </div>
          )}

          {/* Date Filter Summary */}
          <div className="bg-gray-800 rounded p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Current filter:</div>
            <div className="text-sm text-blue-300 font-medium">
              {getDateFilterSummary()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Data Filters</h3>
        <div className="text-sm text-gray-400">
          {showDateFilterOptions && dateFilter.mode !== 'none' && '📅 '}
          {validFilters.length}/{enabledFilters.length} filters active
        </div>
      </div>

      {/* Date Filter Controls */}
      {renderDateFilterControls()}

      {/* Add New Filter */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-3">
          <select
            value={newFilterColumn}
            onChange={(e) => setNewFilterColumn(e.target.value)}
            className="flex-1 bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
            disabled={disabled}
          >
            <option value="">Select column to filter...</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          <button
            onClick={addFilter}
            disabled={!newFilterColumn || disabled}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Add Filter
          </button>
        </div>
      </div>

      {/* Existing Filters */}
      {filters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">🔍</div>
          <div>No filters applied</div>
          <div className="text-sm">Add filters to refine your data</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filters.map(renderFilterCard)}
        </div>
      )}

      {/* Filter Summary */}
      {filters.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h5 className="font-medium text-gray-300 mb-3">Filter Summary</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Filters:</span>
              <div className="text-gray-200">{filters.length}</div>
            </div>
            <div>
              <span className="text-gray-400">Active:</span>
              <div className="text-gray-200">{enabledFilters.length}</div>
            </div>
            <div>
              <span className="text-gray-400">Valid:</span>
              <div className={validFilters.length === enabledFilters.length ? 'text-green-400' : 'text-orange-400'}>
                {validFilters.length}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <div className={validFilters.length === enabledFilters.length ? 'text-green-400' : 'text-orange-400'}>
                {validFilters.length === enabledFilters.length ? '✓ Ready' : '⚠️ Issues'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export enhanced version with additional props as the main export
export { FilterControls as EnhancedFilterControls };

// Backward-compatible wrapper that only uses basic props
export function BasicFilterControls(props: FilterControlsProps) {
  return FilterControls({ ...props, showDateFilterOptions: false });
}