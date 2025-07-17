// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Data Processing Pipeline                                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DataFrame } from './dataframe/DataFrame';
import type {
  FilterConfig,
  ProcessingConfig,
  DateFilterConfig,
  ColumnConfig,
  ChartType
} from '@bwr-tools/shared-types';

export interface PipelineStepResult {
  success: boolean;
  data?: DataFrame;
  errors: string[];
  warnings: string[];
  stepName: string;
  rowsAffected?: number;
  columnsAffected?: string[];
}

export interface PipelineConfig {
  // Data manipulation steps (matching Python app sequence)
  dropColumns: string[];
  renameMapping: Record<string, string>;
  pivotConfig?: {
    index: string;
    columns: string;
    values: string;
    aggFunc: 'first' | 'mean' | 'sum' | 'count';
  };
  
  // Column configuration
  indexColumn?: string;
  isDateColumn: boolean;
  
  // Filtering
  dateFilter: DateFilterConfig;
  customFilters: FilterConfig[];
  
  // Processing
  processing: ProcessingConfig[];
  
  // Chart specific
  chartType: ChartType;
  selectedColumns: ColumnConfig[];
}

export interface PipelineValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  steps: Record<string, PipelineStepResult>;
}

export class DataProcessingPipeline {
  private originalData: DataFrame;
  private currentData: DataFrame;
  private steps: PipelineStepResult[] = [];

  constructor(data: DataFrame) {
    this.originalData = data.copy();
    this.currentData = data.copy();
  }

  /**
   * Execute the complete processing pipeline matching Python app sequence:
   * 1. Drop columns
   * 2. Rename columns
   * 3. Pivot data
   * 4. Set index
   * 5. Date conversion
   * 6. Apply filters
   * 7. Resampling
   * 8. Smoothing
   */
  async execute(config: PipelineConfig): Promise<PipelineValidation> {
    this.steps = [];
    this.currentData = this.originalData.copy();
    
    const validation: PipelineValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      steps: {}
    };

    try {
      // Phase 1: Data Manipulation (matching Python app.py lines 782-897)
      await this.executeStep('drop_columns', () => this.dropColumns(config.dropColumns), validation);
      await this.executeStep('rename_columns', () => this.renameColumns(config.renameMapping), validation);
      await this.executeStep('pivot_data', () => this.pivotData(config.pivotConfig), validation);
      
      // Phase 2: Index and Date Processing (lines 899-1027)
      await this.executeStep('set_index', () => this.setIndex(config.indexColumn, config.isDateColumn), validation);
      await this.executeStep('convert_dates', () => this.convertDates(config.indexColumn, config.isDateColumn), validation);
      
      // Phase 3: Filtering (lines 1028-1070)
      await this.executeStep('apply_date_filter', () => this.applyDateFilter(config.dateFilter, config.indexColumn), validation);
      await this.executeStep('apply_custom_filters', () => this.applyCustomFilters(config.customFilters), validation);
      
      // Phase 4: Processing (lines 1071-1112)
      await this.executeStep('resample_data', () => this.resampleData(config.processing, config.chartType), validation);
      await this.executeStep('smooth_data', () => this.smoothData(config.processing, config.chartType), validation);
      
      // Final validation
      this.validateFinalResult(config, validation);
      
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Pipeline execution failed: ${error}`);
    }

    return validation;
  }

  private async executeStep(
    stepName: string,
    operation: () => Promise<PipelineStepResult> | PipelineStepResult,
    validation: PipelineValidation
  ): Promise<void> {
    try {
      const result = await operation();
      this.steps.push(result);
      validation.steps[stepName] = result;
      
      if (!result.success) {
        validation.isValid = false;
        validation.errors.push(...result.errors);
      }
      
      validation.warnings.push(...result.warnings);
      
      // Update current data if step was successful
      if (result.success && result.data) {
        this.currentData = result.data;
      }
    } catch (error) {
      const errorResult: PipelineStepResult = {
        success: false,
        stepName,
        errors: [`Step ${stepName} failed: ${error}`],
        warnings: []
      };
      
      this.steps.push(errorResult);
      validation.steps[stepName] = errorResult;
      validation.isValid = false;
      validation.errors.push(...errorResult.errors);
    }
  }

  private dropColumns(columnsToDrop: string[]): PipelineStepResult {
    if (columnsToDrop.length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'drop_columns'
      };
    }

    const existingColumns = columnsToDrop.filter(col => this.currentData.columns.includes(col));
    const missingColumns = columnsToDrop.filter(col => !this.currentData.columns.includes(col));
    
    const warnings: string[] = [];
    if (missingColumns.length > 0) {
      warnings.push(`Columns not found: ${missingColumns.join(', ')}`);
    }

    if (existingColumns.length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings,
        stepName: 'drop_columns'
      };
    }

    try {
      const resultData = this.currentData.dropColumns(existingColumns);
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings,
        stepName: 'drop_columns',
        columnsAffected: existingColumns
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to drop columns: ${error}`],
        warnings,
        stepName: 'drop_columns'
      };
    }
  }

  private renameColumns(renameMapping: Record<string, string>): PipelineStepResult {
    const activeRenames = Object.fromEntries(
      Object.entries(renameMapping).filter(([, newName]) => newName.trim())
    );

    if (Object.keys(activeRenames).length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'rename_columns'
      };
    }

    const warnings: string[] = [];
    const validRenames: Record<string, string> = {};
    
    for (const [oldName, newName] of Object.entries(activeRenames)) {
      if (!this.currentData.columns.includes(oldName)) {
        warnings.push(`Column '${oldName}' not found for renaming`);
      } else if (this.currentData.columns.includes(newName) && newName !== oldName) {
        warnings.push(`Target column name '${newName}' already exists`);
      } else {
        validRenames[oldName] = newName;
      }
    }

    if (Object.keys(validRenames).length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings,
        stepName: 'rename_columns'
      };
    }

    try {
      const resultData = this.currentData.renameColumns(validRenames);
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings,
        stepName: 'rename_columns',
        columnsAffected: Object.keys(validRenames)
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to rename columns: ${error}`],
        warnings,
        stepName: 'rename_columns'
      };
    }
  }

  private pivotData(pivotConfig?: PipelineConfig['pivotConfig']): PipelineStepResult {
    if (!pivotConfig) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'pivot_data'
      };
    }

    const { index, columns, values, aggFunc } = pivotConfig;
    const errors: string[] = [];

    // Validate required columns exist
    if (!this.currentData.columns.includes(index)) {
      errors.push(`Index column '${index}' not found`);
    }
    if (!this.currentData.columns.includes(columns)) {
      errors.push(`Columns parameter '${columns}' not found`);
    }
    if (!this.currentData.columns.includes(values)) {
      errors.push(`Values column '${values}' not found`);
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings: [],
        stepName: 'pivot_data'
      };
    }

    try {
      const resultData = this.currentData.pivot({
        index,
        columns,
        values,
        aggFunc
      });
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'pivot_data',
        rowsAffected: resultData.shape[0],
        columnsAffected: resultData.columns
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Pivot operation failed: ${error}`],
        warnings: [],
        stepName: 'pivot_data'
      };
    }
  }

  private setIndex(indexColumn?: string, isDateColumn: boolean = false): PipelineStepResult {
    if (!indexColumn) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: ['No index column specified'],
        stepName: 'set_index'
      };
    }

    if (!this.currentData.columns.includes(indexColumn)) {
      return {
        success: false,
        errors: [`Index column '${indexColumn}' not found`],
        warnings: [],
        stepName: 'set_index'
      };
    }

    try {
      const resultData = this.currentData.setIndex(indexColumn);
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'set_index',
        columnsAffected: [indexColumn]
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to set index: ${error}`],
        warnings: [],
        stepName: 'set_index'
      };
    }
  }

  private convertDates(indexColumn?: string, isDateColumn: boolean = false): PipelineStepResult {
    if (!isDateColumn || !indexColumn) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'convert_dates'
      };
    }

    try {
      // This would implement date conversion logic
      // For now, assume the DataFrame handles this internally
      const resultData = this.currentData.convertColumnToDate(indexColumn);
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'convert_dates',
        columnsAffected: [indexColumn]
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Date conversion failed: ${error}`],
        warnings: [],
        stepName: 'convert_dates'
      };
    }
  }

  private applyDateFilter(dateFilter: DateFilterConfig, indexColumn?: string): PipelineStepResult {
    if (dateFilter.mode === 'none' || !indexColumn) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'apply_date_filter'
      };
    }

    try {
      let startDate: Date;
      let endDate: Date = new Date();

      if (dateFilter.mode === 'lookback') {
        const days = dateFilter.lookbackDays || 30;
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      } else if (dateFilter.mode === 'dateWindow') {
        if (!dateFilter.startDate || !dateFilter.endDate) {
          return {
            success: false,
            errors: ['Date window requires both start and end dates'],
            warnings: [],
            stepName: 'apply_date_filter'
          };
        }
        startDate = new Date(dateFilter.startDate);
        endDate = new Date(dateFilter.endDate);
      } else {
        return {
          success: false,
          errors: [`Unknown date filter mode: ${dateFilter.mode}`],
          warnings: [],
          stepName: 'apply_date_filter'
        };
      }

      const resultData = this.currentData.filterByDateRange(indexColumn, startDate, endDate);
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'apply_date_filter',
        rowsAffected: resultData.shape[0]
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Date filtering failed: ${error}`],
        warnings: [],
        stepName: 'apply_date_filter'
      };
    }
  }

  private applyCustomFilters(filters: FilterConfig[]): PipelineStepResult {
    const activeFilters = filters.filter(f => f.enabled);
    
    if (activeFilters.length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'apply_custom_filters'
      };
    }

    try {
      let resultData = this.currentData;
      
      for (const filter of activeFilters) {
        resultData = this.applyFilter(resultData, filter);
      }
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'apply_custom_filters',
        rowsAffected: resultData.shape[0]
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Custom filtering failed: ${error}`],
        warnings: [],
        stepName: 'apply_custom_filters'
      };
    }
  }

  private applyFilter(data: DataFrame, filter: FilterConfig): DataFrame {
    // This would implement the specific filter logic based on operator
    // For now, return the data unchanged
    return data;
  }

  private resampleData(processing: ProcessingConfig[], chartType: ChartType): PipelineStepResult {
    const resampleOps = processing.filter(p => p.enabled && p.function === 'resample');
    
    if (resampleOps.length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'resample_data'
      };
    }

    // Only apply resampling for specific chart types (matching Python app)
    const resamplingChartTypes: ChartType[] = ['multibar', 'stackedbar'];
    
    if (!resamplingChartTypes.includes(chartType)) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [`Resampling not applicable for chart type: ${chartType}`],
        stepName: 'resample_data'
      };
    }

    try {
      let resultData = this.currentData;
      
      for (const op of resampleOps) {
        const rule = op.parameters.rule || 'D';
        const method = op.parameters.method || 'mean';
        resultData = resultData.resample(rule, method);
      }
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'resample_data',
        rowsAffected: resultData.shape[0]
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Resampling failed: ${error}`],
        warnings: [],
        stepName: 'resample_data'
      };
    }
  }

  private smoothData(processing: ProcessingConfig[], chartType: ChartType): PipelineStepResult {
    const smoothOps = processing.filter(p => p.enabled && (p.function === 'smooth' || p.function === 'rolling'));
    
    if (smoothOps.length === 0) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [],
        stepName: 'smooth_data'
      };
    }

    // Only apply smoothing for specific chart types (matching Python app)
    const smoothingChartTypes: ChartType[] = ['scatter', 'metricsharearea'];
    
    if (!smoothingChartTypes.includes(chartType)) {
      return {
        success: true,
        data: this.currentData,
        errors: [],
        warnings: [`Smoothing not applicable for chart type: ${chartType}`],
        stepName: 'smooth_data'
      };
    }

    try {
      let resultData = this.currentData;
      
      for (const op of smoothOps) {
        const window = op.parameters.window || 5;
        const method = op.parameters.method || 'mean';
        resultData = resultData.rolling(window, method);
      }
      
      return {
        success: true,
        data: resultData,
        errors: [],
        warnings: [],
        stepName: 'smooth_data',
        rowsAffected: resultData.shape[0]
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Smoothing failed: ${error}`],
        warnings: [],
        stepName: 'smooth_data'
      };
    }
  }

  private validateFinalResult(config: PipelineConfig, validation: PipelineValidation): void {
    // Check if we have data
    if (this.currentData.shape[0] === 0) {
      validation.warnings.push('No data remaining after processing');
    }

    // Check for required columns based on chart type
    const requiredColumns = config.selectedColumns.filter(col => 
      ['x', 'y'].includes(col.role)
    ).map(col => col.name);

    const missingColumns = requiredColumns.filter(col => 
      !this.currentData.columns.includes(col)
    );

    if (missingColumns.length > 0) {
      validation.errors.push(`Required columns missing: ${missingColumns.join(', ')}`);
      validation.isValid = false;
    }
  }

  /**
   * Get the current processed data
   */
  getResult(): DataFrame {
    return this.currentData;
  }

  /**
   * Get processing steps history
   */
  getSteps(): PipelineStepResult[] {
    return this.steps;
  }

  /**
   * Reset to original data
   */
  reset(): void {
    this.currentData = this.originalData.copy();
    this.steps = [];
  }

  /**
   * Get preview of data at specific step
   */
  getStepPreview(stepIndex: number, maxRows: number = 100): any[] {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      return [];
    }

    const step = this.steps[stepIndex];
    if (!step.data) return [];

    return step.data.head(maxRows).toJSON();
  }
}