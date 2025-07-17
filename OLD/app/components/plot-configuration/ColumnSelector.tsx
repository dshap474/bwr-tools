// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Column Selector Component                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  ColumnSelectorProps,
  ColumnConfig,
  ColumnRole,
  ChartType,
  getChartTypeConfig,
  validateColumnConfiguration,
  isValidColumnAssignment
} from './types';
import { inferDataType, DataType } from '../../lib/file-parser';

const ROLE_COLORS: Record<ColumnRole, string> = {
  x: 'bg-blue-500',
  y: 'bg-green-500',
  color: 'bg-purple-500',
  size: 'bg-orange-500',
  category: 'bg-pink-500',
  group: 'bg-indigo-500'
};

const ROLE_LABELS: Record<ColumnRole, string> = {
  x: 'X-Axis',
  y: 'Y-Axis',
  color: 'Color',
  size: 'Size',
  category: 'Category',
  group: 'Group'
};

const TYPE_ICONS: Record<string, string> = {
  date: '📅',
  integer: '🔢',
  float: '🔣',
  currency: '💰',
  percentage: '📊',
  boolean: '✅',
  string: '📝',
  unknown: '❓'
};

const TYPE_COLORS: Record<string, string> = {
  date: 'text-blue-400',
  integer: 'text-green-400',
  float: 'text-emerald-400',
  currency: 'text-yellow-400',
  percentage: 'text-purple-400',
  boolean: 'text-pink-400',
  string: 'text-gray-400',
  unknown: 'text-gray-500'
};

export function ColumnSelector({
  availableColumns,
  selectedColumns,
  onColumnsChange,
  chartType,
  sampleData,
  maxColumns,
  disabled = false,
  className = ''
}: ColumnSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const chartConfig = getChartTypeConfig(chartType);
  const validation = validateColumnConfiguration(chartType, selectedColumns);

  // Infer column types from sample data
  const columnTypes = useMemo(() => {
    if (!sampleData) return {};
    
    const types: Record<string, { type: string; confidence: number; icon: string; color: string }> = {};
    
    for (const [columnName, values] of Object.entries(sampleData)) {
      const inference = inferDataType(values, columnName);
      types[columnName] = {
        type: inference.type,
        confidence: inference.confidence,
        icon: TYPE_ICONS[inference.type] || TYPE_ICONS.unknown,
        color: TYPE_COLORS[inference.type] || TYPE_COLORS.unknown
      };
    }
    
    return types;
  }, [sampleData]);

  // Smart defaults for column assignment based on types
  const getSmartColumnSuggestions = useMemo(() => {
    if (!sampleData) return {};
    
    const suggestions: Record<string, ColumnRole[]> = {};
    
    for (const columnName of availableColumns) {
      const typeInfo = columnTypes[columnName];
      if (!typeInfo) continue;
      
      const possibleRoles: ColumnRole[] = [];
      
      // Date columns are great for X-axis
      if (typeInfo.type === 'date') {
        possibleRoles.push('x');
      }
      
      // Numeric columns work well for Y-axis
      if (['integer', 'float', 'currency', 'percentage'].includes(typeInfo.type)) {
        possibleRoles.push('y');
        if (typeInfo.type === 'currency') possibleRoles.push('size');
      }
      
      // String columns work for categories and grouping
      if (typeInfo.type === 'string') {
        possibleRoles.push('category', 'group', 'color');
      }
      
      // Boolean columns work for color coding
      if (typeInfo.type === 'boolean') {
        possibleRoles.push('color');
      }
      
      suggestions[columnName] = possibleRoles;
    }
    
    return suggestions;
  }, [availableColumns, columnTypes, sampleData]);

  // Filter available columns based on search
  const filteredAvailableColumns = useMemo(() => {
    const assigned = new Set(selectedColumns.map(c => c.name));
    return availableColumns
      .filter(col => !assigned.has(col))
      .filter(col => col.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [availableColumns, selectedColumns, searchTerm]);

  // Group selected columns by role
  const columnsByRole = useMemo(() => {
    const groups: Record<ColumnRole, ColumnConfig[]> = {
      x: [],
      y: [],
      color: [],
      size: [],
      category: [],
      group: []
    };

    selectedColumns.forEach(col => {
      groups[col.role].push(col);
    });

    return groups;
  }, [selectedColumns]);

  const handleDragEnd = (result: DropResult) => {
    setDraggedColumn(null);

    if (!result.destination) return;

    const { source, destination } = result;
    
    // Handle moving from available columns to role
    if (source.droppableId === 'available' && destination.droppableId.startsWith('role-')) {
      const role = destination.droppableId.replace('role-', '') as ColumnRole;
      const columnName = filteredAvailableColumns[source.index];
      
      // Check if role can accept more columns
      if (!isValidColumnAssignment(chartType, role, columnsByRole[role].length)) {
        return;
      }

      const newColumn: ColumnConfig = {
        name: columnName,
        role,
        displayName: columnName,
        visible: true
      };

      onColumnsChange([...selectedColumns, newColumn]);
      return;
    }

    // Handle moving between roles
    if (source.droppableId.startsWith('role-') && destination.droppableId.startsWith('role-')) {
      const sourceRole = source.droppableId.replace('role-', '') as ColumnRole;
      const destRole = destination.droppableId.replace('role-', '') as ColumnRole;
      
      if (sourceRole === destRole) {
        // Reordering within same role
        const roleColumns = [...columnsByRole[sourceRole]];
        const [removed] = roleColumns.splice(source.index, 1);
        roleColumns.splice(destination.index, 0, removed);

        const newColumns = selectedColumns.map(col => {
          if (col.role === sourceRole) {
            const index = columnsByRole[sourceRole].findIndex(c => c.name === col.name);
            return roleColumns[index] || col;
          }
          return col;
        }).filter(Boolean);

        onColumnsChange(newColumns);
      } else {
        // Moving between different roles
        if (!isValidColumnAssignment(chartType, destRole, columnsByRole[destRole].length)) {
          return;
        }

        const newColumns = selectedColumns.map(col => {
          if (col.name === columnsByRole[sourceRole][source.index]?.name) {
            return { ...col, role: destRole };
          }
          return col;
        });

        onColumnsChange(newColumns);
      }
    }

    // Handle removing from role back to available
    if (source.droppableId.startsWith('role-') && destination.droppableId === 'available') {
      const sourceRole = source.droppableId.replace('role-', '') as ColumnRole;
      const columnToRemove = columnsByRole[sourceRole][source.index];
      
      if (columnToRemove) {
        const newColumns = selectedColumns.filter(col => col.name !== columnToRemove.name);
        onColumnsChange(newColumns);
      }
    }
  };

  const handleDragStart = (result: any) => {
    setDraggedColumn(result.draggableId);
  };

  const removeColumn = (columnName: string) => {
    const newColumns = selectedColumns.filter(col => col.name !== columnName);
    onColumnsChange(newColumns);
  };

  const autoAssignColumns = () => {
    if (!sampleData) return;
    
    const newColumns: ColumnConfig[] = [];
    const requiredRoles = chartConfig.requiredRoles;
    const optionalRoles = chartConfig.optionalRoles;
    const usedColumns = new Set<string>();
    
    // First, assign required roles
    for (const role of requiredRoles) {
      const maxCount = chartConfig.maxColumns[role] || 1;
      let assigned = 0;
      
      for (const columnName of availableColumns) {
        if (usedColumns.has(columnName) || assigned >= maxCount) continue;
        
        const suggestions = getSmartColumnSuggestions[columnName] || [];
        if (suggestions.includes(role)) {
          newColumns.push({
            name: columnName,
            role,
            displayName: columnName,
            visible: true
          });
          usedColumns.add(columnName);
          assigned++;
        }
      }
    }
    
    // Then assign optional roles if we have good matches
    for (const role of optionalRoles) {
      const maxCount = chartConfig.maxColumns[role] || 1;
      let assigned = 0;
      
      for (const columnName of availableColumns) {
        if (usedColumns.has(columnName) || assigned >= maxCount) continue;
        
        const suggestions = getSmartColumnSuggestions[columnName] || [];
        const typeInfo = columnTypes[columnName];
        
        // Only auto-assign if we have high confidence
        if (suggestions.includes(role) && typeInfo?.confidence > 0.8) {
          newColumns.push({
            name: columnName,
            role,
            displayName: columnName,
            visible: true
          });
          usedColumns.add(columnName);
          assigned++;
        }
      }
    }
    
    onColumnsChange(newColumns);
  };

  const toggleColumnVisibility = (columnName: string) => {
    const newColumns = selectedColumns.map(col => 
      col.name === columnName ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(newColumns);
  };

  const updateColumnDisplayName = (columnName: string, displayName: string) => {
    const newColumns = selectedColumns.map(col => 
      col.name === columnName ? { ...col, displayName } : col
    );
    onColumnsChange(newColumns);
  };

  const renderTypeIndicator = (columnName: string) => {
    const typeInfo = columnTypes[columnName];
    if (!typeInfo) return null;
    
    return (
      <div 
        className={`flex items-center space-x-1 text-xs ${typeInfo.color}`}
        title={`${typeInfo.type} (${(typeInfo.confidence * 100).toFixed(0)}% confidence)`}
      >
        <span>{typeInfo.icon}</span>
        <span className="capitalize">{typeInfo.type}</span>
      </div>
    );
  };

  const renderSmartSuggestions = (columnName: string) => {
    const suggestions = getSmartColumnSuggestions[columnName];
    if (!suggestions || suggestions.length === 0) return null;
    
    return (
      <div className="flex items-center space-x-1 mt-1">
        <span className="text-xs text-gray-500">Suggested:</span>
        {suggestions.slice(0, 3).map(role => (
          <span 
            key={role}
            className={`text-xs px-1 py-0.5 rounded ${ROLE_COLORS[role]} text-white opacity-70`}
          >
            {ROLE_LABELS[role]}
          </span>
        ))}
      </div>
    );
  };

  const renderRoleSection = (role: ColumnRole) => {
    const roleColumns = columnsByRole[role];
    const config = maxColumns || chartConfig.maxColumns;
    const maxCount = config[role] || 0;
    const isRequired = chartConfig.requiredRoles.includes(role);
    const canAcceptMore = roleColumns.length < maxCount;

    return (
      <div key={role} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${ROLE_COLORS[role]}`} />
            <h4 className="font-medium text-gray-200">
              {ROLE_LABELS[role]}
              {isRequired && <span className="text-red-400 ml-1">*</span>}
            </h4>
            <span className="text-xs text-gray-500">
              {roleColumns.length}/{maxCount || '∞'}
            </span>
          </div>
          
          {!validation.isValid && validation.errors.some(err => err.includes(role)) && (
            <div className="text-red-400 text-xs">
              ⚠️ Required
            </div>
          )}
        </div>

        <Droppable droppableId={`role-${role}`} isDropDisabled={disabled || !canAcceptMore}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                min-h-[80px] p-3 rounded border-2 border-dashed transition-colors
                ${snapshot.isDraggingOver && canAcceptMore
                  ? 'border-blue-400 bg-blue-950/30'
                  : snapshot.isDraggingOver && !canAcceptMore
                  ? 'border-red-400 bg-red-950/30'
                  : 'border-gray-600'
                }
                ${!canAcceptMore ? 'opacity-50' : ''}
              `}
            >
              {roleColumns.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-6">
                  {isRequired ? 'Required: Drag a column here' : 'Optional: Drag columns here'}
                </div>
              ) : (
                <div className="space-y-2">
                  {roleColumns.map((column, index) => (
                    <Draggable
                      key={column.name}
                      draggableId={`role-${role}-${column.name}`}
                      index={index}
                      isDragDisabled={disabled}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`
                            bg-gray-700 rounded px-3 py-2 flex items-center justify-between
                            transition-all ${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}
                            ${!column.visible ? 'opacity-60' : ''}
                          `}
                        >
                          <div className="flex items-center space-x-2 flex-1">
                            <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[role]}`} />
                            <div className="flex-1">
                              <input
                                type="text"
                                value={column.displayName || column.name}
                                onChange={(e) => updateColumnDisplayName(column.name, e.target.value)}
                                className="bg-transparent text-sm text-gray-200 border-none outline-none w-full"
                                disabled={disabled}
                              />
                              {renderTypeIndicator(column.name)}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleColumnVisibility(column.name)}
                              className="text-gray-400 hover:text-gray-300 p-1"
                              disabled={disabled}
                              title={column.visible ? 'Hide column' : 'Show column'}
                            >
                              {column.visible ? '👁️' : '👁️‍🗨️'}
                            </button>
                            <button
                              onClick={() => removeColumn(column.name)}
                              className="text-red-400 hover:text-red-300 p-1"
                              disabled={disabled}
                              title="Remove column"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-200">Column Assignment</h3>
          {sampleData && availableColumns.length > 0 && (
            <button
              onClick={autoAssignColumns}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={disabled}
              title="Automatically assign columns based on data types"
            >
              🎯 Auto-Assign
            </button>
          )}
        </div>
        {!validation.isValid && (
          <div className="text-red-400 text-sm">
            ⚠️ {validation.errors.length} error(s)
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Columns */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-300">Available Columns</h4>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 pl-10"
                disabled={disabled}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>

            <Droppable droppableId="available" isDropDisabled={disabled}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    bg-gray-800 rounded-lg p-4 border min-h-[200px] max-h-[400px] overflow-y-auto
                    ${snapshot.isDraggingOver ? 'border-green-400 bg-green-950/30' : 'border-gray-700'}
                  `}
                >
                  {filteredAvailableColumns.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                      {searchTerm ? 'No columns match your search' : 'All columns assigned'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAvailableColumns.map((column, index) => (
                        <Draggable
                          key={column}
                          draggableId={`available-${column}`}
                          index={index}
                          isDragDisabled={disabled}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                bg-gray-700 rounded px-3 py-2 text-sm text-gray-200 cursor-move
                                transition-all ${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}
                                hover:bg-gray-600
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-400">⋮⋮</span>
                                  <span>{column}</span>
                                </div>
                                {renderTypeIndicator(column)}
                              </div>
                              {renderSmartSuggestions(column)}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Column Roles */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-300">Chart Configuration</h4>
            
            <div className="space-y-3">
              {/* Required roles first */}
              {chartConfig.requiredRoles.map(renderRoleSection)}
              
              {/* Then optional roles */}
              {chartConfig.optionalRoles.map(renderRoleSection)}
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Validation Messages */}
      {!validation.isValid && (
        <div className="bg-red-950/30 border border-red-500 rounded-lg p-4">
          <h5 className="font-medium text-red-400 mb-2">Configuration Issues:</h5>
          <ul className="text-sm text-red-300 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h5 className="font-medium text-gray-300 mb-3">Configuration Summary</h5>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Chart Type:</span>
            <div className="text-gray-200">{chartConfig.displayName}</div>
          </div>
          <div>
            <span className="text-gray-400">Assigned Columns:</span>
            <div className="text-gray-200">{selectedColumns.length}</div>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <div className={validation.isValid ? 'text-green-400' : 'text-red-400'}>
              {validation.isValid ? '✓ Valid' : '⚠️ Invalid'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}