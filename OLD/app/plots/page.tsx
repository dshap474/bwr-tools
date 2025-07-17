'use client';

import React, { useState } from 'react';
import { DataFrame } from './lib';
import { ParsedFileResult, DataType } from '../lib/file-parser';
import {
  FileUploadZone,
  FilePreview,
  FileUploadProgress,
  DataTypeSelector,
  DataValidationSummary,
  useFileUpload,
  DropColumnsSelector,
  RenameColumnsInterface,
  PivotDataWizard,
  PivotConfig,
  ManipulationOperation
} from '../components';

type WorkflowStep = 'upload' | 'preview' | 'validate' | 'manipulate' | 'configure' | 'generate';

interface PlotConfiguration {
  chartType: 'scatter' | 'bar' | 'multibar' | 'stackedbar' | 'metricsharearea' | 'table';
  xColumn: string;
  yColumns: string[];
  title: string;
  subtitle: string;
}

export default function PlotsPage() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParsedFileResult | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, DataType>>({});
  
  // Data manipulation state
  const [originalData, setOriginalData] = useState<DataFrame | null>(null);
  const [manipulatedData, setManipulatedData] = useState<DataFrame | null>(null);
  const [dropColumns, setDropColumns] = useState<string[]>([]);
  const [renameMapping, setRenameMapping] = useState<Record<string, string>>({});
  const [pivotConfig, setPivotConfig] = useState<PivotConfig | null>(null);
  
  const [plotConfig, setPlotConfig] = useState<PlotConfiguration>({
    chartType: 'scatter',
    xColumn: '',
    yColumns: [],
    title: '',
    subtitle: ''
  });

  const {
    isUploading,
    isComplete,
    hasError,
    result,
    error,
    currentStep: uploadStep,
    uploadFile,
    reset
  } = useFileUpload({
    parseOptions: {
      inferTypes: true,
      skipEmptyLines: true,
      maxRows: 100000 // Reasonable limit for browser processing
    },
    onSuccess: (result) => {
      setParseResult(result);
      if (result.success && result.data) {
        // Create DataFrame from parsed data
        const dataFrame = new DataFrame(result.data.toJSON());
        setOriginalData(dataFrame);
        setManipulatedData(dataFrame);
      }
      setCurrentStep('validate');
    },
    onError: (error) => {
      console.error('File upload error:', error);
    }
  });

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setCurrentStep('preview');
    await uploadFile(file);
  };

  const handleColumnTypeChange = (columnName: string, newType: DataType) => {
    setColumnTypes(prev => ({
      ...prev,
      [columnName]: newType
    }));
  };

  const handleValidationComplete = () => {
    if (parseResult?.data) {
      setCurrentStep('manipulate');
    }
  };

  const handleManipulationComplete = () => {
    if (manipulatedData) {
      // Auto-suggest initial configuration based on manipulated data
      const columns = manipulatedData.columns;
      const numericColumns = columns.filter(col => {
        const series = manipulatedData.getColumn(col);
        return series.dtype === 'float' || series.dtype === 'integer';
      });
      
      const dateColumns = columns.filter(col => {
        const series = manipulatedData.getColumn(col);
        return series.dtype === 'datetime';
      });

      // Suggest X and Y columns
      const suggestedXColumn = dateColumns[0] || columns[0] || '';
      const suggestedYColumns = numericColumns.slice(0, 3); // Max 3 for readability

      setPlotConfig(prev => ({
        ...prev,
        xColumn: suggestedXColumn,
        yColumns: suggestedYColumns,
        title: `Chart from ${selectedFile?.name || 'Data'}`
      }));

      setCurrentStep('configure');
    }
  };

  // Data manipulation handlers
  const applyManipulations = () => {
    if (!originalData) return;

    let result = originalData.copy();

    // Apply drop columns
    if (dropColumns.length > 0) {
      result = result.dropColumns(dropColumns);
    }

    // Apply rename columns
    const activeRenames = Object.fromEntries(
      Object.entries(renameMapping).filter(([, newName]) => newName.trim())
    );
    if (Object.keys(activeRenames).length > 0) {
      result = result.renameColumns(activeRenames);
    }

    // Apply pivot
    if (pivotConfig) {
      result = result.pivot(pivotConfig);
    }

    setManipulatedData(result);
  };

  // Apply manipulations whenever inputs change
  React.useEffect(() => {
    applyManipulations();
  }, [dropColumns, renameMapping, pivotConfig, originalData]);

  const handleRestart = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setParseResult(null);
    setColumnTypes({});
    
    // Reset manipulation state
    setOriginalData(null);
    setManipulatedData(null);
    setDropColumns([]);
    setRenameMapping({});
    setPivotConfig(null);
    
    setPlotConfig({
      chartType: 'scatter',
      xColumn: '',
      yColumns: [],
      title: '',
      subtitle: ''
    });
    reset();
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: 'Upload File', icon: 'upload', description: 'Select your data file' },
      { key: 'preview', label: 'Preview Data', icon: 'eye', description: 'Review file contents' },
      { key: 'validate', label: 'Validate & Types', icon: 'check-circle', description: 'Configure data types' },
      { key: 'manipulate', label: 'Transform Data', icon: 'cog', description: 'Clean and reshape' },
      { key: 'configure', label: 'Configure Chart', icon: 'adjustments', description: 'Design your visualization' },
      { key: 'generate', label: 'Generate Plot', icon: 'chart-bar', description: 'Export publication-ready chart' }
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStep);

    const getStepIcon = (iconName: string, isActive: boolean, isCompleted: boolean) => {
      const className = "w-4 h-4";
      const color = isCompleted ? "text-emerald-400" : isActive ? "text-purple-400" : "text-gray-500";
      
      switch(iconName) {
        case 'upload':
          return (
            <div style={{ width: '16px', height: '16px', overflow: 'hidden' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg"
                width="16" 
                height="16"
                viewBox="0 0 24 24"
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  display: 'block',
                  width: '16px', 
                  height: '16px',
                  maxWidth: '16px',
                  maxHeight: '16px'
                }}
                className={color}
                fill="none" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          );
        case 'eye':
          return (
            <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          );
        case 'check-circle':
          return (
            <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'cog':
          return (
            <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          );
        case 'adjustments':
          return (
            <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
            </svg>
          );
        case 'chart-bar':
          return (
            <svg className={`${className} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          );
        default:
          return null;
      }
    };

    return (
      <div className="mb-12">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const isAccessible = index <= currentIndex;

            return (
              <div
                key={step.key}
                className={`
                  relative p-4 rounded-2xl transition-all duration-300 border
                  ${isActive 
                    ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10' 
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-gray-800/50 border-gray-700 opacity-60'
                  }
                `}
              >
                <div className="text-center">
                  {/* Icon */}
                  <div className={`
                    w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all
                    ${isActive 
                      ? 'bg-purple-500/20 ring-2 ring-purple-500/30' 
                      : isCompleted
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-500/30'
                      : 'bg-gray-700'
                    }
                  `}>
                    {isCompleted ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      getStepIcon(step.icon, isActive, isCompleted)
                    )}
                  </div>

                  {/* Step number */}
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    Step {index + 1}
                  </div>

                  {/* Label */}
                  <div className={`
                    text-sm font-medium mb-1 transition-colors
                    ${isActive 
                      ? 'text-purple-300' 
                      : isCompleted
                      ? 'text-emerald-300'
                      : 'text-gray-400'
                    }
                  `}>
                    {step.label}
                  </div>

                  {/* Description */}
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {step.description}
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full ring-2 ring-purple-500/30 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>{Math.round(((currentIndex + 1) / steps.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-600 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Upload Your Data</h2>
        <p className="text-gray-400 mb-8">
          Start by uploading a CSV or Excel file to create publication-ready charts with BWR visual standards
        </p>
      </div>

      <FileUploadZone
        onFileSelect={handleFileSelect}
        acceptedTypes={['csv', 'xlsx', 'xls']}
        maxFileSize={50 * 1024 * 1024} // 50MB
        title="Drop your data file here"
        subtitle="Supports CSV, XLS, and XLSX files up to 50MB"
      />

      {/* Sample data suggestions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Need sample data?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-600 rounded-lg">
            <h4 className="font-medium mb-2">Time Series Data</h4>
            <p className="text-sm text-gray-400 mb-3">
              Perfect for scatter plots and line charts
            </p>
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              Download Sample CSV →
            </button>
          </div>
          <div className="p-4 border border-gray-600 rounded-lg">
            <h4 className="font-medium mb-2">Category Data</h4>
            <p className="text-sm text-gray-400 mb-3">
              Great for bar charts and comparisons
            </p>
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              Download Sample CSV →
            </button>
          </div>
          <div className="p-4 border border-gray-600 rounded-lg">
            <h4 className="font-medium mb-2">Multi-Series Data</h4>
            <p className="text-sm text-gray-400 mb-3">
              Ideal for stacked and grouped charts
            </p>
            <button className="text-blue-400 hover:text-blue-300 text-sm">
              Download Sample CSV →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Processing File</h2>
        <button
          onClick={handleRestart}
          className="text-gray-400 hover:text-gray-300 text-sm"
        >
          Start Over
        </button>
      </div>

      {/* Upload progress */}
      {(isUploading || uploadStep) && (
        <FileUploadProgress
          currentStep={uploadStep || undefined}
          fileName={selectedFile?.name}
          fileSize={selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : undefined}
          canCancel={true}
          onCancel={handleRestart}
        />
      )}

      {/* File preview (once processed) */}
      {selectedFile && !isUploading && (
        <FilePreview
          file={selectedFile}
          maxRows={10}
          maxColumns={15}
          onError={(error) => console.error('Preview error:', error)}
        />
      )}
    </div>
  );

  const renderValidateStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Validation Results</h2>
        <button
          onClick={handleRestart}
          className="text-gray-400 hover:text-gray-300 text-sm"
        >
          Start Over
        </button>
      </div>

      {parseResult && (
        <>
          {/* Validation summary */}
          <DataValidationSummary
            result={parseResult}
            onProceed={handleValidationComplete}
            onRetry={() => {
              if (selectedFile) {
                uploadFile(selectedFile);
              }
            }}
          />

          {/* Data type configuration */}
          {parseResult.success && parseResult.data && (
            <DataTypeSelector
              columns={parseResult.metadata.columns}
              sampleData={parseResult.data.head(100).toJSON()}
              onColumnTypeChange={handleColumnTypeChange}
              onTimestampFormatChange={(column, format) => {
                console.log(`Timestamp format for ${column}: ${format}`);
              }}
            />
          )}
        </>
      )}
    </div>
  );

  const renderManipulateStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transform Data</h2>
        <div className="space-x-3">
          <button
            onClick={() => setCurrentStep('validate')}
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            ← Back to Validation
          </button>
          <button
            onClick={handleRestart}
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            Start Over
          </button>
        </div>
      </div>

      {originalData && (
        <div className="space-y-8">
          {/* Data overview */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-gray-200">Data Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{originalData.shape[0]}</div>
                <div className="text-gray-400">Rows</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{originalData.shape[1]}</div>
                <div className="text-gray-400">Original Columns</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{manipulatedData?.shape[1] || 0}</div>
                <div className="text-gray-400">Current Columns</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">{manipulatedData?.shape[0] || 0}</div>
                <div className="text-gray-400">Current Rows</div>
              </div>
            </div>
          </div>

          {/* Drop Columns */}
          <DropColumnsSelector
            columns={originalData.columns}
            selectedColumns={dropColumns}
            onSelectionChange={setDropColumns}
          />

          {/* Rename Columns */}
          <RenameColumnsInterface
            columns={manipulatedData?.columns || originalData.columns}
            currentNames={renameMapping}
            onRenameChange={(oldName, newName) => {
              setRenameMapping(prev => ({
                ...prev,
                [oldName]: newName
              }));
            }}
            onBulkRename={setRenameMapping}
          />

          {/* Pivot Data */}
          <PivotDataWizard
            columns={manipulatedData?.columns || originalData.columns}
            config={pivotConfig}
            onConfigChange={setPivotConfig}
            sampleData={manipulatedData?.head(100).toJSON() || originalData.head(100).toJSON()}
          />

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {dropColumns.length > 0 && `${dropColumns.length} columns to drop • `}
              {Object.values(renameMapping).filter(name => name.trim()).length > 0 && 
                `${Object.values(renameMapping).filter(name => name.trim()).length} columns to rename • `}
              {pivotConfig && 'Pivot operation configured'}
            </div>
            
            <button
              onClick={handleManipulationComplete}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Chart Configuration →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configure Chart</h2>
        <button
          onClick={handleRestart}
          className="text-gray-400 hover:text-gray-300 text-sm"
        >
          Start Over
        </button>
      </div>

      {manipulatedData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Chart Configuration</h3>
            
            <div className="space-y-4">
              {/* Chart type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chart Type
                </label>
                <select
                  value={plotConfig.chartType}
                  onChange={(e) => setPlotConfig(prev => ({ 
                    ...prev, 
                    chartType: e.target.value as any 
                  }))}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                >
                  <option value="scatter">Scatter Plot</option>
                  <option value="bar">Bar Chart</option>
                  <option value="multibar">Multi-Bar Chart</option>
                  <option value="stackedbar">Stacked Bar Chart</option>
                  <option value="metricsharearea">Area Chart</option>
                  <option value="table">Data Table</option>
                </select>
              </div>

              {/* X Column */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  X-Axis Column
                </label>
                <select
                  value={plotConfig.xColumn}
                  onChange={(e) => setPlotConfig(prev => ({ 
                    ...prev, 
                    xColumn: e.target.value 
                  }))}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                >
                  <option value="">Select column...</option>
                  {manipulatedData.columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Y Columns */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Y-Axis Columns
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {manipulatedData.columns.map(col => (
                    <label key={col} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={plotConfig.yColumns.includes(col)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlotConfig(prev => ({
                              ...prev,
                              yColumns: [...prev.yColumns, col]
                            }));
                          } else {
                            setPlotConfig(prev => ({
                              ...prev,
                              yColumns: prev.yColumns.filter(c => c !== col)
                            }));
                          }
                        }}
                        className="rounded border-gray-600 text-blue-500"
                      />
                      <span className="text-sm text-gray-300">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chart Title
                </label>
                <input
                  type="text"
                  value={plotConfig.title}
                  onChange={(e) => setPlotConfig(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                  placeholder="Enter chart title..."
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chart Subtitle
                </label>
                <input
                  type="text"
                  value={plotConfig.subtitle}
                  onChange={(e) => setPlotConfig(prev => ({ 
                    ...prev, 
                    subtitle: e.target.value 
                  }))}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                  placeholder="Enter chart subtitle..."
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setCurrentStep('generate')}
                disabled={!plotConfig.xColumn || plotConfig.yColumns.length === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Generate Chart
              </button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
            <div className="text-sm text-gray-400">
              Chart preview will be implemented with the existing chart components.
              For now, this shows the configuration summary.
            </div>
            
            <div className="mt-4 space-y-2 text-sm">
              <div><span className="text-gray-400">Type:</span> {plotConfig.chartType}</div>
              <div><span className="text-gray-400">X-Axis:</span> {plotConfig.xColumn || 'Not selected'}</div>
              <div><span className="text-gray-400">Y-Axis:</span> {plotConfig.yColumns.join(', ') || 'None selected'}</div>
              <div><span className="text-gray-400">Data Points:</span> {manipulatedData?.shape[0] || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderGenerateStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Chart Generated</h2>
        <div className="space-x-3">
          <button
            onClick={() => setCurrentStep('configure')}
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            ← Back to Configure
          </button>
          <button
            onClick={handleRestart}
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            New Chart
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">Chart Ready!</h3>
          <p className="mb-4">
            Your chart "{plotConfig.title}" has been generated with BWR visual standards.
          </p>
          <p className="text-sm">
            Chart component integration will be implemented in the next phase.
          </p>
          
          <div className="mt-6 space-x-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Export PNG
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Export SVG
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              BWR Plots
            </h1>
            <p className="text-xl text-gray-300 mb-2">
              Publication-Ready Chart Generator
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Create professional charts with exact BWR visual standards. 
              Upload your data and transform it into publication-ready visualizations in minutes.
            </p>
          </div>

          {renderStepIndicator()}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="card-elevated min-h-[600px] fade-in">
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'preview' && renderPreviewStep()}
            {currentStep === 'validate' && renderValidateStep()}
            {currentStep === 'manipulate' && renderManipulateStep()}
            {currentStep === 'configure' && renderConfigureStep()}
            {currentStep === 'generate' && renderGenerateStep()}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between p-6 bg-gray-800/50 rounded-2xl border border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-200">Need Help?</div>
                <div className="text-xs text-gray-400">View our documentation and examples</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="btn-ghost text-sm">
                Documentation
              </button>
              <button className="btn-ghost text-sm">
                Examples
              </button>
              <button onClick={handleRestart} className="btn-secondary text-sm">
                Start Over
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}