// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Pivot Data Wizard Component                                                         │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { PivotConfig, AggregationFunction } from './types';

export interface PivotDataWizardProps {
  /** Available columns for pivoting */
  columns: string[];
  /** Current pivot configuration */
  config: PivotConfig | null;
  /** Callback when pivot configuration changes */
  onConfigChange: (config: PivotConfig | null) => void;
  /** Sample data for preview (first few rows) */
  sampleData?: Record<string, any[]>;
  /** Whether the wizard is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const AGGREGATION_FUNCTIONS: Array<{
  value: AggregationFunction;
  label: string;
  description: string;
}> = [
  { value: 'first', label: 'First', description: 'Take the first value encountered' },
  { value: 'mean', label: 'Mean', description: 'Calculate the average' },
  { value: 'sum', label: 'Sum', description: 'Add all values together' },
  { value: 'count', label: 'Count', description: 'Count number of values' },
  { value: 'median', label: 'Median', description: 'Take the middle value' },
  { value: 'min', label: 'Minimum', description: 'Take the smallest value' },
  { value: 'max', label: 'Maximum', description: 'Take the largest value' },
];

export const PivotDataWizard: React.FC<PivotDataWizardProps> = ({
  columns,
  config,
  onConfigChange,
  sampleData,
  disabled = false,
  className
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [tempConfig, setTempConfig] = useState<Partial<PivotConfig>>(
    config || {
      indexColumn: '',
      pivotColumn: '',
      valueColumn: '',
      aggFunction: 'first'
    }
  );

  // Validate current step
  const stepValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (step) {
      case 1:
        if (!tempConfig.indexColumn) {
          errors.push('Please select an index column');
        }
        break;
      case 2:
        if (!tempConfig.pivotColumn) {
          errors.push('Please select a pivot column');
        } else if (tempConfig.pivotColumn === tempConfig.indexColumn) {
          errors.push('Pivot column cannot be the same as index column');
        }
        break;
      case 3:
        if (!tempConfig.valueColumn) {
          errors.push('Please select a value column');
        } else if (
          tempConfig.valueColumn === tempConfig.indexColumn ||
          tempConfig.valueColumn === tempConfig.pivotColumn
        ) {
          errors.push('Value column must be different from index and pivot columns');
        }
        break;
      case 4:
        if (!tempConfig.aggFunction) {
          errors.push('Please select an aggregation function');
        }
        break;
    }

    // General warnings
    if (sampleData && tempConfig.pivotColumn && tempConfig.valueColumn) {
      const pivotValues = sampleData[tempConfig.pivotColumn] || [];
      const uniquePivotValues = new Set(pivotValues).size;
      if (uniquePivotValues > 20) {
        warnings.push(`Pivot column has ${uniquePivotValues} unique values. This may create many columns.`);
      }

      const valueValues = sampleData[tempConfig.valueColumn] || [];
      const nonNumericValues = valueValues.filter(v => typeof v !== 'number' && v !== null && v !== undefined);
      if (nonNumericValues.length > 0 && tempConfig.aggFunction !== 'first' && tempConfig.aggFunction !== 'count') {
        warnings.push('Value column contains non-numeric data. Consider using "First" or "Count" aggregation.');
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }, [step, tempConfig, sampleData]);

  // Handle field changes
  const handleFieldChange = (field: keyof PivotConfig, value: string | AggregationFunction) => {
    setTempConfig(prev => ({ ...prev, [field]: value }));
  };

  // Handle step navigation
  const handleNext = () => {
    if (stepValidation.isValid && step < 4) {
      setStep((step + 1) as typeof step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as typeof step);
    }
  };

  // Handle completion
  const handleComplete = () => {
    if (stepValidation.isValid && tempConfig.indexColumn && tempConfig.pivotColumn && tempConfig.valueColumn && tempConfig.aggFunction) {
      onConfigChange(tempConfig as PivotConfig);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    setTempConfig({
      indexColumn: '',
      pivotColumn: '',
      valueColumn: '',
      aggFunction: 'first'
    });
    setStep(1);
    onConfigChange(null);
  };

  // Get available columns for each step
  const getAvailableColumns = (excludeFields: (keyof PivotConfig)[]) => {
    const excludeValues = excludeFields.map(field => tempConfig[field]).filter(Boolean);
    return columns.filter(col => !excludeValues.includes(col));
  };

  // Render column selector
  const renderColumnSelector = (
    field: keyof PivotConfig,
    label: string,
    description: string,
    excludeFields: (keyof PivotConfig)[] = []
  ) => {
    const availableColumns = getAvailableColumns(excludeFields);
    const selectedValue = tempConfig[field] as string;

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            {label}
          </label>
          <p className="text-sm text-gray-400 mb-4">{description}</p>
        </div>

        <select
          value={selectedValue || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          disabled={disabled}
          className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
        >
          <option value="">Select a column...</option>
          {availableColumns.map(col => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        {/* Sample values preview */}
        {selectedValue && sampleData?.[selectedValue] && (
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Sample values:</div>
            <div className="flex flex-wrap gap-1">
              {[...new Set(sampleData[selectedValue].slice(0, 10))].map((value, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                >
                  {String(value)}
                </span>
              ))}
              {new Set(sampleData[selectedValue]).size > 10 && (
                <span className="text-xs text-gray-400">
                  ... +{new Set(sampleData[selectedValue]).size - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render aggregation function selector
  const renderAggregationSelector = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Aggregation Function
        </label>
        <p className="text-sm text-gray-400 mb-4">
          How should duplicate index/column pairs be handled?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AGGREGATION_FUNCTIONS.map(({ value, label, description }) => (
          <label
            key={value}
            className={clsx(
              'flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors',
              {
                'border-blue-500 bg-blue-900/20': tempConfig.aggFunction === value,
                'border-gray-600 hover:border-gray-500': tempConfig.aggFunction !== value && !disabled,
                'cursor-not-allowed opacity-50': disabled
              }
            )}
          >
            <input
              type="radio"
              name="aggFunction"
              value={value}
              checked={tempConfig.aggFunction === value}
              onChange={(e) => handleFieldChange('aggFunction', e.target.value as AggregationFunction)}
              disabled={disabled}
              className="mt-0.5 text-blue-500 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-200">{label}</div>
              <div className="text-sm text-gray-400">{description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderColumnSelector(
          'indexColumn',
          'Select Index Column',
          'This column will become the row index of the pivoted table. Each unique value will be a row.'
        );
      case 2:
        return renderColumnSelector(
          'pivotColumn',
          'Select Pivot Column',
          'This column\'s unique values will become the new column headers.',
          ['indexColumn']
        );
      case 3:
        return renderColumnSelector(
          'valueColumn',
          'Select Value Column',
          'This column contains the values that will fill the pivoted table cells.',
          ['indexColumn', 'pivotColumn']
        );
      case 4:
        return renderAggregationSelector();
      default:
        return null;
    }
  };

  // Render configuration summary
  const renderSummary = () => {
    if (!config) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-gray-200 mb-3">Current Pivot Configuration:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Index:</span>
            <span className="ml-2 text-blue-300">{config.indexColumn}</span>
          </div>
          <div>
            <span className="text-gray-400">Pivot:</span>
            <span className="ml-2 text-green-300">{config.pivotColumn}</span>
          </div>
          <div>
            <span className="text-gray-400">Values:</span>
            <span className="ml-2 text-yellow-300">{config.valueColumn}</span>
          </div>
          <div>
            <span className="text-gray-400">Aggregation:</span>
            <span className="ml-2 text-purple-300">
              {AGGREGATION_FUNCTIONS.find(f => f.value === config.aggFunction)?.label}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Pivot Data Setup</h3>
        {config && (
          <button
            onClick={handleCancel}
            disabled={disabled}
            className="text-sm text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Clear Pivot
          </button>
        )}
      </div>

      {/* Show current config if set */}
      {config && renderSummary()}

      {/* Step indicator */}
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4].map((stepNum) => (
          <React.Fragment key={stepNum}>
            <div
              className={clsx(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium',
                {
                  'border-blue-500 bg-blue-500 text-white': stepNum <= step,
                  'border-gray-600 bg-gray-800 text-gray-400': stepNum > step
                }
              )}
            >
              {stepNum < step ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                stepNum
              )}
            </div>
            {stepNum < 4 && (
              <div className={clsx('flex-1 h-0.5', {
                'bg-blue-500': stepNum < step,
                'bg-gray-600': stepNum >= step
              })} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step labels */}
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
        <div className={step >= 1 ? 'text-blue-300' : ''}>1. Index</div>
        <div className={step >= 2 ? 'text-blue-300' : ''}>2. Pivot</div>
        <div className={step >= 3 ? 'text-blue-300' : ''}>3. Values</div>
        <div className={step >= 4 ? 'text-blue-300' : ''}>4. Aggregation</div>
      </div>

      {/* Step content */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {renderStepContent()}
      </div>

      {/* Validation messages */}
      {stepValidation.errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-300 mb-2">Errors:</h4>
          <ul className="text-sm text-red-200 space-y-1">
            {stepValidation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {stepValidation.warnings.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-300 mb-2">Warnings:</h4>
          <ul className="text-sm text-yellow-200 space-y-1">
            {stepValidation.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={disabled || step === 1}
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        <div className="space-x-3">
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={disabled || !stepValidation.isValid}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={disabled || !stepValidation.isValid}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Apply Pivot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PivotDataWizard;