// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Configuration Types                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

export interface GeneralConfig {
  width: number;
  height: number;
  template: string;
  background_image_path: string;
}

export interface ColorConfig {
  background_color: string;
  primary: string;
  bar_default: string;
  hbar_positive: string;
  hbar_negative: string;
  default_palette: string[];
}

export interface FontSizeColor {
  size: number;
  color: string;
}

export interface FontConfig {
  normal_family: string;
  bold_family: string;
  title: FontSizeColor;
  subtitle: FontSizeColor;
  axis_title: FontSizeColor;
  tick: FontSizeColor;
  legend: FontSizeColor;
  annotation: FontSizeColor;
  table_header: FontSizeColor;
  table_cell: FontSizeColor;
}

export interface PlotlyTableOptions {
  use_default_path: boolean;
  x: number;
  y: number;
  sizex: number;
  sizey: number;
  opacity: number;
  layer: string;
  xanchor: string;
  yanchor: string;
}

export interface WatermarkConfig {
  available_watermarks: Record<string, string>;
  selected_watermark_key: string;
  default_use: boolean;
  chart_opacity: number;
  chart_layer: string;
  chart_x: number;
  chart_y: number;
  chart_sizex: number;
  chart_sizey: number;
  chart_xanchor: string;
  plotly_table_options: PlotlyTableOptions;
}

export interface LayoutConfig {
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
  table_margin_l: number;
  table_padding_below_source_px: number;
}

export interface LegendConfig {
  bgcolor: string;
  bordercolor: string;
  borderwidth: number;
  font_family: string;
  font_color: string;
  font_size: number;
  orientation: string;
  yanchor: string;
  y: number;
  x: number;
  xanchor: string;
}

export interface AnnotationConfig {
  annotation_font_size: number;
  annotation_color: string;
  source_y: number;
  source_x: number;
  source_anchor: string;
  subtitle_yshift: number;
  subtitle_font_size: number;
  subtitle_color: string;
}

export interface AxisConfig {
  x_numeric_tickformat: string;
  gridcolor: string;
  zerolinecolor: string;
  showgrid_x: boolean;
  showgrid_y: boolean;
  showline: boolean;
  linecolor: string;
  linewidth: number;
}

export interface PlotSpecificConfig {
  scatter: {
    use_background_image: boolean;
    mode: string;
    line_width: number;
    marker_size: number;
    opacity: number;
  };
  bar: {
    use_background_image: boolean;
    opacity: number;
    bargap: number;
  };
  horizontal_bar: {
    use_background_image: boolean;
    opacity: number;
    bargap: number;
    sorting: {
      enabled: boolean;
      ascending: boolean;
    };
  };
  multi_bar: {
    use_background_image: boolean;
    opacity: number;
    bargap: number;
    bargroupgap: number;
  };
  stacked_bar: {
    use_background_image: boolean;
    opacity: number;
    bargap: number;
  };
  metric_share_area: {
    use_background_image: boolean;
    opacity: number;
    smoothing: {
      enabled: boolean;
      window: number;
    };
  };
  table: {
    use_background_image: boolean;
    row_height: number;
    header_height: number;
    stripe_color: string;
    border_color: string;
    border_width: number;
  };
}

export interface BWRConfig {
  general: GeneralConfig;
  colors: ColorConfig;
  fonts: FontConfig;
  watermark: WatermarkConfig;
  layout: LayoutConfig;
  legend: LegendConfig;
  annotations: AnnotationConfig;
  axes: AxisConfig;
  plot_specific: PlotSpecificConfig;
}

// Utility type for partial config overrides
export type PartialBWRConfig = {
  [K in keyof BWRConfig]?: Partial<BWRConfig[K]>;
};