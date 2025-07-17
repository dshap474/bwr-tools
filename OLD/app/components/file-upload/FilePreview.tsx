// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ File Preview Component                                                              │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  previewFile,
  getFileInfo,
  formatFileSize,
  SupportedFileType,
  FilePreview as FilePreviewData,
  ColumnStats
} from '../../lib/file-parser';

export interface FilePreviewProps {
  file: File;
  onError?: (error: string) => void;
  onPreviewReady?: (preview: FilePreviewData & { fileType: SupportedFileType }) => void;
  maxRows?: number;
  maxColumns?: number;
  showStats?: boolean;
  className?: string;
}

interface PreviewState {
  loading: boolean;
  data: (FilePreviewData & { fileType: SupportedFileType }) | null;
  error: string | null;
  sheets?: Array<{ name: string; index: number; rowCount?: number; columnCount?: number }>;
  selectedSheet?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onError,
  onPreviewReady,
  maxRows = 10,
  maxColumns = 20,
  showStats = true,
  className
}) => {
  const [state, setState] = useState<PreviewState>({
    loading: true,
    data: null,
    error: null
  });
  
  // Load preview data
  useEffect(() => {
    let mounted = true;
    
    const loadPreview = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Get file info first
        const fileInfo = await getFileInfo(file);
        
        if (!mounted) return;
        
        if (!fileInfo.validation.isValid) {
          const error = fileInfo.validation.errors.join(', ');
          setState(prev => ({ ...prev, loading: false, error }));
          onError?.(error);
          return;
        }
        
        // Store sheets info if available
        const sheets = fileInfo.sheets;
        
        // Generate preview
        const preview = await previewFile(file, {
          maxRows,
          maxColumns,
          sheetIndex: 0 // Default to first sheet
        });
        
        if (!mounted) return;
        
        setState(prev => ({
          ...prev,
          loading: false,
          data: preview,
          sheets,
          selectedSheet: sheets?.[0]?.name
        }));
        
        onPreviewReady?.(preview);
        
      } catch (error) {
        if (!mounted) return;
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to preview file';
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        onError?.(errorMessage);
      }
    };
    
    loadPreview();
    
    return () => {
      mounted = false;
    };
  }, [file, maxRows, maxColumns, onError, onPreviewReady]);
  
  // Handle sheet selection for Excel files
  const handleSheetChange = async (sheetName: string) => {
    if (!state.sheets) return;
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const sheetIndex = state.sheets.findIndex(s => s.name === sheetName);
      const preview = await previewFile(file, {
        maxRows,
        maxColumns,
        sheetName
      });
      
      setState(prev => ({
        ...prev,
        loading: false,
        data: preview,
        selectedSheet: sheetName
      }));
      
      onPreviewReady?.(preview);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sheet';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  };
  
  const renderFileInfo = () => (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-200">File Information</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Name:</span>
          <div className="text-gray-200 font-medium truncate">{file.name}</div>
        </div>
        <div>
          <span className="text-gray-400">Size:</span>
          <div className="text-gray-200 font-medium">{formatFileSize(file.size)}</div>
        </div>
        <div>
          <span className="text-gray-400">Type:</span>
          <div className="text-gray-200 font-medium">{state.data?.fileType.toUpperCase()}</div>
        </div>
        <div>
          <span className="text-gray-400">Columns:</span>
          <div className="text-gray-200 font-medium">{state.data?.headers.length || 0}</div>
        </div>
      </div>
      
      {/* Sheet selector for Excel files */}
      {state.sheets && state.sheets.length > 1 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Sheet:
          </label>
          <select
            value={state.selectedSheet || ''}
            onChange={(e) => handleSheetChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            {state.sheets.map((sheet) => (
              <option key={sheet.index} value={sheet.name}>
                {sheet.name} {sheet.rowCount ? `(${sheet.rowCount} rows)` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
  
  const renderDataTable = () => {
    if (!state.data) return null;
    
    const { headers, rows } = state.data;
    
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200">Data Preview</h3>
          <p className="text-sm text-gray-400">
            Showing first {Math.min(rows.length, maxRows)} rows of {headers.length} columns
          </p>
        </div>
        
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-700 sticky top-0">
              <tr>
                {headers.slice(0, maxColumns).map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left text-gray-200 font-medium border-r border-gray-600 last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
                {headers.length > maxColumns && (
                  <th className="px-4 py-2 text-left text-gray-400 font-medium">
                    ... +{headers.length - maxColumns} more
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, maxRows).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={clsx(
                    'border-b border-gray-700 last:border-b-0',
                    rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                  )}
                >
                  {row.slice(0, maxColumns).map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 text-gray-300 border-r border-gray-600 last:border-r-0 max-w-[200px] truncate"
                      title={String(cell || '')}
                    >
                      {cell === null || cell === undefined ? (
                        <span className="text-gray-500 italic">null</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                  {row.length > maxColumns && (
                    <td className="px-4 py-2 text-gray-500">
                      ... +{row.length - maxColumns} more
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const renderMetadata = () => {
    if (!state.data?.metadata) return null;
    
    const metadata = state.data.metadata;
    
    return (
      <div className="bg-gray-800 rounded-lg p-4 mt-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-200">Parsing Details</h3>
        <div className="space-y-2 text-sm">
          {metadata.detectedDelimiter && (
            <div>
              <span className="text-gray-400">Detected delimiter:</span>
              <span className="text-gray-200 ml-2 font-mono">
                {metadata.detectedDelimiter === '\t' ? '\\t (tab)' : `"${metadata.detectedDelimiter}"`}
              </span>
            </div>
          )}
          
          {metadata.sheetName && (
            <div>
              <span className="text-gray-400">Active sheet:</span>
              <span className="text-gray-200 ml-2">{metadata.sheetName}</span>
            </div>
          )}
          
          {metadata.availableSheets && metadata.availableSheets.length > 1 && (
            <div>
              <span className="text-gray-400">Available sheets:</span>
              <span className="text-gray-200 ml-2">{metadata.availableSheets.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (state.loading) {
    return (
      <div className={clsx('flex items-center justify-center p-8 bg-gray-800 rounded-lg', className)}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="text-gray-300">Loading preview...</span>
        </div>
      </div>
    );
  }
  
  if (state.error) {
    return (
      <div className={clsx('p-4 bg-red-900/20 border border-red-500/30 rounded-lg', className)}>
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-300">Preview Error</h3>
            <p className="mt-1 text-sm text-red-200">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!state.data) {
    return null;
  }
  
  return (
    <div className={clsx('space-y-4', className)}>
      {renderFileInfo()}
      {renderDataTable()}
      {renderMetadata()}
    </div>
  );
};

export default FilePreview;