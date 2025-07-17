// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Data Manipulation Types                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

/**
 * Aggregation functions for pivot operations
 */
export type AggregationFunction = 'first' | 'mean' | 'sum' | 'count' | 'median' | 'min' | 'max';

/**
 * Configuration for pivot operations
 */
export interface PivotConfig {
  indexColumn: string;
  pivotColumn: string;
  valueColumn: string;
  aggFunction: AggregationFunction;
}

/**
 * Data manipulation operation types
 */
export type ManipulationOperationType = 'drop_columns' | 'rename_columns' | 'pivot_data';

/**
 * Base interface for all manipulation operations
 */
export interface BaseManipulationOperation {
  id: string;
  type: ManipulationOperationType;
  timestamp: number;
  description: string;
}

/**
 * Drop columns operation
 */
export interface DropColumnsOperation extends BaseManipulationOperation {
  type: 'drop_columns';
  columns: string[];
}

/**
 * Rename columns operation
 */
export interface RenameColumnsOperation extends BaseManipulationOperation {
  type: 'rename_columns';
  mapping: Record<string, string>;
}

/**
 * Pivot data operation
 */
export interface PivotDataOperation extends BaseManipulationOperation {
  type: 'pivot_data';
  config: PivotConfig;
}

/**
 * Union type for all manipulation operations
 */
export type ManipulationOperation = 
  | DropColumnsOperation 
  | RenameColumnsOperation 
  | PivotDataOperation;

/**
 * Manipulation step for tracking history
 */
export interface ManipulationStep {
  operation: ManipulationOperation;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Result of a manipulation operation
 */
export interface ManipulationResult {
  success: boolean;
  operation: ManipulationOperation;
  error?: string;
  warnings?: string[];
  affectedColumns?: string[];
  newColumns?: string[];
  removedColumns?: string[];
}

/**
 * Validation result for manipulation operations
 */
export interface ManipulationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}