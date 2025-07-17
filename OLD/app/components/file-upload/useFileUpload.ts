// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ File Upload Hook                                                                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import { useState, useCallback } from 'react';
import {
  parseFileWithProgress,
  ParsedFileResult,
  FileParseOptions,
  SupportedFileType
} from '../../lib/file-parser';

export interface ProgressStep {
  phase: string;
  percent: number;
  message: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface UseFileUploadOptions {
  // Parse options
  parseOptions?: FileParseOptions;
  
  // Validation
  acceptedTypes?: SupportedFileType[];
  maxFileSize?: number;
  
  // Callbacks
  onSuccess?: (result: ParsedFileResult) => void;
  onError?: (error: string) => void;
  onProgress?: (step: ProgressStep) => void;
}

export interface UseFileUploadState {
  // Status
  isUploading: boolean;
  isComplete: boolean;
  hasError: boolean;
  
  // Data
  file: File | null;
  result: ParsedFileResult | null;
  error: string | null;
  
  // Progress
  currentStep: ProgressStep | null;
  allSteps: ProgressStep[];
  
  // Actions
  uploadFile: (file: File) => Promise<void>;
  reset: () => void;
  retry: () => Promise<void>;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadState {
  const {
    parseOptions = {},
    acceptedTypes = ['csv', 'xlsx', 'xls'],
    maxFileSize,
    onSuccess,
    onError,
    onProgress
  } = options;
  
  const [state, setState] = useState<{
    isUploading: boolean;
    isComplete: boolean;
    hasError: boolean;
    file: File | null;
    result: ParsedFileResult | null;
    error: string | null;
    currentStep: ProgressStep | null;
    allSteps: ProgressStep[];
  }>({
    isUploading: false,
    isComplete: false,
    hasError: false,
    file: null,
    result: null,
    error: null,
    currentStep: null,
    allSteps: []
  });
  
  const updateProgress = useCallback((progress: { phase: string; percent: number; message: string }) => {
    const step: ProgressStep = {
      ...progress,
      status: progress.percent === 100 
        ? 'completed' 
        : progress.phase === 'error' 
          ? 'error' 
          : 'active'
    };
    
    setState(prev => {
      // Update or add the current step
      const existingStepIndex = prev.allSteps.findIndex(s => s.phase === step.phase);
      let newSteps = [...prev.allSteps];
      
      if (existingStepIndex >= 0) {
        newSteps[existingStepIndex] = step;
      } else {
        // Mark previous step as completed if new step is starting
        if (prev.currentStep && prev.currentStep.status === 'active') {
          const prevIndex = newSteps.findIndex(s => s.phase === prev.currentStep!.phase);
          if (prevIndex >= 0) {
            newSteps[prevIndex] = { ...prev.currentStep, status: 'completed', percent: 100 };
          }
        }
        newSteps.push(step);
      }
      
      return {
        ...prev,
        currentStep: step,
        allSteps: newSteps,
        hasError: step.status === 'error'
      };
    });
    
    onProgress?.(step);
  }, [onProgress]);
  
  const uploadFile = useCallback(async (file: File) => {
    try {
      // Reset state
      setState(prev => ({
        ...prev,
        isUploading: true,
        isComplete: false,
        hasError: false,
        file,
        result: null,
        error: null,
        currentStep: null,
        allSteps: []
      }));
      
      // Validate file constraints
      if (acceptedTypes.length > 0) {
        const extension = file.name.toLowerCase().split('.').pop();
        const fileType = extension === 'csv' ? 'csv' : extension === 'xlsx' ? 'xlsx' : extension === 'xls' ? 'xls' : null;
        
        if (!fileType || !acceptedTypes.includes(fileType)) {
          throw new Error(`File type not allowed. Accepted types: ${acceptedTypes.join(', ')}`);
        }
      }
      
      if (maxFileSize && file.size > maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size`);
      }
      
      // Parse file with progress tracking
      const result = await parseFileWithProgress(file, parseOptions, updateProgress);
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        isComplete: true,
        result
      }));
      
      if (result.success) {
        onSuccess?.(result);
      } else {
        const error = result.errors.join(', ');
        setState(prev => ({ ...prev, hasError: true, error }));
        onError?.(error);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File upload failed';
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        hasError: true,
        error: errorMessage
      }));
      
      updateProgress({
        phase: 'error',
        percent: 0,
        message: errorMessage
      });
      
      onError?.(errorMessage);
    }
  }, [acceptedTypes, maxFileSize, parseOptions, updateProgress, onSuccess, onError]);
  
  const reset = useCallback(() => {
    setState({
      isUploading: false,
      isComplete: false,
      hasError: false,
      file: null,
      result: null,
      error: null,
      currentStep: null,
      allSteps: []
    });
  }, []);
  
  const retry = useCallback(async () => {
    if (state.file) {
      await uploadFile(state.file);
    }
  }, [state.file, uploadFile]);
  
  return {
    ...state,
    uploadFile,
    reset,
    retry
  };
}