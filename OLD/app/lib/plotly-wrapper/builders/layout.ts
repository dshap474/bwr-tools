// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Layout Builder                                                                      │
// └────────────────────────────────────────────────────────────────────────────────────┘

import type { BWRConfig } from '../../../lib/config';
import type { BWRPlotlyLayout, AxisConfig, HoverConfig } from '../types';

/**
 * Build the base layout configuration from BWR config
 */
export function buildBaseLayout(config: BWRConfig): BWRPlotlyLayout {
  const { general, layout, fonts, colors, legend, annotations } = config;
  
  const baseLayout: BWRPlotlyLayout = {
    // Dimensions
    width: general.width,
    height: general.height,
    
    // Margins
    margin: {
      l: layout.margin_l,
      r: layout.margin_r,
      t: layout.margin_t_base,
      b: layout.margin_b_min + layout.plot_area_b_padding,
      pad: 0,
    },
    
    // Background
    paper_bgcolor: colors.background_color,
    plot_bgcolor: colors.background_color,
    
    // Template
    template: general.template as any,
    
    // Hover configuration
    hovermode: layout.hovermode as any,
    hoverdistance: layout.hoverdistance,
    
    // Legend
    showlegend: true,
    legend: {
      bgcolor: legend.bgcolor,
      bordercolor: legend.bordercolor,
      borderwidth: legend.borderwidth,
      font: {
        family: legend.font_family,
        size: legend.font_size,
        color: legend.font_color,
      },
      orientation: legend.orientation,
      yanchor: legend.yanchor,
      y: legend.y,
      xanchor: legend.xanchor,
      x: legend.x,
      title: {
        text: legend.title,
      },
      itemsizing: legend.itemsizing,
      itemwidth: legend.itemwidth,
      traceorder: legend.traceorder as any,
    },
    
    // Font defaults
    font: {
      family: fonts.normal_family,
      size: fonts.tick.size,
      color: fonts.tick.color,
    },
  };
  
  return baseLayout;
}

/**
 * Add title and subtitle to layout
 */
export function addTitles(
  layout: BWRPlotlyLayout,
  config: BWRConfig,
  title?: string,
  subtitle?: string
): BWRPlotlyLayout {
  const { fonts, layout: layoutConfig } = config;
  
  if (!title) return layout;
  
  // Combine title and subtitle if both exist
  const titleText = subtitle ? `${title}<br><sub>${subtitle}</sub>` : title;
  
  return {
    ...layout,
    title: {
      text: titleText,
      font: {
        family: fonts.bold_family,
        size: fonts.title.size,
        color: fonts.title.color,
      },
      x: layoutConfig.title_x,
      y: 0.98,
      xanchor: 'left',
      yanchor: 'top',
      pad: {
        t: layoutConfig.title_padding,
      },
    },
  };
}

/**
 * Add source annotation to layout
 */
export function addSourceAnnotation(
  layout: BWRPlotlyLayout,
  config: BWRConfig,
  source?: string,
  sourceX?: number,
  sourceY?: number
): BWRPlotlyLayout {
  if (!source) return layout;
  
  const { fonts, annotations: annotConfig } = config;
  
  const annotation = {
    text: `Source: ${source}`,
    showarrow: annotConfig.showarrow,
    x: sourceX ?? annotConfig.default_source_x,
    y: sourceY ?? annotConfig.default_source_y,
    xref: 'paper' as const,
    yref: 'paper' as const,
    xanchor: annotConfig.xanchor,
    yanchor: annotConfig.yanchor,
    font: {
      family: fonts.normal_family,
      size: fonts.annotation.size,
      color: fonts.annotation.color,
    },
  };
  
  return {
    ...layout,
    annotations: [...(layout.annotations || []), annotation],
  };
}

/**
 * Add background image to layout
 */
export function addBackgroundImage(
  layout: BWRPlotlyLayout,
  config: BWRConfig,
  imagePath?: string
): BWRPlotlyLayout {
  const path = imagePath || config.general.background_image_path;
  
  if (!path) return layout;
  
  const image = {
    source: path,
    xref: 'paper' as const,
    yref: 'paper' as const,
    x: 0,
    y: 1,
    sizex: 1,
    sizey: 1,
    sizing: 'stretch' as const,
    opacity: 1,
    layer: 'below' as const,
  };
  
  return {
    ...layout,
    images: [image],
  };
}

/**
 * Add watermark to layout
 */
export function addWatermark(
  layout: BWRPlotlyLayout,
  config: BWRConfig,
  showWatermark: boolean = true
): BWRPlotlyLayout {
  const { watermark } = config;
  
  if (!showWatermark || !watermark.default_use) return layout;
  
  const watermarkPath = watermark.available_watermarks[watermark.selected_watermark_key];
  if (!watermarkPath) return layout;
  
  const watermarkImage = {
    source: watermarkPath,
    xref: 'paper' as const,
    yref: 'paper' as const,
    x: watermark.chart_x,
    y: watermark.chart_y,
    sizex: watermark.chart_sizex,
    sizey: watermark.chart_sizey,
    sizing: 'contain' as const,
    opacity: watermark.chart_opacity,
    layer: watermark.chart_layer,
    xanchor: watermark.chart_xanchor,
  };
  
  return {
    ...layout,
    images: [...(layout.images || []), watermarkImage],
  };
}

/**
 * Build axis configuration
 */
export function buildAxisConfig(
  config: BWRConfig,
  axisType: 'x' | 'y',
  options?: Partial<AxisConfig>
): AxisConfig {
  const { axes, fonts } = config;
  
  const baseConfig: AxisConfig = {
    // Grid
    showgrid: axisType === 'x' ? axes.showgrid_x : axes.showgrid_y,
    gridcolor: axisType === 'x' ? axes.x_gridcolor : axes.y_gridcolor,
    gridwidth: axes.gridwidth,
    
    // Line
    showline: axes.showline,
    linecolor: axes.linecolor,
    linewidth: axes.linewidth,
    
    // Zero line
    zeroline: axes.zeroline,
    zerolinecolor: axes.zerolinecolor,
    zerolinewidth: axes.zerolinewidth,
    
    // Ticks
    ticks: axes.ticks as any,
    ticklen: axisType === 'x' ? axes.x_ticklen : 6,
    tickwidth: axes.tickwidth,
    tickcolor: axes.tickcolor,
    showticklabels: true,
    tickfont: {
      family: fonts.normal_family,
      size: fonts.tick.size,
      color: fonts.tick.color,
    },
    
    // Spikes
    showspikes: axes.showspikes,
    spikecolor: axes.spikecolor,
    spikethickness: axes.spikethickness,
    spikedash: axes.spikedash,
    spikemode: axes.spikemode,
    
    // Title
    title: {
      text: '',
      font: {
        family: fonts.normal_family,
        size: axes.titlefont_size,
        color: axes.titlefont_color,
      },
    },
  };
  
  // Apply axis-specific defaults
  if (axisType === 'x') {
    baseConfig.nticks = axes.x_nticks;
    baseConfig.tickformat = axes.x_tickformat;
  }
  
  // Merge with provided options
  return { ...baseConfig, ...options };
}

/**
 * Build complete layout with all components
 */
export function buildCompleteLayout(
  config: BWRConfig,
  options: {
    title?: string;
    subtitle?: string;
    source?: string;
    sourceX?: number;
    sourceY?: number;
    xAxisTitle?: string;
    yAxisTitle?: string;
    xAxisOptions?: Partial<AxisConfig>;
    yAxisOptions?: Partial<AxisConfig>;
    secondaryYAxis?: Partial<AxisConfig>;
    showBackground?: boolean;
    showWatermark?: boolean;
    additionalLayout?: Partial<BWRPlotlyLayout>;
  }
): BWRPlotlyLayout {
  let layout = buildBaseLayout(config);
  
  // Add titles
  layout = addTitles(layout, config, options.title, options.subtitle);
  
  // Add source
  layout = addSourceAnnotation(layout, config, options.source, options.sourceX, options.sourceY);
  
  // Add background image if specified
  if (options.showBackground !== false) {
    layout = addBackgroundImage(layout, config);
  }
  
  // Add watermark
  layout = addWatermark(layout, config, options.showWatermark);
  
  // Configure axes
  const xAxis = buildAxisConfig(config, 'x', {
    title: { text: options.xAxisTitle || config.axes.x_title_text },
    ...options.xAxisOptions,
  });
  
  const yAxis = buildAxisConfig(config, 'y', {
    title: { text: options.yAxisTitle || config.axes.y_primary_title_text },
    tickformat: config.axes.y_primary_tickformat,
    tickprefix: config.axes.y_primary_tickprefix,
    ticksuffix: config.axes.y_primary_ticksuffix,
    range: config.axes.y_primary_range,
    ...options.yAxisOptions,
  });
  
  layout = {
    ...layout,
    xaxis: xAxis,
    yaxis: yAxis,
  };
  
  // Add secondary y-axis if provided
  if (options.secondaryYAxis) {
    layout.yaxis2 = {
      ...buildAxisConfig(config, 'y', options.secondaryYAxis),
      overlaying: 'y',
      side: 'right',
      anchor: 'x',
    };
  }
  
  // Merge any additional layout options
  if (options.additionalLayout) {
    layout = { ...layout, ...options.additionalLayout };
  }
  
  return layout;
}