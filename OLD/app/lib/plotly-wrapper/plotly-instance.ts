// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plotly Instance Manager                                                             │
// └────────────────────────────────────────────────────────────────────────────────────┘

import type { PlotlyModule } from 'plotly.js-dist-min';

// Singleton instance of Plotly
let plotlyInstance: PlotlyModule | null = null;

/**
 * Get or initialize the Plotly instance
 * Uses dynamic import to enable code splitting
 */
export async function getPlotlyInstance(): Promise<PlotlyModule> {
  if (!plotlyInstance) {
    // Dynamic import for better code splitting
    const Plotly = await import('plotly.js-dist-min');
    plotlyInstance = Plotly.default || Plotly;
  }
  return plotlyInstance;
}

/**
 * Check if Plotly is loaded
 */
export function isPlotlyLoaded(): boolean {
  return plotlyInstance !== null;
}

/**
 * Preload Plotly library
 * Useful for warming up the module before actual use
 */
export async function preloadPlotly(): Promise<void> {
  await getPlotlyInstance();
}

/**
 * Get Plotly version information
 */
export async function getPlotlyVersion(): Promise<string> {
  const Plotly = await getPlotlyInstance();
  return (Plotly as any).version || 'unknown';
}

/**
 * Reset the Plotly instance (mainly for testing)
 */
export function resetPlotlyInstance(): void {
  plotlyInstance = null;
}