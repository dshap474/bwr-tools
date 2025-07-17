// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Data Validation Summary Component                                                  │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React from 'react';
import { clsx } from 'clsx';
import {
  ParsedFileResult,
  FileMetadata,
  ColumnInfo,
  formatFileSize
} from '../../lib/file-parser';

export interface DataValidationSummaryProps {
  result: ParsedFileResult;
  onProceed?: () => void;
  onRetry?: () => void;
  className?: string;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  column?: string;
}

export const DataValidationSummary: React.FC<DataValidationSummaryProps> = ({
  result,
  onProceed,
  onRetry,
  className
}) => {
  const { success, data, metadata, errors, warnings } = result;
  
  // Generate validation issues
  const issues: ValidationIssue[] = [];
  
  // Add errors
  errors.forEach(error => {
    issues.push({
      type: 'error',
      message: error
    });
  });
  
  // Add warnings
  warnings.forEach(warning => {
    issues.push({
      type: 'warning',
      message: warning
    });
  });
  
  // Add data quality issues
  if (data && metadata.columns) {
    metadata.columns.forEach(column => {
      // High null percentage
      const nullPercentage = (column.nullCount / metadata.finalRowCount) * 100;
      if (nullPercentage > 50) {
        issues.push({
          type: 'warning',
          message: `High percentage of null values (${nullPercentage.toFixed(1)}%)`,
          column: column.name
        });
      }
      
      // Low type inference confidence
      if (column.confidence < 0.7) {
        issues.push({
          type: 'warning',
          message: `Uncertain data type detection (${(column.confidence * 100).toFixed(0)}% confidence)`,
          details: `Detected as ${column.inferredType}`,
          column: column.name
        });
      }
      
      // Single unique value (possibly constant column)
      if (column.uniqueCount === 1) {
        issues.push({
          type: 'info',
          message: 'Column contains only one unique value',
          details: 'This might be a constant column',
          column: column.name
        });
      }
    });
  }
  
  // Performance warnings
  if (metadata.finalRowCount > 50000) {
    issues.push({
      type: 'info',
      message: `Large dataset (${metadata.finalRowCount.toLocaleString()} rows)`,
      details: 'Chart rendering may take longer than usual'
    });
  }
  
  const getIssueIcon = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  const getIssueColors = (type: ValidationIssue['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-500/30 bg-red-900/20';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-900/20';
      case 'info':
        return 'border-blue-500/30 bg-blue-900/20';
    }
  };
  
  const renderDataOverview = () => (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-200">Data Overview</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{metadata.finalRowCount.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Rows</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{metadata.columnCount}</div>
          <div className="text-sm text-gray-400">Columns</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{formatFileSize(metadata.fileSize)}</div>
          <div className="text-sm text-gray-400">File Size</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">{Math.round(metadata.processingTime)}ms</div>
          <div className="text-sm text-gray-400">Parse Time</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">File Type:</span>
          <span className="text-gray-200 font-medium">{metadata.fileType.toUpperCase()}</span>
        </div>
        
        {metadata.originalRowCount !== metadata.finalRowCount && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Original Rows:</span>
            <span className="text-gray-200 font-medium">{metadata.originalRowCount.toLocaleString()}</span>
          </div>
        )}
        
        {metadata.parseOptions.sheetName && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Sheet:</span>
            <span className="text-gray-200 font-medium">{metadata.parseOptions.sheetName}</span>
          </div>
        )}
        
        {metadata.parseOptions.delimiter && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Delimiter:</span>
            <span className="text-gray-200 font-medium font-mono">
              {metadata.parseOptions.delimiter === '\t' ? '\\t (tab)' : `"${metadata.parseOptions.delimiter}"`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderColumnSummary = () => {
    if (!metadata.columns || metadata.columns.length === 0) return null;
    
    const typeGroups = metadata.columns.reduce((acc, col) => {
      const type = col.inferredType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(col);
      return acc;
    }, {} as Record<string, ColumnInfo[]>);
    
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Column Types</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(typeGroups).map(([type, columns]) => (
            <div key={type} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-200 capitalize">{type}</div>
                <div className="text-xs text-gray-400">
                  {columns.map(c => c.name).join(', ')}
                </div>
              </div>
              <div className="text-lg font-bold text-blue-400">{columns.length}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderIssuesList = () => {
    if (issues.length === 0) return null;
    
    const groupedIssues = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<ValidationIssue['type'], ValidationIssue[]>);
    
    return (
      <div className="space-y-4">
        {Object.entries(groupedIssues).map(([type, typeIssues]) => (
          <div key={type} className={clsx('border rounded-lg p-4', getIssueColors(type as ValidationIssue['type']))}>
            <div className="flex items-center space-x-2 mb-3">
              {getIssueIcon(type as ValidationIssue['type'])}
              <h4 className="font-medium text-gray-200 capitalize">
                {type}s ({typeIssues.length})
              </h4>
            </div>
            
            <div className="space-y-2">
              {typeIssues.map((issue, index) => (
                <div key={index} className="text-sm">
                  <div className="text-gray-200">
                    {issue.column && (
                      <span className="font-medium text-blue-400">{issue.column}: </span>
                    )}
                    {issue.message}
                  </div>
                  {issue.details && (
                    <div className="text-gray-400 text-xs mt-1">{issue.details}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const canProceed = success || (errors.length === 0 && warnings.length > 0);
  
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Status indicator */}
      <div className={clsx(
        'flex items-center space-x-3 p-4 rounded-lg border',
        success ? 'border-green-500/30 bg-green-900/20' : 'border-red-500/30 bg-red-900/20'
      )}>
        {success ? (
          <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        <div>
          <div className={clsx('font-medium', success ? 'text-green-300' : 'text-red-300')}>
            {success ? 'File parsed successfully' : 'File parsing failed'}
          </div>
          <div className="text-sm text-gray-400">
            {success ? `${metadata.finalRowCount.toLocaleString()} rows, ${metadata.columnCount} columns` : 'Please review the issues below'}
          </div>
        </div>
      </div>
      
      {/* Data overview */}
      {success && renderDataOverview()}
      
      {/* Column summary */}
      {success && renderColumnSummary()}
      
      {/* Issues list */}
      {issues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-200">
            Validation Issues ({issues.length})
          </h3>
          {renderIssuesList()}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {!success && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Try Again
          </button>
        )}
        
        {canProceed && onProceed && (
          <button
            onClick={onProceed}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {warnings.length > 0 ? 'Proceed with Warnings' : 'Continue to Chart Creation'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DataValidationSummary;