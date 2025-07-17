// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ File Upload Progress Component                                                      │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ProgressStep {
  phase: string;
  percent: number;
  message: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface FileUploadProgressProps {
  // Progress data
  currentStep?: ProgressStep;
  steps?: ProgressStep[];
  
  // File info
  fileName?: string;
  fileSize?: string;
  
  // UI customization
  className?: string;
  showSteps?: boolean;
  showFileInfo?: boolean;
  
  // Actions
  onCancel?: () => void;
  onRetry?: () => void;
  canCancel?: boolean;
  canRetry?: boolean;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  currentStep,
  steps = [],
  fileName,
  fileSize,
  className,
  showSteps = true,
  showFileInfo = true,
  onCancel,
  onRetry,
  canCancel = true,
  canRetry = false
}) => {
  const isError = currentStep?.status === 'error';
  const isComplete = currentStep?.status === 'completed' && currentStep.percent === 100;
  
  const renderProgressBar = () => {
    const percent = currentStep?.percent || 0;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-200">
            {currentStep?.message || 'Processing...'}
          </span>
          <span className="text-sm text-gray-400">
            {Math.round(percent)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={clsx(
              'h-2 rounded-full transition-all duration-300 ease-out',
              {
                'bg-blue-500': !isError && !isComplete,
                'bg-green-500': isComplete,
                'bg-red-500': isError
              }
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };
  
  const renderStepList = () => {
    if (!showSteps || steps.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Progress Steps</h4>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={clsx(
                'flex items-center space-x-3 text-sm',
                {
                  'text-gray-400': step.status === 'pending',
                  'text-blue-400': step.status === 'active',
                  'text-green-400': step.status === 'completed',
                  'text-red-400': step.status === 'error'
                }
              )}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                )}
                {step.status === 'active' && (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                )}
                {step.status === 'completed' && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                {step.status === 'error' && (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Step info */}
              <div className="flex-1">
                <div className="font-medium">{step.phase}</div>
                <div className="text-xs opacity-75">{step.message}</div>
              </div>
              
              {/* Progress percentage for active step */}
              {step.status === 'active' && (
                <div className="text-xs font-medium">
                  {Math.round(step.percent)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderFileInfo = () => {
    if (!showFileInfo || (!fileName && !fileSize)) return null;
    
    return (
      <div className="flex items-center space-x-3 text-sm text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
        <span className="flex-1 truncate">{fileName}</span>
        {fileSize && <span>{fileSize}</span>}
      </div>
    );
  };
  
  const renderActions = () => {
    if (isError && canRetry) {
      return (
        <div className="flex justify-end space-x-3">
          {canCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    
    if (!isComplete && !isError && canCancel) {
      return (
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className={clsx('bg-gray-800 rounded-lg p-6 space-y-4', className)}>
      {/* File info */}
      {renderFileInfo()}
      
      {/* Progress bar */}
      {renderProgressBar()}
      
      {/* Step list */}
      {renderStepList()}
      
      {/* Success message */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-green-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">File processed successfully!</span>
        </div>
      )}
      
      {/* Error message */}
      {isError && (
        <div className="flex items-start space-x-2 text-red-400">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <div className="font-medium">Processing failed</div>
            <div className="text-sm opacity-75">{currentStep?.message}</div>
          </div>
        </div>
      )}
      
      {/* Actions */}
      {renderActions()}
    </div>
  );
};

export default FileUploadProgress;