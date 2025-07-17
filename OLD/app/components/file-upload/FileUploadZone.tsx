// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ File Upload Zone Component                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import {
  validateFile,
  formatFileSize,
  extractFileMetadata,
  SupportedFileType
} from '../../lib/file-parser';

export interface FileUploadZoneProps {
  // File handling
  onFileSelect: (file: File) => void;
  onFileValidated?: (file: File, validation: any) => void;
  onError?: (error: string) => void;
  
  // Constraints
  acceptedTypes?: SupportedFileType[];
  maxFileSize?: number;
  multiple?: boolean;
  
  // UI customization
  className?: string;
  disabled?: boolean;
  
  // Content customization
  title?: string;
  subtitle?: string;
  dragActiveText?: string;
  browseText?: string;
  
  // State
  loading?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  onFileValidated,
  onError,
  acceptedTypes = ['csv', 'xlsx', 'xls'],
  maxFileSize,
  multiple = false,
  className,
  disabled = false,
  title = 'Upload your data file',
  subtitle = 'Drag and drop a file here, or click to browse',
  dragActiveText = 'Drop the file here...',
  browseText = 'Browse files',
  loading = false
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  // Generate accept string for HTML input
  const acceptString = React.useMemo(() => {
    const extensions: Record<SupportedFileType, string[]> = {
      csv: ['.csv'],
      xlsx: ['.xlsx'],
      xls: ['.xls']
    };
    
    return acceptedTypes.flatMap(type => extensions[type]).join(',');
  }, [acceptedTypes]);
  
  const validateAndSelectFile = useCallback((file: File) => {
    const validation = validateFile(file);
    
    // Check file type if restricted
    if (acceptedTypes.length > 0 && validation.fileType && !acceptedTypes.includes(validation.fileType)) {
      const error = `File type '${validation.fileType}' not allowed. Accepted types: ${acceptedTypes.join(', ')}`;
      onError?.(error);
      return;
    }
    
    // Check file size if specified
    if (maxFileSize && file.size > maxFileSize) {
      const error = `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxFileSize)})`;
      onError?.(error);
      return;
    }
    
    // Report validation results
    onFileValidated?.(file, validation);
    
    // If validation passed or only has warnings, proceed
    if (validation.isValid || validation.errors.length === 0) {
      onFileSelect(file);
    } else {
      onError?.(validation.errors.join(', '));
    }
  }, [acceptedTypes, maxFileSize, onFileSelect, onFileValidated, onError]);
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragActive(false);
      }
      return newCounter;
    });
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragActive(false);
    setDragCounter(0);
    
    if (disabled || loading) return;
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    if (!multiple && files.length > 1) {
      onError?.('Only one file is allowed');
      return;
    }
    
    // Process first file (or only file if multiple is false)
    const file = files[0];
    validateAndSelectFile(file);
  }, [disabled, loading, multiple, onError, validateAndSelectFile]);
  
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    const file = files[0];
    validateAndSelectFile(file);
    
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [validateAndSelectFile]);
  
  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    
    // Trigger file input click
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = acceptString;
    fileInput.multiple = multiple;
    fileInput.onchange = handleFileInputChange;
    fileInput.click();
  }, [disabled, loading, acceptString, multiple, handleFileInputChange]);
  
  return (
    <div
      className={clsx(
        'relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer',
        'flex flex-col items-center justify-center p-6 min-h-[160px]',
        {
          // Default state
          'border-gray-600 hover:border-gray-500 bg-gray-900/20': !isDragActive && !disabled && !loading,
          
          // Drag active state
          'border-blue-400 bg-blue-400/10': isDragActive && !disabled && !loading,
          
          // Disabled state
          'border-gray-700 bg-gray-800/50 cursor-not-allowed opacity-60': disabled,
          
          // Loading state
          'border-gray-600 bg-gray-900/20 cursor-wait': loading
        },
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="text-gray-300 font-medium">Processing file...</span>
          </div>
        </div>
      )}
      
      {/* Upload icon */}
      <div className={clsx(
        'mb-3 transition-colors duration-200 flex justify-center',
        {
          'text-gray-400': !isDragActive && !disabled,
          'text-blue-400': isDragActive && !disabled,
          'text-gray-600': disabled
        }
      )}>
        <svg
          className="w-4 h-4 flex-shrink-0"
          width="12"
          height="12"
          style={{ 
            width: '12px !important', 
            height: '12px !important', 
            maxWidth: '12px !important', 
            maxHeight: '12px !important', 
            minWidth: '12px !important', 
            minHeight: '12px !important',
            fontSize: '12px !important'
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      
      {/* Text content */}
      <div className="text-center space-y-1">
        <h3 className={clsx(
          'text-base font-semibold transition-colors duration-200',
          {
            'text-gray-200': !isDragActive && !disabled,
            'text-blue-300': isDragActive && !disabled,
            'text-gray-500': disabled
          }
        )}>
          {isDragActive ? dragActiveText : title}
        </h3>
        
        {!isDragActive && (
          <>
            <p className={clsx(
              'text-sm transition-colors duration-200',
              {
                'text-gray-400': !disabled,
                'text-gray-600': disabled
              }
            )}>
              {subtitle}
            </p>
            
            <button
              type="button"
              disabled={disabled || loading}
              className={clsx(
                'inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md transition-colors duration-200',
                {
                  'text-blue-400 hover:text-blue-300 border-blue-400/30 hover:border-blue-300/50': !disabled && !loading,
                  'text-gray-600 border-gray-600/30 cursor-not-allowed': disabled || loading
                }
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {browseText}
            </button>
          </>
        )}
      </div>
      
      {/* Accepted file types */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Accepted formats: {acceptedTypes.map(type => type.toUpperCase()).join(', ')}
        {maxFileSize && (
          <span className="block mt-1">
            Maximum size: {formatFileSize(maxFileSize)}
          </span>
        )}
      </div>
    </div>
  );
};

export default FileUploadZone;