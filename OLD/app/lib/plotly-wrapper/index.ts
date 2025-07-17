// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plotly Wrapper Package Exports                                                      │
// └────────────────────────────────────────────────────────────────────────────────────┘

// Export types
export * from './types';

// Export Plotly instance management
export {
  getPlotlyInstance,
  isPlotlyLoaded,
  preloadPlotly,
  getPlotlyVersion,
  resetPlotlyInstance,
} from './plotly-instance';

// Export builders
export {
  buildBaseLayout,
  addTitles,
  addSourceAnnotation,
  addBackgroundImage,
  addWatermark,
  buildAxisConfig,
  buildCompleteLayout,
} from './builders/layout';

// Export renderers
export {
  renderPlot,
  updatePlot,
  exportPlot,
  clearPlot,
  resizePlot,
  getPlotState,
} from './renderers';

// Export a convenience function for creating a complete plot
import type { BWRConfig } from '../../../lib/config';
import type { BWRPlotlyData } from './types';
import { buildCompleteLayout } from './builders/layout';
import { renderPlot } from './renderers';

export interface CreatePlotOptions {
  element: HTMLElement | string;
  data: BWRPlotlyData[];
  config: BWRConfig;
  title?: string;
  subtitle?: string;
  source?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  showBackground?: boolean;
  showWatermark?: boolean;
}

/**
 * Convenience function to create a complete BWR plot
 */
export async function createBWRPlot(options: CreatePlotOptions): Promise<void> {
  const {
    element,
    data,
    config,
    title,
    subtitle,
    source,
    xAxisTitle,
    yAxisTitle,
    showBackground = true,
    showWatermark = true,
  } = options;
  
  const layout = buildCompleteLayout(config, {
    title,
    subtitle,
    source,
    xAxisTitle,
    yAxisTitle,
    showBackground,
    showWatermark,
  });
  
  await renderPlot(element, data, layout);
}