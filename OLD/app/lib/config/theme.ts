// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ BWR Theme Constants                                                                 │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { DEFAULT_BWR_CONFIG } from './bwr-config';

// Export commonly used theme values for easy access
export const theme = {
  // Colors
  colors: {
    background: DEFAULT_BWR_CONFIG.colors.background_color,
    primary: DEFAULT_BWR_CONFIG.colors.primary,
    text: {
      primary: DEFAULT_BWR_CONFIG.fonts.title.color,
      secondary: DEFAULT_BWR_CONFIG.fonts.subtitle.color,
      annotation: DEFAULT_BWR_CONFIG.fonts.annotation.color,
    },
    chart: {
      barDefault: DEFAULT_BWR_CONFIG.colors.bar_default,
      positive: DEFAULT_BWR_CONFIG.colors.hbar_positive,
      negative: DEFAULT_BWR_CONFIG.colors.hbar_negative,
    },
    grid: DEFAULT_BWR_CONFIG.axes.gridcolor,
    palette: DEFAULT_BWR_CONFIG.colors.default_palette,
  },
  
  // Typography
  typography: {
    fontFamily: {
      normal: DEFAULT_BWR_CONFIG.fonts.normal_family,
      bold: DEFAULT_BWR_CONFIG.fonts.bold_family,
    },
    fontSize: {
      title: DEFAULT_BWR_CONFIG.fonts.title.size,
      subtitle: DEFAULT_BWR_CONFIG.fonts.subtitle.size,
      axisTitle: DEFAULT_BWR_CONFIG.fonts.axis_title.size,
      tick: DEFAULT_BWR_CONFIG.fonts.tick.size,
      legend: DEFAULT_BWR_CONFIG.fonts.legend.size,
      annotation: DEFAULT_BWR_CONFIG.fonts.annotation.size,
      tableHeader: DEFAULT_BWR_CONFIG.fonts.table_header?.size || DEFAULT_BWR_CONFIG.fonts.title.size,
      tableCell: DEFAULT_BWR_CONFIG.fonts.table_cell?.size || DEFAULT_BWR_CONFIG.fonts.tick.size,
    },
  },
  
  // Layout
  layout: {
    width: DEFAULT_BWR_CONFIG.general.width,
    height: DEFAULT_BWR_CONFIG.general.height,
    margins: {
      left: DEFAULT_BWR_CONFIG.layout.margin_l,
      right: DEFAULT_BWR_CONFIG.layout.margin_r,
      top: DEFAULT_BWR_CONFIG.layout.margin_t_base,
      bottom: DEFAULT_BWR_CONFIG.layout.margin_b_min,
    },
  },
  
  // Grid and axes
  axes: {
    lineWidth: DEFAULT_BWR_CONFIG.axes.linewidth,
    gridWidth: DEFAULT_BWR_CONFIG.axes.gridwidth,
    tickWidth: DEFAULT_BWR_CONFIG.axes.tickwidth,
    zerolineWidth: DEFAULT_BWR_CONFIG.axes.zerolinewidth,
    spikeThickness: DEFAULT_BWR_CONFIG.axes.spikethickness,
  },
  
  // Chart-specific
  charts: {
    scatter: {
      lineWidth: DEFAULT_BWR_CONFIG.plot_specific.scatter.line_width,
      lineSmoothing: DEFAULT_BWR_CONFIG.plot_specific.scatter.line_smoothing,
    },
    bar: {
      gap: DEFAULT_BWR_CONFIG.plot_specific.bar.bargap,
      groupGap: DEFAULT_BWR_CONFIG.plot_specific.multi_bar.bargroupgap,
    },
  },
} as const;

// CSS variable generator for use in stylesheets
export function generateCSSVariables(): string {
  return `
    /* BWR Theme Variables */
    :root {
      /* Colors */
      --bwr-background: ${theme.colors.background};
      --bwr-primary: ${theme.colors.primary};
      --bwr-text-primary: ${theme.colors.text.primary};
      --bwr-text-secondary: ${theme.colors.text.secondary};
      --bwr-text-annotation: ${theme.colors.text.annotation};
      --bwr-grid: ${theme.colors.grid};
      
      /* Typography */
      --bwr-font-normal: ${theme.typography.fontFamily.normal};
      --bwr-font-bold: ${theme.typography.fontFamily.bold};
      --bwr-font-size-title: ${theme.typography.fontSize.title}px;
      --bwr-font-size-subtitle: ${theme.typography.fontSize.subtitle}px;
      --bwr-font-size-axis-title: ${theme.typography.fontSize.axisTitle}px;
      --bwr-font-size-tick: ${theme.typography.fontSize.tick}px;
      --bwr-font-size-legend: ${theme.typography.fontSize.legend}px;
      --bwr-font-size-annotation: ${theme.typography.fontSize.annotation}px;
      
      /* Layout */
      --bwr-width: ${theme.layout.width}px;
      --bwr-height: ${theme.layout.height}px;
      --bwr-margin-left: ${theme.layout.margins.left}px;
      --bwr-margin-right: ${theme.layout.margins.right}px;
      --bwr-margin-top: ${theme.layout.margins.top}px;
      --bwr-margin-bottom: ${theme.layout.margins.bottom}px;
      
      /* Axes */
      --bwr-line-width: ${theme.axes.lineWidth}px;
      --bwr-grid-width: ${theme.axes.gridWidth}px;
      --bwr-tick-width: ${theme.axes.tickWidth}px;
      --bwr-zeroline-width: ${theme.axes.zerolineWidth}px;
      --bwr-spike-thickness: ${theme.axes.spikeThickness}px;
    }
  `;
}