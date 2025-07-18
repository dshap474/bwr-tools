// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Stacked Bar Chart - Exact Port from Python implementation                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BaseChart } from './base/BaseChart';
import { BWRConfig } from '../config/config-types';
import { StackedBarArgs, BWRPlotSpec } from '../types';
import { DataFrame } from '../data/DataFrame';

export class StackedBarChart extends BaseChart {
  constructor(args: StackedBarArgs, config: BWRConfig) {
    super(args, config);
  }

  /**
   * Generate the complete Plotly specification
   */
  generate(): BWRPlotSpec {
    console.log('[StackedBarChart.generate] Starting generation with:', {
      hasData: !!this.data,
      dataType: this.data?.constructor?.name,
      dataShape: this.data?.shape,
      dataColumns: this.data?.columns,
      options: this.options
    });

    const traces = this.createTraces();
    const layout = this.createLayout();
    const config = this.getPlotlyConfig();

    console.log('[StackedBarChart.generate] Generated:', {
      tracesCount: traces.length,
      hasLayout: !!layout,
      hasConfig: !!config
    });

    return {
      data: traces,
      layout: layout,
      config: config
    };
  }

  /**
   * Create Plotly traces - EXACT replication of Python _add_stacked_bar_traces
   */
  protected createTraces(): any[] {
    if (!this.data || this.data.empty()) {
      console.warn('Warning: No data provided for stacked bar chart.');
      return [];
    }

    // Get only numeric columns (non-numeric can't be plotted) - exact Python logic
    const numericCols = this.data.selectDtypes(['number']).columns;

    if (numericCols.length === 0) {
      console.warn('Warning: No numeric columns found in data for stacked bar chart.');
      return [];
    }

    // Optionally sort columns by their sum values - exact Python logic
    let sortedCols = numericCols;
    if (this.options.sort_descending) {
      const sums = numericCols.map(col => ({
        column: col,
        sum: this.data.getColumn(col).sum()
      }));
      sums.sort((a, b) => b.sum - a.sum); // Descending
      sortedCols = sums.map(item => item.column);
    }

    // Set up color palette - exact Python logic
    const defaultPalette = this.config.colors.default_palette;
    const numColorsNeeded = numericCols.length;

    // Ensure palette is long enough, repeat if necessary - exact Python logic
    const extendedPalette = this.extendPalette(defaultPalette, numColorsNeeded);

    // Color assignment - exact Python logic
    const colorAssignments: Record<string, string> = {};
    numericCols.forEach((col, index) => {
      colorAssignments[col] = this.options.colors?.[col] || extendedPalette[index];
    });

    const traces: any[] = [];

    // Create bar traces in REVERSE order for proper stacking - exact Python logic
    const reversedCols = [...sortedCols].reverse();
    
    reversedCols.forEach(col => {
      const xValues = this.data.index.toArray();
      const yValues = this.data.getColumn(col).toArray();
      const color = colorAssignments[col];

      traces.push({
        type: 'bar',
        name: col,
        x: xValues,
        y: yValues,
        marker: {
          color: color,
          opacity: this.options.opacity || 1.0
        },
        showlegend: false, // Legend handled separately like Python
        hovertemplate: `<b>${col}</b><br>` +
                      `%{x}<br>` +
                      `%{y:,.0f}<br>` +
                      `<extra></extra>`,
      });
    });

    // Add legend traces separately - exact Python logic
    sortedCols.forEach(col => {
      const color = colorAssignments[col];
      
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: col,
        x: [null],
        y: [null],
        marker: {
          symbol: 'circle',
          size: 12,
          color: color
        },
        showlegend: true,
        hoverinfo: 'skip'
      });
    });

    return traces;
  }

  /**
   * Create Plotly layout - EXACT replication of Python layout logic
   */
  protected createLayout(): any {
    const baseLayout = this.getBaseLayout();
    
    // Stacked bar specific layout
    const layout = {
      ...baseLayout,
      
      // Stacked bar mode - exact Python setting
      barmode: 'stack',
      bargap: this.options.bargap || this.config.plot_specific.stacked_bar.bargap,
      
      // Axes configuration
      xaxis: this.createXAxisConfig(),
      yaxis: this.createYAxisConfig(),
      
      // Legend configuration - exact Python positioning
      legend: this.createLegendConfig(),
      
      // Annotations (subtitle, source) - exact Python logic
      annotations: this.createAnnotations(),
      
      // Images (background, watermark) - exact Python logic
      images: this.createImages()
    };

    return layout;
  }

  /**
   * Create legend configuration - exact Python logic
   */
  protected createLegendConfig(): any {
    const { legend: legendConfig, fonts } = this.config;
    
    return {
      bgcolor: legendConfig.bgcolor,
      bordercolor: legendConfig.bordercolor,
      borderwidth: legendConfig.borderwidth,
      font: {
        family: fonts.normal_family,
        size: fonts.legend.size,
        color: fonts.legend.color
      },
      orientation: legendConfig.orientation,
      yanchor: legendConfig.yanchor,
      y: legendConfig.y,
      x: legendConfig.x,
      xanchor: legendConfig.xanchor
    };
  }

  /**
   * Get chart-specific configuration
   */
  protected getChartSpecificConfig(): any {
    return this.config.plot_specific.stacked_bar;
  }

  /**
   * Get watermark data from parent BWRPlots instance
   */
  protected getWatermarkData(): string | null {
    // This will be injected by the BWRPlots class
    return (this as any)._watermark || null;
  }

  /**
   * Get background image data from parent BWRPlots instance
   */
  protected getBackgroundImageData(): string | null {
    // This will be injected by the BWRPlots class
    return (this as any)._backgroundImage || null;
  }

  /**
   * Get required columns for stacked bar chart
   */
  protected getRequiredColumns(): string[] {
    // Stacked bar chart requires at least one numeric column
    return [];
  }

  /**
   * Override parseOptions to handle stacked bar specific options
   */
  protected parseOptions(args: StackedBarArgs): any {
    const baseOptions = super.parseOptions(args);
    
    return {
      ...baseOptions,
      sort_descending: args.sort_descending || false,
      bargap: args.bargap || this.config.plot_specific.stacked_bar.bargap,
      opacity: args.opacity || this.config.plot_specific.stacked_bar.opacity,
      colors: args.colors || {},
      date_override: args.date_override || ''
    };
  }
}