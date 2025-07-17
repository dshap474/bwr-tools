// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Chart Export Utilities                                                              │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'html';
  filename?: string;
  width?: number;
  height?: number;
  scale?: number;
  imageDataOnly?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename?: string;
  error?: Error;
}

/**
 * Export a chart using Plotly's built-in export functionality
 */
export async function exportChart(
  plotlyElement: HTMLElement,
  plotlyInstance: any,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const {
      format,
      filename = 'bwr-chart',
      width = 1920,
      height = 1080,
      scale = 1,
      imageDataOnly = false
    } = options;

    if (!plotlyInstance) {
      throw new Error('Plotly instance not available');
    }

    switch (format) {
      case 'png':
        return await exportAsPNG(plotlyElement, plotlyInstance, {
          filename,
          width,
          height,
          scale,
          imageDataOnly
        });

      case 'svg':
        return await exportAsSVG(plotlyElement, plotlyInstance, {
          filename,
          width,
          height,
          imageDataOnly
        });

      case 'pdf':
        return await exportAsPDF(plotlyElement, plotlyInstance, {
          filename,
          width,
          height
        });

      case 'html':
        return await exportAsHTML(plotlyElement, plotlyInstance, {
          filename
        });

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Export failed')
    };
  }
}

/**
 * Export chart as PNG
 */
async function exportAsPNG(
  element: HTMLElement,
  Plotly: any,
  options: {
    filename: string;
    width: number;
    height: number;
    scale: number;
    imageDataOnly: boolean;
  }
): Promise<ExportResult> {
  try {
    if (options.imageDataOnly) {
      // Return image data URL
      const dataUrl = await Plotly.toImage(element, {
        format: 'png',
        width: options.width,
        height: options.height,
        scale: options.scale
      });
      
      return {
        success: true,
        data: dataUrl,
        filename: options.filename + '.png'
      };
    } else {
      // Download the image
      await Plotly.downloadImage(element, {
        format: 'png',
        width: options.width,
        height: options.height,
        scale: options.scale,
        filename: options.filename
      });
      
      return {
        success: true,
        filename: options.filename + '.png'
      };
    }
  } catch (error) {
    throw new Error(`PNG export failed: ${error.message}`);
  }
}

/**
 * Export chart as SVG
 */
async function exportAsSVG(
  element: HTMLElement,
  Plotly: any,
  options: {
    filename: string;
    width: number;
    height: number;
    imageDataOnly: boolean;
  }
): Promise<ExportResult> {
  try {
    if (options.imageDataOnly) {
      // Return SVG string
      const svgString = await Plotly.toImage(element, {
        format: 'svg',
        width: options.width,
        height: options.height
      });
      
      return {
        success: true,
        data: svgString,
        filename: options.filename + '.svg'
      };
    } else {
      // Download the SVG
      await Plotly.downloadImage(element, {
        format: 'svg',
        width: options.width,
        height: options.height,
        filename: options.filename
      });
      
      return {
        success: true,
        filename: options.filename + '.svg'
      };
    }
  } catch (error) {
    throw new Error(`SVG export failed: ${error.message}`);
  }
}

/**
 * Export chart as PDF (requires additional setup)
 */
async function exportAsPDF(
  element: HTMLElement,
  Plotly: any,
  options: {
    filename: string;
    width: number;
    height: number;
  }
): Promise<ExportResult> {
  try {
    // Note: PDF export typically requires server-side rendering
    // or a library like jsPDF. For now, we'll export as PNG and
    // let the user convert it to PDF.
    
    console.warn('Direct PDF export not implemented. Exporting as PNG instead.');
    
    // Get PNG data
    const dataUrl = await Plotly.toImage(element, {
      format: 'png',
      width: options.width,
      height: options.height
    });
    
    // In a real implementation, you would:
    // 1. Use jsPDF or similar library
    // 2. Create a PDF document
    // 3. Add the image to the PDF
    // 4. Save the PDF
    
    return {
      success: true,
      data: dataUrl,
      filename: options.filename + '.png',
      error: new Error('PDF export not fully implemented')
    };
  } catch (error) {
    throw new Error(`PDF export failed: ${error.message}`);
  }
}

/**
 * Export chart as standalone HTML
 */
async function exportAsHTML(
  element: HTMLElement,
  Plotly: any,
  options: {
    filename: string;
  }
): Promise<ExportResult> {
  try {
    // Get the current plot data and layout
    const plotData = element.data;
    const plotLayout = element.layout;
    const plotConfig = element.config || {};
    
    // Create standalone HTML
    const html = createStandaloneHTML({
      data: plotData,
      layout: plotLayout,
      config: plotConfig,
      title: options.filename
    });
    
    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      filename: options.filename + '.html'
    };
  } catch (error) {
    throw new Error(`HTML export failed: ${error.message}`);
  }
}

/**
 * Create standalone HTML with embedded Plotly
 */
function createStandaloneHTML(spec: {
  data: any;
  layout: any;
  config: any;
  title: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${spec.title}</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #plot {
            width: 100vw;
            height: 100vh;
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
        
        // Make responsive
        window.addEventListener('resize', () => {
            Plotly.Plots.resize('plot');
        });
    </script>
</body>
</html>`;
}

/**
 * Utility to convert data URL to Blob
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Utility to download a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get suggested filename based on chart type and timestamp
 */
export function getSuggestedFilename(
  chartType: string,
  format: string,
  prefix = 'bwr'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}-${chartType}-${timestamp}.${format}`;
}