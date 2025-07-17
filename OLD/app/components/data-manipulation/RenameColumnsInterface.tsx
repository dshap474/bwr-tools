// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Rename Columns Interface Component                                                  │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';

export interface RenameColumnsInterfaceProps {
  /** Available columns to rename */
  columns: string[];
  /** Current rename mapping */
  currentNames: Record<string, string>;
  /** Callback when individual rename changes */
  onRenameChange: (oldName: string, newName: string) => void;
  /** Callback for bulk rename operations */
  onBulkRename: (mapping: Record<string, string>) => void;
  /** Whether the interface is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ValidationError {
  column: string;
  error: string;
}

export const RenameColumnsInterface: React.FC<RenameColumnsInterfaceProps> = ({
  columns,
  currentNames,
  onRenameChange,
  onBulkRename,
  disabled = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [bulkPattern, setBulkPattern] = useState('');
  const [bulkReplacement, setBulkReplacement] = useState('');

  // Filter columns based on search term
  const filteredColumns = useMemo(() => {
    if (!searchTerm.trim()) return columns;
    const term = searchTerm.toLowerCase();
    return columns.filter(col => 
      col.toLowerCase().includes(term) ||
      (currentNames[col] && currentNames[col].toLowerCase().includes(term))
    );
  }, [columns, searchTerm, currentNames]);

  // Validate column names
  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    const allNewNames = Object.values(currentNames).filter(name => name.trim());
    const nameCount = new Map<string, string[]>();

    // Check for duplicates
    Object.entries(currentNames).forEach(([oldName, newName]) => {
      if (!newName.trim()) return;
      
      const trimmedName = newName.trim();
      if (!nameCount.has(trimmedName)) {
        nameCount.set(trimmedName, []);
      }
      nameCount.get(trimmedName)!.push(oldName);
    });

    nameCount.forEach((originalNames, newName) => {
      if (originalNames.length > 1) {
        originalNames.forEach(oldName => {
          errors.push({
            column: oldName,
            error: `Duplicate name "${newName}" (also used by: ${originalNames.filter(n => n !== oldName).join(', ')})`
          });
        });
      }
    });

    // Check for invalid characters or format
    Object.entries(currentNames).forEach(([oldName, newName]) => {
      if (!newName.trim()) return;
      
      const trimmedName = newName.trim();
      
      // Check for invalid characters (basic validation)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
        errors.push({
          column: oldName,
          error: 'Column names must start with a letter or underscore and contain only letters, numbers, and underscores'
        });
      }

      // Check for reserved names (extend as needed)
      const reservedNames = ['index', 'columns', 'dtypes', 'shape', 'size'];
      if (reservedNames.includes(trimmedName.toLowerCase())) {
        errors.push({
          column: oldName,
          error: `"${trimmedName}" is a reserved name`
        });
      }
    });

    return errors;
  }, [currentNames]);

  // Handle starting edit mode
  const handleStartEdit = (column: string) => {
    if (disabled) return;
    setEditingColumn(column);
    setTempName(currentNames[column] || column);
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingColumn(null);
    setTempName('');
  };

  // Handle confirming edit
  const handleConfirmEdit = () => {
    if (!editingColumn) return;
    
    const newName = tempName.trim();
    onRenameChange(editingColumn, newName);
    setEditingColumn(null);
    setTempName('');
  };

  // Handle key press in edit mode
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Handle bulk rename
  const handleBulkRename = () => {
    if (!bulkPattern.trim()) return;

    const newMapping: Record<string, string> = {};
    filteredColumns.forEach(column => {
      try {
        const regex = new RegExp(bulkPattern, 'g');
        const newName = column.replace(regex, bulkReplacement);
        if (newName !== column) {
          newMapping[column] = newName;
        }
      } catch (error) {
        // Invalid regex, skip
      }
    });

    if (Object.keys(newMapping).length > 0) {
      onBulkRename(newMapping);
      setShowBulkRename(false);
      setBulkPattern('');
      setBulkReplacement('');
    }
  };

  // Handle clearing all renames
  const handleClearAll = () => {
    const emptyMapping: Record<string, string> = {};
    columns.forEach(col => {
      emptyMapping[col] = '';
    });
    onBulkRename(emptyMapping);
  };

  const hasRenames = Object.values(currentNames).some(name => name.trim());
  const hasErrors = validationErrors.length > 0;

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header with search and bulk actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-200">Rename Columns</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBulkRename(!showBulkRename)}
              disabled={disabled}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Bulk Rename
            </button>
            {hasRenames && (
              <button
                onClick={handleClearAll}
                disabled={disabled}
                className="text-sm text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            )}
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

        {/* Bulk rename interface */}
        {showBulkRename && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-medium text-gray-200 mb-3">Bulk Rename (Regex)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pattern (regex)</label>
                <input
                  type="text"
                  placeholder="e.g., ^old_"
                  value={bulkPattern}
                  onChange={(e) => setBulkPattern(e.target.value)}
                  disabled={disabled}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded focus:ring-blue-500 focus:border-blue-500 p-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Replacement</label>
                <input
                  type="text"
                  placeholder="e.g., new_"
                  value={bulkReplacement}
                  onChange={(e) => setBulkReplacement(e.target.value)}
                  disabled={disabled}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded focus:ring-blue-500 focus:border-blue-500 p-2"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleBulkRename}
                  disabled={disabled || !bulkPattern.trim()}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation errors summary */}
      {hasErrors && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-300 mb-2">Validation Errors:</h4>
          <ul className="text-sm text-red-200 space-y-1">
            {validationErrors.slice(0, 5).map((error, index) => (
              <li key={index}>
                <span className="font-medium">{error.column}:</span> {error.error}
              </li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-red-300">... and {validationErrors.length - 5} more errors</li>
            )}
          </ul>
        </div>
      )}

      {/* Column list */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
        {filteredColumns.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm ? `No columns match "${searchTerm}"` : 'No columns available'}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredColumns.map((column) => {
              const currentNewName = currentNames[column] || '';
              const hasRename = currentNewName.trim() && currentNewName !== column;
              const isEditing = editingColumn === column;
              const columnErrors = validationErrors.filter(e => e.column === column);
              const hasError = columnErrors.length > 0;
              
              return (
                <div
                  key={column}
                  className={clsx(
                    'p-3 transition-colors',
                    {
                      'bg-blue-900/20': hasRename && !hasError,
                      'bg-red-900/20': hasError,
                      'border-l-4 border-blue-500': hasRename && !hasError,
                      'border-l-4 border-red-500': hasError
                    }
                  )}
                >
                  <div className="flex items-center space-x-3">
                    {/* Original column name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-200 truncate">
                        {column}
                      </div>
                      {hasRename && !hasError && (
                        <div className="text-xs text-blue-400 mt-0.5">
                          Will be renamed to: {currentNewName}
                        </div>
                      )}
                    </div>

                    {/* Arrow indicator */}
                    {(hasRename || isEditing) && (
                      <div className="flex-shrink-0 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    )}

                    {/* New name input or display */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={disabled}
                            autoFocus
                            className="flex-1 bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="New column name"
                          />
                          <button
                            onClick={handleConfirmEdit}
                            disabled={disabled || !tempName.trim()}
                            className="p-1 text-green-400 hover:text-green-300 disabled:text-gray-500"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={disabled}
                            className="p-1 text-red-400 hover:text-red-300 disabled:text-gray-500"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {hasRename ? (
                              <div className={clsx(
                                'font-medium truncate',
                                hasError ? 'text-red-300' : 'text-blue-300'
                              )}>
                                {currentNewName}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm italic">
                                No rename
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartEdit(column)}
                            disabled={disabled}
                            className="ml-2 p-1 text-gray-400 hover:text-gray-300 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column-specific errors */}
                  {columnErrors.length > 0 && (
                    <div className="mt-2 text-xs text-red-300">
                      {columnErrors.map((error, index) => (
                        <div key={index}>{error.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename summary */}
      {hasRenames && !hasErrors && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-200 mb-2">
            Planned Renames ({Object.values(currentNames).filter(name => name.trim()).length}):
          </h4>
          <div className="space-y-1 text-sm">
            {Object.entries(currentNames)
              .filter(([, newName]) => newName.trim())
              .map(([oldName, newName]) => (
                <div key={oldName} className="flex items-center text-gray-300">
                  <span className="text-gray-400">{oldName}</span>
                  <svg className="w-3 h-3 mx-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="text-blue-300">{newName}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RenameColumnsInterface;