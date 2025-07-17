// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Drop Columns Selector Component                                                     │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';

export interface DropColumnsSelectorProps {
  /** Available columns to select from */
  columns: string[];
  /** Currently selected columns to drop */
  selectedColumns: string[];
  /** Callback when selection changes */
  onSelectionChange: (columns: string[]) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Maximum number of columns that can be selected */
  maxSelections?: number;
  /** Additional CSS classes */
  className?: string;
}

export const DropColumnsSelector: React.FC<DropColumnsSelectorProps> = ({
  columns,
  selectedColumns,
  onSelectionChange,
  disabled = false,
  maxSelections,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Filter columns based on search term
  const filteredColumns = useMemo(() => {
    if (!searchTerm.trim()) return columns;
    const term = searchTerm.toLowerCase();
    return columns.filter(col => 
      col.toLowerCase().includes(term)
    );
  }, [columns, searchTerm]);

  // Handle individual column selection
  const handleColumnToggle = (column: string) => {
    if (disabled) return;

    const isSelected = selectedColumns.includes(column);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedColumns.filter(col => col !== column);
    } else {
      if (maxSelections && selectedColumns.length >= maxSelections) {
        return; // Don't allow selection beyond max
      }
      newSelection = [...selectedColumns, column];
    }

    onSelectionChange(newSelection);
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (disabled) return;

    if (selectAll) {
      // Deselect all filtered columns
      const newSelection = selectedColumns.filter(col => !filteredColumns.includes(col));
      onSelectionChange(newSelection);
      setSelectAll(false);
    } else {
      // Select all filtered columns (respecting max limit)
      const columnsToAdd = filteredColumns.filter(col => !selectedColumns.includes(col));
      let newSelection = [...selectedColumns];
      
      if (maxSelections) {
        const remainingSlots = maxSelections - selectedColumns.length;
        newSelection = [...selectedColumns, ...columnsToAdd.slice(0, remainingSlots)];
      } else {
        newSelection = [...selectedColumns, ...columnsToAdd];
      }
      
      onSelectionChange(newSelection);
      setSelectAll(true);
    }
  };

  // Update select all state when selection changes
  React.useEffect(() => {
    const allFilteredSelected = filteredColumns.length > 0 && 
      filteredColumns.every(col => selectedColumns.includes(col));
    setSelectAll(allFilteredSelected);
  }, [filteredColumns, selectedColumns]);

  const isMaxReached = maxSelections && selectedColumns.length >= maxSelections;

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header with search and stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-200">Select Columns to Remove</h3>
          <div className="text-sm text-gray-400">
            {selectedColumns.length} of {columns.length} selected
            {maxSelections && ` (max: ${maxSelections})`}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 pl-10"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Select all toggle */}
        {filteredColumns.length > 0 && (
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAllToggle}
                disabled={disabled || (isMaxReached && !selectAll)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">
                Select all {filteredColumns.length > columns.length ? 'filtered' : ''} columns
              </span>
            </label>

            {selectedColumns.length > 0 && (
              <button
                onClick={() => onSelectionChange([])}
                disabled={disabled}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Column list */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-h-80 overflow-y-auto">
        {filteredColumns.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm ? `No columns match "${searchTerm}"` : 'No columns available'}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredColumns.map((column, index) => {
              const isSelected = selectedColumns.includes(column);
              const canSelect = !isMaxReached || isSelected;
              
              return (
                <label
                  key={column}
                  className={clsx(
                    'flex items-center space-x-3 p-3 cursor-pointer transition-colors',
                    {
                      'hover:bg-gray-750': !disabled && canSelect,
                      'bg-red-900/20': isSelected,
                      'cursor-not-allowed opacity-50': disabled || (!isSelected && !canSelect),
                      'border-l-4 border-red-500': isSelected
                    }
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleColumnToggle(column)}
                    disabled={disabled || (!isSelected && !canSelect)}
                    className="rounded border-gray-600 text-red-500 focus:ring-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-200 truncate">
                      {column}
                    </div>
                    {isSelected && (
                      <div className="text-xs text-red-400 mt-0.5">
                        Will be removed
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L9.586 12l-2.293 2.293a1 1 0 101.414 1.414L11 13.414l2.293 2.293a1 1 0 001.414-1.414L12.414 12l2.293-2.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning message for max selections */}
      {isMaxReached && (
        <div className="flex items-center space-x-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-yellow-300">
            Maximum number of columns selected ({maxSelections}). Deselect columns to choose different ones.
          </div>
        </div>
      )}

      {/* Selection summary */}
      {selectedColumns.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-200 mb-2">
            Columns to be removed ({selectedColumns.length}):
          </h4>
          <div className="flex flex-wrap gap-1">
            {selectedColumns.map(column => (
              <span
                key={column}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-900/30 text-red-300 border border-red-500/30"
              >
                {column}
                <button
                  onClick={() => handleColumnToggle(column)}
                  disabled={disabled}
                  className="ml-1 hover:text-red-100 disabled:cursor-not-allowed"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropColumnsSelector;