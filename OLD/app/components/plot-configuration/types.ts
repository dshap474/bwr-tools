// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plot Configuration Types                                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

export type ChartType = 'scatter' | 'bar' | 'multibar' | 'stackedbar' | 'metricsharearea' | 'table';

export type ColumnRole = 'x' | 'y' | 'color' | 'size' | 'category' | 'group';

export type FilterOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'is_null' | 'is_not_null';

export type ProcessingFunction = 'resample' | 'rolling' | 'smooth' | 'scale' | 'normalize' | 'log_transform' | 'difference';

// Core configuration interfaces
export interface ColumnConfig {
  name: string;
  role: ColumnRole;
  displayName?: string;
  color?: string;
  visible?: boolean;
}

export interface FilterConfig {
  id: string;
  column: string;
  operator: FilterOperator;
  value: any;
  enabled: boolean;
}

export interface ProcessingConfig {
  id: string;
  function: ProcessingFunction;
  column: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface PlotConfiguration {
  // Chart type and basic config
  chartType: ChartType;
  title: string;
  subtitle: string;
  
  // Column assignments
  columns: ColumnConfig[];
  
  // Data processing
  filters: FilterConfig[];
  processing: ProcessingConfig[];
  
  // Display options
  showLegend: boolean;
  showGrid: boolean;
  showWatermark: boolean;
  watermarkText?: string;
  
  // Styling
  colorScheme: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
  
  // Export settings
  exportFormats: string[];
}

export interface PlotConfigurationState {
  config: PlotConfiguration;
  isDirty: boolean;
  validationErrors: string[];
  previewEnabled: boolean;
}

// Component interfaces
export interface ColumnSelectorProps {
  availableColumns: string[];
  selectedColumns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  chartType: ChartType;
  sampleData?: Record<string, any[]>;
  maxColumns?: Record<ColumnRole, number>;
  disabled?: boolean;
  className?: string;
}

export interface FilterControlsProps {
  columns: string[];
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  sampleData?: Record<string, any[]>;
  disabled?: boolean;
  className?: string;
}

export interface ProcessingOptionsProps {
  columns: string[];
  processing: ProcessingConfig[];
  onProcessingChange: (processing: ProcessingConfig[]) => void;
  chartType: ChartType;
  disabled?: boolean;
  className?: string;
}

// Validation interfaces
export interface ColumnValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FilterValidation {
  isValid: boolean;
  errors: string[];
  affectedRows: number;
}

export interface ProcessingValidation {
  isValid: boolean;
  errors: string[];
  outputColumns: string[];
}

export interface ConfigurationValidation {
  isValid: boolean;
  columnValidation: Record<string, ColumnValidation>;
  filterValidation: Record<string, FilterValidation>;
  processingValidation: Record<string, ProcessingValidation>;
  globalErrors: string[];
}

// Chart type configuration
export interface ChartTypeConfig {
  type: ChartType;
  displayName: string;
  description: string;
  requiredRoles: ColumnRole[];
  optionalRoles: ColumnRole[];
  maxColumns: Record<ColumnRole, number>;
  supportedProcessing: ProcessingFunction[];
  icon: string;
  previewComponent?: React.ComponentType<any>;
}

// Default configurations for each chart type
export const CHART_TYPE_CONFIGS: Record<ChartType, ChartTypeConfig> = {
  scatter: {
    type: 'scatter',
    displayName: 'Scatter Plot',
    description: 'Plot individual data points with optional trend lines',
    requiredRoles: ['x', 'y'],
    optionalRoles: ['color', 'size'],
    maxColumns: { x: 1, y: 5, color: 1, size: 1, category: 0, group: 0 },
    supportedProcessing: ['resample', 'rolling', 'smooth', 'scale'],
    icon: '📊'
  },
  bar: {
    type: 'bar',
    displayName: 'Bar Chart',
    description: 'Compare values across categories',
    requiredRoles: ['x', 'y'],
    optionalRoles: ['color'],
    maxColumns: { x: 1, y: 3, color: 1, size: 0, category: 0, group: 0 },
    supportedProcessing: ['scale', 'normalize'],
    icon: '📊'
  },
  multibar: {
    type: 'multibar',
    displayName: 'Multi-Bar Chart',
    description: 'Compare multiple series side by side',
    requiredRoles: ['x', 'y', 'group'],
    optionalRoles: ['color'],
    maxColumns: { x: 1, y: 5, color: 1, size: 0, category: 0, group: 1 },
    supportedProcessing: ['scale', 'normalize'],
    icon: '📊'
  },
  stackedbar: {
    type: 'stackedbar',
    displayName: 'Stacked Bar Chart',
    description: 'Show composition of totals',
    requiredRoles: ['x', 'y', 'category'],
    optionalRoles: ['color'],
    maxColumns: { x: 1, y: 1, color: 1, size: 0, category: 1, group: 0 },
    supportedProcessing: ['scale', 'normalize'],
    icon: '📊'
  },
  metricsharearea: {
    type: 'metricsharearea',
    displayName: 'Metric Share Area',
    description: 'Show relative proportions over time',
    requiredRoles: ['x', 'y'],
    optionalRoles: ['color'],
    maxColumns: { x: 1, y: 10, color: 1, size: 0, category: 0, group: 0 },
    supportedProcessing: ['resample', 'rolling', 'smooth'],
    icon: '📈'
  },
  table: {
    type: 'table',
    displayName: 'Data Table',
    description: 'Display data in tabular format',
    requiredRoles: [],
    optionalRoles: ['x', 'y', 'color', 'size', 'category', 'group'],
    maxColumns: { x: 50, y: 50, color: 5, size: 5, category: 10, group: 10 },
    supportedProcessing: ['scale', 'normalize'],
    icon: '📋'
  }
};

// Helper functions
export function getChartTypeConfig(chartType: ChartType): ChartTypeConfig {
  return CHART_TYPE_CONFIGS[chartType];
}

export function isValidColumnAssignment(chartType: ChartType, role: ColumnRole, currentCount: number): boolean {
  const config = getChartTypeConfig(chartType);
  const maxCount = config.maxColumns[role] || 0;
  return currentCount < maxCount;
}

export function getRequiredRoles(chartType: ChartType): ColumnRole[] {
  return getChartTypeConfig(chartType).requiredRoles;
}

export function getOptionalRoles(chartType: ChartType): ColumnRole[] {
  return getChartTypeConfig(chartType).optionalRoles;
}

export function validateColumnConfiguration(chartType: ChartType, columns: ColumnConfig[]): ColumnValidation {
  const config = getChartTypeConfig(chartType);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required roles
  const assignedRoles = new Set(columns.map(c => c.role));
  for (const requiredRole of config.requiredRoles) {
    if (!assignedRoles.has(requiredRole)) {
      errors.push(`Missing required ${requiredRole} column assignment`);
    }
  }
  
  // Check column limits
  const roleCounts = columns.reduce((counts, col) => {
    counts[col.role] = (counts[col.role] || 0) + 1;
    return counts;
  }, {} as Record<ColumnRole, number>);
  
  for (const [role, count] of Object.entries(roleCounts)) {
    const maxCount = config.maxColumns[role as ColumnRole] || 0;
    if (count > maxCount) {
      errors.push(`Too many ${role} columns: ${count} assigned, maximum ${maxCount}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}