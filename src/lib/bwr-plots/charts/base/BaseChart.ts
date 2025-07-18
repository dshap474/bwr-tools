// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Base Chart Class - Foundation for all BWR chart implementations                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRConfig } from '../../config/config-types';
import { BWRPlotSpec } from '../../types';
import { DataFrame } from '../../data/DataFrame';
import { validateChartData } from '../../data/processors';

export abstract class BaseChart {
  protected data: DataFrame;
  protected config: BWRConfig;
  protected options: any;
  protected validationResult: any;

  constructor(args: any, config: BWRConfig) {
    console.log('[BaseChart] Constructor called with:', {
      hasArgs: !!args,
      hasData: !!args?.data,
      dataType: args?.data?.constructor?.name,
      hasConfig: !!config
    });
    
    this.config = config;
    this.options = this.parseOptions(args);
    this.data = this.processData(args.data);
    this.validationResult = this.validateData();
    
    console.log('[BaseChart] Constructor finished:', {
      hasData: !!this.data,
      dataShape: this.data?.shape,
      dataColumns: this.data?.columns
    });
  }

  /**
   * Generate the complete Plotly specification
   */
  abstract generate(): BWRPlotSpec;

  /**
   * Create Plotly traces for this chart type
   */
  protected abstract createTraces(): any[];

  /**
   * Create Plotly layout for this chart type
   */
  protected abstract createLayout(): any;

  /**
   * Process and validate input data
   */
  protected processData(data: any): DataFrame {
    console.log('[BaseChart.processData] Processing data:', {
      dataType: data?.constructor?.name,
      isDataFrame: data instanceof DataFrame,
      hasData: !!data
    });

    if (data instanceof DataFrame) {
      return data.copy();
    }
    
    if (typeof data === 'object' && data !== null) {
      return new DataFrame(data);
    }
    
    throw new Error('Data must be a DataFrame or object with column arrays');
  }

  /**
   * Parse and validate chart options
   */
  protected parseOptions(args: any): any {
    const defaults = {
      title: '',
      subtitle: '',
      source: '',
      prefix: '',
      suffix: '',
      x_axis_title: '',
      y_axis_title: '',
      save_image: false,
      open_in_browser: false,
      xaxis_is_date: true,
      opacity: 1.0
    };

    return { ...defaults, ...args };
  }

  /**
   * Validate chart data
   */
  protected validateData(): any {
    const requiredColumns = this.getRequiredColumns();
    return validateChartData(this.data, requiredColumns);
  }

  /**
   * Get required columns for this chart type
   */
  protected getRequiredColumns(): string[] {
    return []; // Override in subclasses
  }

  /**
   * Get Plotly configuration object
   */
  protected getPlotlyConfig(): any {
    return {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      responsive: true,
      toImageButtonOptions: {
        format: 'png',
        filename: 'bwr-plot',
        height: this.config.general.height,
        width: this.config.general.width,
        scale: 1
      }
    };
  }

  /**
   * Create base layout structure shared by all charts
   */
  protected getBaseLayout(): any {
    const { general, colors, fonts, layout } = this.config;
    
    return {
      width: general.width,
      height: general.height,
      
      // Background
      paper_bgcolor: colors.background_color,
      plot_bgcolor: colors.background_color,
      
      // Title
      title: this.options.title ? {
        text: this.options.title,
        font: {
          family: fonts.normal_family,
          size: fonts.title.size,
          color: fonts.title.color
        },
        x: layout.title_x,
        y: 0.95,
        xanchor: 'left',
        yanchor: 'top'
      } : undefined,
      
      // Margins
      margin: {
        l: layout.margin_l,
        r: layout.margin_r,
        t: layout.margin_t_base,
        b: layout.margin_b_min
      },
      
      // Hover
      hovermode: layout.hovermode,
      hoverdistance: layout.hoverdistance,
      spikedistance: layout.spikedistance,
      
      // Font defaults
      font: {
        family: fonts.normal_family,
        color: fonts.tick.color,
        size: fonts.tick.size
      },
      
      // Annotations array (will be populated by subclasses)
      annotations: [],
      
      // Images array (will be populated by subclasses)
      images: []
    };
  }

  /**
   * Create annotations (subtitle, source, watermark text)
   */
  protected createAnnotations(): any[] {
    const annotations = [];
    const { fonts, annotations: annotationConfig } = this.config;

    // Add subtitle if provided
    if (this.options.subtitle) {
      annotations.push({
        text: this.options.subtitle,
        font: {
          family: fonts.normal_family,
          size: fonts.subtitle.size,
          color: fonts.subtitle.color
        },
        x: this.config.layout.title_x,
        y: 0.88,
        xanchor: 'left',
        yanchor: 'top',
        showarrow: false
      });
    }

    // Add source annotation
    if (this.options.source) {
      let sourceText = `<b>Source: ${this.options.source}</b>`;
      
      // Handle date override like Python
      if (this.options.date_override) {
        sourceText = `<b>Data as of ${this.options.date_override} | Source: ${this.options.source}</b>`;
      }

      annotations.push({
        text: sourceText,
        font: {
          family: fonts.normal_family,
          size: annotationConfig.annotation_font_size,
          color: annotationConfig.annotation_color
        },
        x: annotationConfig.source_x,
        y: annotationConfig.source_y,
        xanchor: annotationConfig.source_anchor,
        yanchor: 'top',
        showarrow: false
      });
    }

    return annotations;
  }

  /**
   * Create images (background, watermark)
   */
  protected createImages(): any[] {
    const images = [];
    const { watermark } = this.config;

    // Add background image if enabled for this chart type
    const chartSpecific = this.getChartSpecificConfig();
    if (chartSpecific && chartSpecific.use_background_image && this.getBackgroundImageData()) {
      images.push({
        source: this.getBackgroundImageData(),
        x: 0,
        y: 1,
        xref: 'paper',
        yref: 'paper',
        sizex: 1,
        sizey: 1,
        xanchor: 'left',
        yanchor: 'top',
        layer: 'below'
      });
    }

    // Add watermark if enabled
    if (watermark.default_use && this.getWatermarkData()) {
      images.push({
        source: this.getWatermarkData(),
        x: watermark.chart_x,
        y: watermark.chart_y,
        xref: 'paper',
        yref: 'paper',
        sizex: watermark.chart_sizex,
        sizey: watermark.chart_sizey,
        xanchor: watermark.chart_xanchor,
        yanchor: 'top',
        layer: watermark.chart_layer,
        opacity: watermark.chart_opacity
      });
    }

    return images;
  }

  /**
   * Get chart-specific configuration
   */
  protected abstract getChartSpecificConfig(): any;

  /**
   * Get watermark data (to be overridden by concrete implementations)
   */
  protected getWatermarkData(): string | null {
    return null;
  }

  /**
   * Get background image data (to be overridden by concrete implementations)
   */
  protected getBackgroundImageData(): string | null {
    return null;
  }

  /**
   * Create X-axis configuration
   */
  protected createXAxisConfig(): any {
    const { axes, fonts } = this.config;
    
    const xaxis: any = {
      color: fonts.tick.color,
      gridcolor: axes.gridcolor,
      zerolinecolor: axes.zerolinecolor,
      showgrid: axes.showgrid_x,
      showline: axes.showline,
      linecolor: axes.linecolor,
      linewidth: axes.linewidth,
      tickfont: {
        family: fonts.normal_family,
        size: fonts.tick.size,
        color: fonts.tick.color
      }
    };

    // Add title if provided
    if (this.options.x_axis_title) {
      xaxis.title = {
        text: this.options.x_axis_title,
        font: {
          family: fonts.normal_family,
          size: fonts.axis_title.size,
          color: fonts.axis_title.color
        }
      };
    }

    // Handle date formatting
    if (this.options.xaxis_is_date) {
      xaxis.type = 'date';
    } else if (axes.x_numeric_tickformat) {
      xaxis.tickformat = axes.x_numeric_tickformat;
    }

    return xaxis;
  }

  /**
   * Create Y-axis configuration with auto-scaling
   */
  protected createYAxisConfig(): any {
    const { axes, fonts } = this.config;
    
    const yaxis: any = {
      color: fonts.tick.color,
      gridcolor: axes.gridcolor,
      zerolinecolor: axes.zerolinecolor,
      showgrid: axes.showgrid_y,
      showline: axes.showline,
      linecolor: axes.linecolor,
      linewidth: axes.linewidth,
      tickfont: {
        family: fonts.normal_family,
        size: fonts.tick.size,
        color: fonts.tick.color
      }
    };

    // Add title if provided
    if (this.options.y_axis_title) {
      yaxis.title = {
        text: this.options.y_axis_title,
        font: {
          family: fonts.normal_family,
          size: fonts.axis_title.size,
          color: fonts.axis_title.color
        }
      };
    }

    // Apply auto-scaling with K/M/B suffixes
    this.applyAutoScaling(yaxis);

    return yaxis;
  }

  /**
   * Apply auto-scaling to Y-axis (K/M/B suffixes)
   * Replicates Python auto-scaling logic
   */
  protected applyAutoScaling(yaxis: any): void {
    // Get max value from numeric data
    const numericCols = this.data.selectDtypes(['number']).columns;
    let maxValue = 0;
    
    numericCols.forEach(col => {
      const values = this.data.getColumn(col).values.filter(v => v != null && !isNaN(v));
      const colMax = Math.max(...values);
      if (colMax > maxValue) {
        maxValue = colMax;
      }
    });

    // Apply scaling based on magnitude
    if (maxValue >= 1e9) {
      yaxis.tickformat = '.2s'; // Will show as 1.0B, 2.5B, etc.
    } else if (maxValue >= 1e6) {
      yaxis.tickformat = '.2s'; // Will show as 1.0M, 2.5M, etc.
    } else if (maxValue >= 1e3) {
      yaxis.tickformat = '.2s'; // Will show as 1.0K, 2.5K, etc.
    } else {
      yaxis.tickformat = '.2f';
    }

    // Add prefix/suffix if provided
    if (this.options.prefix || this.options.suffix) {
      const prefix = this.options.prefix || '';
      const suffix = this.options.suffix || '';
      yaxis.tickprefix = prefix;
      yaxis.ticksuffix = suffix;
    }
  }

  /**
   * Extend color palette to match required length
   * Exact replication of Python logic
   */
  protected extendPalette(palette: string[], numColors: number): string[] {
    if (palette.length === 0) {
      return Array(numColors).fill('#5637cd'); // Default color
    }
    
    if (palette.length >= numColors) {
      return palette.slice(0, numColors);
    }
    
    // Repeat palette to match required length
    const extended = [...palette];
    while (extended.length < numColors) {
      extended.push(...palette);
    }
    
    return extended.slice(0, numColors);
  }
}