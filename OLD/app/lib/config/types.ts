// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Configuration Types                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

export interface BWRFontConfig {
  size: number;
  color: string;
}

export interface BWRGeneralConfig {
  width: number;
  height: number;
  template: string;
  background_image_path: string;
}

export interface BWRColorsConfig {
  background_color: string;
  primary: string;
  bar_default: string;
  hbar_positive: string;
  hbar_negative: string;
  default_palette: string[];
}

export interface BWRFontsConfig {
  normal_family: string;
  bold_family: string;
  title: BWRFontConfig;
  subtitle: BWRFontConfig;
  axis_title: BWRFontConfig;
  tick: BWRFontConfig;
  legend: BWRFontConfig;
  annotation: BWRFontConfig;
  table_header?: BWRFontConfig;
  table_cell?: BWRFontConfig;
}

export interface BWRWatermarkConfig {
  available_watermarks: Record<string, string>;
  selected_watermark_key: string;
  default_use: boolean;
  chart_opacity: number;
  chart_layer: 'above' | 'below';
  chart_x: number;
  chart_y: number;
  chart_sizex: number;
  chart_sizey: number;
  chart_xanchor: 'left' | 'center' | 'right';
}

export interface BWRLayoutConfig {
  margin_l: number;
  margin_r: number;
  margin_t_base: number;
  margin_b_min: number;
  plot_area_b_padding: number;
  title_x: number;
  title_padding: number;
  hovermode: string;
  hoverdistance: number;
  spikedistance: number;
}

export interface BWRLegendConfig {
  bgcolor: string;
  bordercolor: string;
  borderwidth: number;
  font_family: string;
  font_color: string;
  font_size: number;
  orientation: 'h' | 'v';
  yanchor: 'top' | 'middle' | 'bottom';
  y: number;
  xanchor: 'left' | 'center' | 'right';
  x: number;
  title: string;
  itemsizing: 'trace' | 'constant';
  itemwidth: number;
  marker_symbol: string;
  marker_size: number;
  traceorder: string;
}

export interface BWRAnnotationsConfig {
  default_source_y: number;
  default_source_x: number;
  xanchor: 'left' | 'center' | 'right';
  yanchor: 'top' | 'middle' | 'bottom';
  showarrow: boolean;
  chart_source_x: number;
  chart_source_y: number;
  chart_source_xanchor: 'left' | 'center' | 'right';
  chart_source_yanchor: 'top' | 'middle' | 'bottom';
  table_source_x: number;
  table_source_y: number;
  table_xanchor: 'left' | 'center' | 'right';
  table_yanchor: 'top' | 'middle' | 'bottom';
}

export interface BWRAxesConfig {
  linecolor: string;
  tickcolor: string;
  gridcolor: string;
  showgrid_x: boolean;
  showgrid_y: boolean;
  ticks: string;
  tickwidth: number;
  showline: boolean;
  linewidth: number;
  zeroline: boolean;
  zerolinewidth: number;
  zerolinecolor: string;
  showspikes: boolean;
  spikethickness: number;
  spikedash: string;
  spikecolor: string;
  spikemode: string;
  x_title_text: string;
  x_ticklen: number;
  x_nticks: number;
  x_tickformat: string;
  y_primary_title_text: string;
  y_primary_tickformat: string;
  y_primary_ticksuffix: string;
  y_primary_tickprefix: string;
  y_primary_range: [number, number] | null;
  y_secondary_title_text: string;
  y_secondary_tickformat: string;
  y_secondary_ticksuffix: string;
  y_secondary_tickprefix: string;
  y_secondary_range: [number, number] | null;
  gridwidth: number;
  y_showgrid: boolean;
  y_gridcolor: string;
  x_gridcolor: string;
  titlefont_size: number;
  titlefont_color: string;
}

export interface BWRScatterConfig {
  line_width: number;
  mode: string;
  default_fill_mode: string | null;
  default_fill_color: string | null;
  line_shape: string;
  line_smoothing: number;
  use_background_image: boolean;
}

export interface BWRMetricShareAreaConfig {
  stackgroup: string;
  y_tickformat: string;
  y_range: [number, number];
  legend_marker_symbol: string;
  use_background_image: boolean;
}

export interface BWRBarConfig {
  bargap: number;
  use_background_image: boolean;
}

export interface BWRHorizontalBarConfig {
  orientation: 'h' | 'v';
  textposition: string;
  default_y_column: string;
  default_x_column: string;
  default_sort_ascending: boolean;
  bar_height: number;
  bargap: number;
  yaxis_automargin: boolean;
  use_background_image: boolean;
}

export interface BWRMultiBarConfig {
  default_scale_values: boolean;
  default_show_bar_values: boolean;
  default_tick_frequency: number;
  barmode: string;
  bargap: number;
  bargroupgap: number;
  orientation: 'h' | 'v';
  textposition: string;
  legend_marker_symbol: string;
  use_background_image: boolean;
}

export interface BWRStackedBarConfig {
  default_sort_descending: boolean;
  barmode: string;
  bargap: number;
  bargroupgap: number;
  default_scale_values: boolean;
  y_tickformat: string;
  legend_marker_symbol: string;
  use_background_image: boolean;
}

export interface BWRTableConfig {
  header_fill_color: string;
  cell_fill_color_odd: string;
  cell_fill_color_even: string;
  line_color: string;
  cell_height: number;
}

export interface BWRPlotSpecificConfig {
  scatter: BWRScatterConfig;
  metric_share_area: BWRMetricShareAreaConfig;
  bar: BWRBarConfig;
  horizontal_bar: BWRHorizontalBarConfig;
  multi_bar: BWRMultiBarConfig;
  stacked_bar: BWRStackedBarConfig;
  table: BWRTableConfig;
}

export interface BWRConfig {
  general: BWRGeneralConfig;
  colors: BWRColorsConfig;
  fonts: BWRFontsConfig;
  watermark: BWRWatermarkConfig;
  layout: BWRLayoutConfig;
  legend: BWRLegendConfig;
  annotations: BWRAnnotationsConfig;
  axes: BWRAxesConfig;
  plot_specific: BWRPlotSpecificConfig;
}

export type PlotType = keyof BWRPlotSpecificConfig;