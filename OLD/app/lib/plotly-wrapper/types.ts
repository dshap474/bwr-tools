// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plotly Type Definitions                                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

import type { PlotlyDataLayoutConfig } from 'plotly.js-dist-min';

// Re-export Plotly types for convenience
export type { 
  Data, 
  Layout, 
  Config,
  PlotlyDataLayoutConfig,
  PlotData,
  PlotType as PlotlyPlotType,
  ScatterData,
  BarData,
  TableData
} from 'plotly.js-dist-min';

// Custom type guards
export function isScatterData(data: Partial<PlotData>): data is ScatterData {
  return data.type === 'scatter';
}

export function isBarData(data: Partial<PlotData>): data is BarData {
  return data.type === 'bar';
}

// BWR-specific Plotly extensions
export interface BWRPlotlyData extends Partial<PlotData> {
  // Add any BWR-specific data properties
  bwr_metadata?: {
    original_column_name?: string;
    scale_factor?: number;
    scale_suffix?: string;
  };
}

export interface BWRPlotlyLayout extends Partial<Layout> {
  // Background image support
  images?: Array<{
    source: string;
    xref: 'paper' | 'x';
    yref: 'paper' | 'y';
    x: number;
    y: number;
    sizex: number;
    sizey: number;
    sizing: 'fill' | 'contain' | 'stretch';
    opacity: number;
    layer: 'above' | 'below';
    xanchor?: 'left' | 'center' | 'right';
    yanchor?: 'top' | 'middle' | 'bottom';
  }>;
  
  // Multiple y-axes support
  yaxis2?: Partial<Layout['yaxis']>;
  yaxis3?: Partial<Layout['yaxis']>;
  yaxis4?: Partial<Layout['yaxis']>;
}

export interface BWRPlotlyConfig extends Partial<Config> {
  // Export configuration
  toImageButtonOptions?: {
    format: 'png' | 'svg' | 'jpeg' | 'webp';
    filename: string;
    height: number;
    width: number;
    scale: number;
  };
}

// Complete BWR plot specification
export interface BWRPlotSpec {
  data: BWRPlotlyData[];
  layout: BWRPlotlyLayout;
  config: BWRPlotlyConfig;
}

// Type for plot render options
export interface PlotRenderOptions {
  responsive?: boolean;
  displayModeBar?: boolean;
  displaylogo?: boolean;
  modeBarButtonsToRemove?: string[];
  modeBarButtonsToAdd?: Array<{
    name: string;
    icon: any;
    click: () => void;
  }>;
}

// Type for export options
export interface PlotExportOptions {
  format: 'png' | 'svg' | 'jpeg' | 'webp' | 'html';
  width?: number;
  height?: number;
  scale?: number;
  filename?: string;
  imageDataOnly?: boolean;
}

// Axis configuration type
export interface AxisConfig {
  title?: string;
  tickformat?: string;
  tickprefix?: string;
  ticksuffix?: string;
  range?: [number, number] | null;
  autorange?: boolean;
  showgrid?: boolean;
  gridcolor?: string;
  gridwidth?: number;
  showline?: boolean;
  linecolor?: string;
  linewidth?: number;
  zeroline?: boolean;
  zerolinecolor?: string;
  zerolinewidth?: number;
  tickmode?: 'auto' | 'linear' | 'array';
  nticks?: number;
  tick0?: number;
  dtick?: number | string;
  tickvals?: number[];
  ticktext?: string[];
  ticks?: 'outside' | 'inside' | '';
  ticklen?: number;
  tickwidth?: number;
  tickcolor?: string;
  showticklabels?: boolean;
  tickfont?: {
    family?: string;
    size?: number;
    color?: string;
  };
  anchor?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  overlaying?: string;
  layer?: 'above traces' | 'below traces';
  domain?: [number, number];
  position?: number;
  automargin?: boolean;
  showspikes?: boolean;
  spikecolor?: string;
  spikethickness?: number;
  spikedash?: string;
  spikemode?: string;
  spikesnap?: string;
}

// Type for hover configuration
export interface HoverConfig {
  mode?: 'closest' | 'x' | 'y' | 'x unified' | 'y unified';
  bgcolor?: string;
  bordercolor?: string;
  font?: {
    family?: string;
    size?: number;
    color?: string;
  };
  align?: 'left' | 'right' | 'auto';
  namelength?: number;
  hoverdistance?: number;
  spikedistance?: number;
}

import type { Data, Layout, Config, PlotData, ScatterData, BarData } from 'plotly.js-dist-min';