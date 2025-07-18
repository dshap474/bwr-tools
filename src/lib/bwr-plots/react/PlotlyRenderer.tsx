// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Fixed Plotly Renderer - No Infinite Loops                                         │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { BWRPlotSpec } from '../types';

export interface PlotlyRendererProps {
  spec: BWRPlotSpec;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onRender?: () => void;
}

export function PlotlyRenderer({ 
  spec, 
  className = '',
  style,
  onError,
  onRender
}: PlotlyRendererProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // CRITICAL FIX: Properly memoize spec to prevent infinite re-renders
  const memoizedSpec = useMemo(() => {
    if (!spec) return null;
    
    const timestamp = new Date().toISOString();
    console.log(`[PlotlyRenderer] ${timestamp} Memoizing spec:`, {
      hasData: !!spec.data,
      dataLength: spec.data?.length,
      hasLayout: !!spec.layout,
      hasConfig: !!spec.config
    });
    
    return {
      data: spec.data || [],
      layout: spec.layout || {},
      config: spec.config || {}
    };
  }, [
    // Use JSON.stringify for deep comparison of complex objects
    // This ensures we only re-render when the actual content changes
    JSON.stringify(spec?.data || []),
    JSON.stringify(spec?.layout || {}),
    JSON.stringify(spec?.config || {})
  ]);

  // Stable error handler
  const handleError = useCallback((err: Error) => {
    const timestamp = new Date().toISOString();
    console.error(`[PlotlyRenderer] ${timestamp} Error:`, err);
    setError(err.message);
    setIsLoading(false);
    onError?.(err);
  }, [onError]);

  // Stable render success handler
  const handleRenderSuccess = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`[PlotlyRenderer] ${timestamp} Render success`);
    setIsReady(true);
    setIsLoading(false);
    setError(null);
    onRender?.();
  }, [onRender]);

  // CRITICAL FIX: Proper useEffect with stable dependencies and better mount handling
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[PlotlyRenderer] ${timestamp} useEffect triggered`, {
      hasSpec: !!memoizedSpec,
      hasRef: !!plotRef.current,
      isLoading,
      isReady
    });
    
    if (!memoizedSpec || !plotRef.current) {
      console.log(`[PlotlyRenderer] ${timestamp} Early return - no spec or ref`);
      return;
    }

    let mounted = true;
    let plotlyInstance: any = null;
    let renderTimeout: NodeJS.Timeout;

    const renderChart = async () => {
      const renderTimestamp = new Date().toISOString();
      console.log(`[PlotlyRenderer] ${renderTimestamp} renderChart called`, {
        hasRef: !!plotRef.current,
        mounted,
        specData: memoizedSpec?.data?.length,
        specLayout: !!memoizedSpec?.layout
      });
      
      if (!plotRef.current || !mounted) {
        console.log(`[PlotlyRenderer] ${renderTimestamp} Early return - no ref or not mounted`);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        console.log(`[PlotlyRenderer] ${renderTimestamp} Loading Plotly...`);
        const Plotly = await import('plotly.js-dist-min');
        plotlyInstance = Plotly;

        // Add a small delay to ensure component is stable
        await new Promise(resolve => {
          renderTimeout = setTimeout(resolve, 100);
        });

        if (!mounted || !plotRef.current) {
          console.log(`[PlotlyRenderer] ${renderTimestamp} Mount check failed after Plotly load`);
          return;
        }

        // Clear any existing plot
        console.log(`[PlotlyRenderer] ${renderTimestamp} Purging existing plot`);
        try {
          Plotly.purge(plotRef.current);
        } catch (e) {
          console.warn(`[PlotlyRenderer] ${renderTimestamp} Purge warning:`, e);
        }

        console.log(`[PlotlyRenderer] ${renderTimestamp} Rendering plot with:`, {
          dataLength: memoizedSpec.data?.length,
          hasLayout: !!memoizedSpec.layout,
          hasConfig: !!memoizedSpec.config
        });

        // Render new plot
        await Plotly.newPlot(
          plotRef.current,
          memoizedSpec.data,
          memoizedSpec.layout,
          {
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d'],
            responsive: true,
            ...memoizedSpec.config
          }
        );

        console.log(`[PlotlyRenderer] ${renderTimestamp} Plot rendered successfully`);
        
        if (mounted) {
          handleRenderSuccess();
        }
      } catch (err) {
        console.error(`[PlotlyRenderer] ${renderTimestamp} Render error:`, err);
        if (mounted) {
          handleError(err instanceof Error ? err : new Error('Chart rendering failed'));
        }
      }
    };

    // Small delay to ensure component is mounted and stable
    const initTimeout = setTimeout(() => {
      if (mounted) {
        renderChart();
      }
    }, 50);

    // Cleanup function
    return () => {
      const timestamp = new Date().toISOString();
      console.log(`[PlotlyRenderer] ${timestamp} Cleanup function called`);
      mounted = false;
      if (initTimeout) clearTimeout(initTimeout);
      if (renderTimeout) clearTimeout(renderTimeout);
      if (plotRef.current && plotlyInstance) {
        try {
          plotlyInstance.purge(plotRef.current);
        } catch (e) {
          console.warn(`[PlotlyRenderer] ${timestamp} Cleanup error:`, e);
        }
      }
    };
  }, [memoizedSpec, handleError, handleRenderSuccess]); // ONLY depend on memoized spec and stable handlers

  // Always render the container to ensure ref is available
  // Show loading or error states inside the container

  // Render container - always render the container so ref is available
  const timestamp = new Date().toISOString();
  console.log(`[PlotlyRenderer] ${timestamp} Rendering container`, {
    isLoading,
    isReady,
    hasSpec: !!memoizedSpec,
    error: !!error
  });
  
  return (
    <div
      ref={plotRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        ...style
      }}
    >
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-red-400">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-red-300">Chart Rendering Error</h3>
                <p className="mt-1 text-sm text-red-200">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isLoading && !isReady && !error && (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="text-gray-400">Loading chart...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlotlyRenderer;