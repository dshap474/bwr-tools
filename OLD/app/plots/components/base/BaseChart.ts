// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Base Chart Class                                                                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRConfig, DEFAULT_BWR_CONFIG } from '../../../../lib/config';
import { BWRPlotSpec } from '../../../../../lib/plotly-wrapper';
import { DataFrame } from '../../lib';
import { validateChartData, detectDataTypes, DataValidationResult } from '../utils/chart-utils';

export interface ChartOptions {
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  config?: Partial<BWRConfig>;
  showLegend?: boolean;
  showWatermark?: boolean;
}

export interface ChartData {
  dataframe: DataFrame;
  xColumn?: string;
  yColumns: string[];
  colorColumn?: string;
  sizeColumn?: string;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'html';
  filename?: string;
  width?: number;
  height?: number;
  scale?: number;
}

export abstract class BaseChart {
  protected config: BWRConfig;
  protected data: ChartData;
  protected options: ChartOptions;
  protected validationResult: DataValidationResult;
  protected plotlyConfig: BWRPlotSpec | null = null;

  constructor(data: ChartData, options: ChartOptions = {}) {
    this.data = data;
    this.options = options;
    this.config = this.mergeConfigs(options.config);
    this.validationResult = this.validateData();
  }

  private mergeConfigs(customConfig?: Partial<BWRConfig>): BWRConfig {
    return {
      general: { ...DEFAULT_BWR_CONFIG.general, ...customConfig?.general },
      colors: { ...DEFAULT_BWR_CONFIG.colors, ...customConfig?.colors },
      fonts: { ...DEFAULT_BWR_CONFIG.fonts, ...customConfig?.fonts },
      layout: { ...DEFAULT_BWR_CONFIG.layout, ...customConfig?.layout },
      watermark: { ...DEFAULT_BWR_CONFIG.watermark, ...customConfig?.watermark },
      legend: { ...DEFAULT_BWR_CONFIG.legend, ...customConfig?.legend },
      annotations: { ...DEFAULT_BWR_CONFIG.annotations, ...customConfig?.annotations },
      axes: { ...DEFAULT_BWR_CONFIG.axes, ...customConfig?.axes },
      plot_specific: { ...DEFAULT_BWR_CONFIG.plot_specific, ...customConfig?.plot_specific },
    };
  }

  private validateData(): DataValidationResult {
    const result = validateChartData(this.data.dataframe, {
      requiredColumns: [
        this.data.xColumn,
        ...this.data.yColumns,
        this.data.colorColumn,
        this.data.sizeColumn
      ].filter(Boolean) as string[]
    });

    if (!result.isValid) {
      console.warn('Chart data validation warnings:', result.warnings);
      if (result.errors.length > 0) {
        throw new Error(`Chart data validation errors: ${result.errors.join(', ')}`);
      }
    }

    return result;
  }

  protected abstract generatePlotlyConfig(): BWRPlotSpec;

  protected getBaseLayout() {
    const { general, colors, fonts, layout } = this.config;
    
    return {
      width: this.options.width || general.width,
      height: this.options.height || general.height,
      paper_bgcolor: colors.background_color,
      plot_bgcolor: colors.background_color,
      font: {
        family: fonts.normal_family,
        color: fonts.title.color,
        size: fonts.title.size
      },
      title: this.options.title ? {
        text: this.options.title,
        font: {
          size: fonts.title.size,
          color: fonts.title.color
        },
        x: layout.title_x,
        y: 0.95,
        xanchor: 'center',
        yanchor: 'top'
      } : undefined,
      annotations: this.createAnnotations(),
      margin: {
        l: layout.margin_l,
        r: layout.margin_r,
        t: layout.margin_t_base,
        b: layout.margin_b_min
      },
      showlegend: this.options.showLegend !== false,
      legend: {
        font: {
          size: fonts.legend.size,
          color: fonts.legend.color
        },
        bgcolor: 'rgba(0,0,0,0)',
        bordercolor: 'rgba(0,0,0,0)'
      },
      hovermode: layout.hovermode
    };
  }

  private createAnnotations() {
    const annotations = [];

    // Add subtitle if provided
    if (this.options.subtitle) {
      annotations.push({
        text: this.options.subtitle,
        font: {
          size: this.config.fonts.subtitle.size,
          color: this.config.fonts.subtitle.color
        },
        x: 0.5,
        y: 0.88,
        xanchor: 'center',
        yanchor: 'top',
        showarrow: false
      });
    }

    // Add watermarks if enabled
    if (this.options.showWatermark !== false && this.config.watermark.default_use) {
      // Get the selected watermark text
      const selectedWatermark = this.config.watermark.available_watermarks[this.config.watermark.selected_watermark_key];
      
      if (selectedWatermark) {
        annotations.push({
          text: selectedWatermark,
          font: {
            size: this.config.fonts.annotation.size,
            color: this.config.fonts.annotation.color
          },
          x: this.config.watermark.chart_x,
          y: this.config.watermark.chart_y,
          xanchor: this.config.watermark.chart_xanchor,
          yanchor: 'bottom',
          showarrow: false,
          opacity: this.config.watermark.chart_opacity
        });
      }
    }

    return annotations;
  }

  protected getAxisConfig(axisData: number[], isYAxis: boolean = false) {
    const { axes, fonts } = this.config;
    
    return {
      color: fonts.tick.color,
      gridcolor: axes.gridcolor,
      zerolinecolor: axes.zerolinecolor,
      showgrid: isYAxis ? axes.showgrid_y : axes.showgrid_x,
      showline: axes.showline,
      linecolor: axes.linecolor,
      linewidth: axes.linewidth,
      tickfont: {
        size: fonts.tick.size,
        color: fonts.tick.color
      },
      titlefont: {
        size: fonts.axis_title.size,
        color: fonts.axis_title.color
      }
    };
  }

  public getPlotlyConfig(): BWRPlotSpec {
    if (!this.plotlyConfig) {
      this.plotlyConfig = this.generatePlotlyConfig();
    }
    return this.plotlyConfig;
  }

  public render(): BWRPlotSpec {
    return this.getPlotlyConfig();
  }

  public async export(options: ExportOptions): Promise<string | Blob> {
    const plotlyConfig = this.getPlotlyConfig();
    
    // This would integrate with Plotly export functionality
    // For now, return the config as JSON for HTML export
    if (options.format === 'html') {
      return JSON.stringify(plotlyConfig, null, 2);
    }
    
    throw new Error(`Export format ${options.format} not yet implemented`);
  }

  public updateData(newData: Partial<ChartData>): void {
    this.data = { ...this.data, ...newData };
    this.validationResult = this.validateData();
    this.plotlyConfig = null; // Force regeneration
  }

  public updateOptions(newOptions: Partial<ChartOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.config = this.mergeConfigs(newOptions.config);
    this.plotlyConfig = null; // Force regeneration
  }

  public getDataInfo() {
    return {
      shape: this.data.dataframe.shape,
      columns: this.data.dataframe.columns,
      dtypes: this.data.dataframe.dtypes,
      validation: this.validationResult,
      dataTypes: detectDataTypes(this.data.dataframe, this.data.xColumn, this.data.yColumns)
    };
  }

  public isValid(): boolean {
    return this.validationResult.isValid;
  }

  public getValidationErrors(): string[] {
    return this.validationResult.errors;
  }

  public getValidationWarnings(): string[] {
    return this.validationResult.warnings;
  }
}