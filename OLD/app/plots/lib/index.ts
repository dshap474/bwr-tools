// Data processing exports
export { DataFrame } from './dataframe/DataFrame';
export { Series } from './dataframe/Series';
export { Index, DatetimeIndex } from './dataframe/Index';

// Export types
export * from './dataframe/types';

// Export processing pipeline
export { 
  DataProcessingPipeline,
  type PipelineConfig,
  type PipelineStepResult,
  type PipelineValidation
} from './processing-pipeline';

// Export utilities
export * from './utils/scale';
export * from './utils/dates';
export * from './utils/nice-numbers';

// Common type exports for convenience
export type {
  ScaleResult,
  ScaleInfo,
  RoundAndAlignOptions,
  YAxisGridParams,
  ColumnType,
  DataValue,
  DataFrameData,
  DataFrameOptions,
  DataFrameInfo,
  ResampleOptions,
  RollingOptions,
  AggFunction,
  FillMethod,
  ExportFormat,
} from './dataframe/types';