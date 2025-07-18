// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Plots Type Definitions                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

// Re-export configuration types
export * from '../config/config-types';

// Chart argument interfaces matching Python method signatures
export interface BaseChartArgs {
  data: any;
  title?: string;
  subtitle?: string;
  source?: string;
  prefix?: string;
  suffix?: string;
  x_axis_title?: string;
  y_axis_title?: string;
  save_image?: boolean;
  open_in_browser?: boolean;
  axis_options?: any;
  [key: string]: any; // Allow additional options
}

export interface StackedBarArgs extends BaseChartArgs {
  xaxis_is_date?: boolean;
  colors?: Record<string, string>;
  sort_descending?: boolean;
  opacity?: number;
  bargap?: number;
}

export interface ScatterPlotArgs extends BaseChartArgs {
  xaxis_is_date?: boolean;
  mode?: string;
  line_width?: number;
  marker_size?: number;
  opacity?: number;
  secondary_y_data?: any;
  secondary_y_title?: string;
  secondary_y_prefix?: string;
  secondary_y_suffix?: string;
}

export interface MetricShareAreaArgs extends BaseChartArgs {
  xaxis_is_date?: boolean;
  smoothing_window?: number;
  opacity?: number;
}

export interface BarArgs extends BaseChartArgs {
  colors?: Record<string, string>;
  opacity?: number;
  bargap?: number;
}

export interface HorizontalBarArgs extends BaseChartArgs {
  colors?: Record<string, string>;
  opacity?: number;
  bargap?: number;
  sort_descending?: boolean;
}

export interface MultiBarArgs extends BaseChartArgs {
  xaxis_is_date?: boolean;
  colors?: Record<string, string>;
  opacity?: number;
  bargap?: number;
  bargroupgap?: number;
}

export interface TableArgs extends BaseChartArgs {
  row_height?: number;
  header_height?: number;
  stripe_color?: string;
  border_color?: string;
  border_width?: number;
}

export interface PointScatterArgs extends BaseChartArgs {
  x_column: string;
  y_column: string;
  color_column?: string;
  symbol_column?: string;
  name_column?: string;
  xaxis_is_date?: boolean;
}

// Plotly specification interface
export interface BWRPlotSpec {
  data: any[];
  layout: any;
  config: any;
}

// Data processing options
export interface DataProcessingOptions {
  groupByMonth?: boolean;
  xaxis_is_date?: boolean;
  index_column?: string;
  filter_mode?: 'lookback' | 'date_window';
  lookback_days?: number;
  start_date?: string;
  end_date?: string;
  resample_freq?: string;
  smoothing_window?: number;
}

// Chart generation result
export interface ChartGenerationResult {
  success: boolean;
  spec?: BWRPlotSpec;
  error?: string;
}

// Export options
export interface ExportOptions {
  format: 'png' | 'svg' | 'jpeg' | 'html' | 'json';
  filename?: string;
  path?: string;
  width?: number;
  height?: number;
  scale?: number;
}