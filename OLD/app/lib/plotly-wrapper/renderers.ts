// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plot Renderers                                                                      │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { getPlotlyInstance } from './plotly-instance';
import type { 
  BWRPlotSpec, 
  PlotRenderOptions, 
  PlotExportOptions,
  BWRPlotlyData,
  BWRPlotlyLayout,
  BWRPlotlyConfig
} from './types';

/**
 * Default render options
 */
const DEFAULT_RENDER_OPTIONS: PlotRenderOptions = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['sendDataToCloud', 'select2d', 'lasso2d'],
};

/**
 * Default config options
 */
const DEFAULT_CONFIG: BWRPlotlyConfig = {
  displaylogo: false,
  modeBarButtonsToRemove: ['sendDataToCloud'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'bwr_plot',
    height: 1080,
    width: 1920,
    scale: 2,
  },
};

/**
 * Render a plot to a DOM element
 */
export async function renderPlot(
  element: HTMLElement | string,
  data: BWRPlotlyData[],
  layout: BWRPlotlyLayout,
  config?: BWRPlotlyConfig,
  options?: PlotRenderOptions
): Promise<void> {
  const Plotly = await getPlotlyInstance();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const mergedOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  
  // Apply render options to config
  if (mergedOptions.displayModeBar !== undefined) {
    mergedConfig.displayModeBar = mergedOptions.displayModeBar;
  }
  if (mergedOptions.displaylogo !== undefined) {
    mergedConfig.displaylogo = mergedOptions.displaylogo;
  }
  if (mergedOptions.modeBarButtonsToRemove) {
    mergedConfig.modeBarButtonsToRemove = mergedOptions.modeBarButtonsToRemove;
  }
  if (mergedOptions.modeBarButtonsToAdd) {
    mergedConfig.modeBarButtonsToAdd = mergedOptions.modeBarButtonsToAdd;
  }
  
  // Set responsive in config
  mergedConfig.responsive = mergedOptions.responsive;
  
  // Get element if string ID provided
  const plotElement = typeof element === 'string' 
    ? document.getElementById(element)
    : element;
    
  if (!plotElement) {
    throw new Error(`Element not found: ${element}`);
  }
  
  // Render the plot
  await Plotly.newPlot(plotElement, data, layout, mergedConfig);
}

/**
 * Update an existing plot
 */
export async function updatePlot(
  element: HTMLElement | string,
  data?: BWRPlotlyData[],
  layout?: BWRPlotlyLayout,
  config?: BWRPlotlyConfig
): Promise<void> {
  const Plotly = await getPlotlyInstance();
  
  const plotElement = typeof element === 'string' 
    ? document.getElementById(element)
    : element;
    
  if (!plotElement) {
    throw new Error(`Element not found: ${element}`);
  }
  
  if (data && layout) {
    await Plotly.react(plotElement, data, layout, config);
  } else if (layout) {
    await Plotly.relayout(plotElement, layout);
  } else if (data) {
    // Update data only
    const update = { data };
    await Plotly.update(plotElement, update);
  }
}

/**
 * Export a plot to various formats
 */
export async function exportPlot(
  element: HTMLElement | string,
  options: PlotExportOptions
): Promise<string | Blob> {
  const Plotly = await getPlotlyInstance();
  
  const plotElement = typeof element === 'string' 
    ? document.getElementById(element)
    : element;
    
  if (!plotElement) {
    throw new Error(`Element not found: ${element}`);
  }
  
  const { format, width, height, scale, filename, imageDataOnly } = options;
  
  if (format === 'html') {
    // Export as standalone HTML
    const plotlyElement = plotElement as any;
    const config = plotlyElement._fullLayout?._context || {};
    const data = plotlyElement._fullData || [];
    const layout = plotlyElement._fullLayout || {};
    
    const html = await generateStandaloneHTML({ data, layout, config });
    return html;
  } else {
    // Export as image
    const imageOptions = {
      format,
      width: width || 1920,
      height: height || 1080,
      scale: scale || 2,
      filename: filename || 'bwr_plot',
    };
    
    if (imageDataOnly) {
      // Return base64 data URL
      return await Plotly.toImage(plotElement, imageOptions);
    } else {
      // Download the image
      await Plotly.downloadImage(plotElement, imageOptions);
      return `Downloaded ${filename}.${format}`;
    }
  }
}

/**
 * Generate standalone HTML with embedded plot
 */
async function generateStandaloneHTML(spec: BWRPlotSpec): Promise<string> {
  const plotlyVersion = await getPlotlyVersion();
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BWR Plot</title>
    <script src="https://cdn.plot.ly/plotly-${plotlyVersion}.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #1A1A1A;
        }
        #plot {
            width: 800px;
            height: 400px;
            max-width: 100%;
            max-height: 100%;
        }
    </style>
</head>
<body>
    <div id="plot"></div>
    <script>
        const data = ${JSON.stringify(spec.data)};
        const layout = ${JSON.stringify(spec.layout)};
        const config = ${JSON.stringify(spec.config)};
        Plotly.newPlot('plot', data, layout, config);
    </script>
</body>
</html>`;
}

/**
 * Clear a plot
 */
export async function clearPlot(element: HTMLElement | string): Promise<void> {
  const Plotly = await getPlotlyInstance();
  
  const plotElement = typeof element === 'string' 
    ? document.getElementById(element)
    : element;
    
  if (!plotElement) {
    throw new Error(`Element not found: ${element}`);
  }
  
  Plotly.purge(plotElement);
}

/**
 * Resize a plot to fit its container
 */
export async function resizePlot(element: HTMLElement | string): Promise<void> {
  const Plotly = await getPlotlyInstance();
  
  const plotElement = typeof element === 'string' 
    ? document.getElementById(element)
    : element;
    
  if (!plotElement) {
    throw new Error(`Element not found: ${element}`);
  }
  
  await Plotly.Plots.resize(plotElement);
}

/**
 * Get plot data and layout from an element
 */
export async function getPlotState(
  element: HTMLElement | string
): Promise<{ data: BWRPlotlyData[]; layout: BWRPlotlyLayout }> {
  const plotElement = typeof element === 'string' 
    ? document.getElementById(element)
    : element;
    
  if (!plotElement) {
    throw new Error(`Element not found: ${element}`);
  }
  
  const plotlyElement = plotElement as any;
  
  return {
    data: plotlyElement._fullData || [],
    layout: plotlyElement._fullLayout || {},
  };
}

import { getPlotlyVersion } from './plotly-instance';