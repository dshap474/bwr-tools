// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plotly Renderer Component                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BWRPlotSpec } from '../../../../lib/plotly-wrapper';
import { 
  getPlotlyInstance, 
  isPlotlyLoaded, 
  preloadPlotly,
  renderPlot,
  updatePlot,
  resizePlot,
  clearPlot
} from '../../../../lib/plotly-wrapper';

export interface PlotlyRendererProps {
  // Core props
  spec: BWRPlotSpec;
  
  // Container props
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  
  // Behavior props
  responsive?: boolean;
  displayModeBar?: boolean;
  displaylogo?: boolean;
  modeBarButtonsToRemove?: string[];
  
  // Event handlers
  onPlotlyReady?: (plotly: any) => void;
  onExport?: (format: string) => void;
  onError?: (error: Error) => void;
  onRender?: () => void;
  
  // Plotly event handlers
  onHover?: (data: any) => void;
  onUnhover?: (data: any) => void;
  onClick?: (data: any) => void;
  onDoubleClick?: (data: any) => void;
  onSelected?: (data: any) => void;
  onDeselect?: () => void;
  onRelayout?: (data: any) => void;
  onRestyle?: (data: any) => void;
  onRedraw?: () => void;
  onAnimated?: () => void;
  
  // Loading and error states
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

interface PlotlyRendererState {
  isLoading: boolean;
  isPlotlyLoaded: boolean;
  error: Error | null;
  hasRendered: boolean;
}

export const PlotlyRenderer: React.FC<PlotlyRendererProps> = ({
  spec,
  className = '',
  style,
  id,
  responsive = true,
  displayModeBar = true,
  displaylogo = false,
  modeBarButtonsToRemove = ['select2d', 'lasso2d'],
  onPlotlyReady,
  onExport,
  onError,
  onRender,
  onHover,
  onUnhover,
  onClick,
  onDoubleClick,
  onSelected,
  onDeselect,
  onRelayout,
  onRestyle,
  onRedraw,
  onAnimated,
  loading: externalLoading = false,
  loadingComponent,
  errorComponent
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const plotlyInstanceRef = useRef<any>(null);
  
  const [state, setState] = useState<PlotlyRendererState>({
    isLoading: true,
    isPlotlyLoaded: false,
    error: null,
    hasRendered: false
  });

  // Load Plotly.js
  useEffect(() => {
    const loadPlotly = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Check if already loaded
        if (isPlotlyLoaded()) {
          plotlyInstanceRef.current = await getPlotlyInstance();
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isPlotlyLoaded: true 
          }));
          onPlotlyReady?.(plotlyInstanceRef.current);
        } else {
          // Preload Plotly.js
          await preloadPlotly();
          plotlyInstanceRef.current = await getPlotlyInstance();
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isPlotlyLoaded: true 
          }));
          onPlotlyReady?.(plotlyInstanceRef.current);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load Plotly.js');
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error 
        }));
        onError?.(error);
      }
    };

    loadPlotly();
  }, [onPlotlyReady, onError]);

  // Render plot when spec changes
  useEffect(() => {
    if (!state.isPlotlyLoaded || !containerRef.current || !spec) {
      return;
    }

    const renderChart = async () => {
      try {
        setState(prev => ({ ...prev, error: null }));
        
        // Merge config with props
        const config = {
          ...spec.config,
          responsive,
          displayModeBar,
          displaylogo,
          modeBarButtonsToRemove
        };

        // Render the plot
        await renderPlot(containerRef.current, spec.data, spec.layout, config);
        
        setState(prev => ({ ...prev, hasRendered: true }));
        onRender?.();
        
        // Attach event handlers
        attachEventHandlers();
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to render plot');
        setState(prev => ({ ...prev, error }));
        onError?.(error);
      }
    };

    renderChart();
  }, [
    spec, 
    state.isPlotlyLoaded, 
    responsive, 
    displayModeBar, 
    displaylogo, 
    modeBarButtonsToRemove,
    onRender,
    onError
  ]);

  // Handle responsive resizing
  useEffect(() => {
    if (!responsive || !state.hasRendered || !containerRef.current) {
      return;
    }

    const handleResize = () => {
      if (containerRef.current) {
        resizePlot(containerRef.current);
      }
    };

    // Set up ResizeObserver
    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [responsive, state.hasRendered]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        clearPlot(containerRef.current);
      }
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // Attach Plotly event handlers
  const attachEventHandlers = useCallback(() => {
    if (!containerRef.current || !plotlyInstanceRef.current) {
      return;
    }

    const el = containerRef.current;
    const Plotly = plotlyInstanceRef.current;

    // Hover events
    if (onHover) {
      el.on('plotly_hover', onHover);
    }
    if (onUnhover) {
      el.on('plotly_unhover', onUnhover);
    }

    // Click events
    if (onClick) {
      el.on('plotly_click', onClick);
    }
    if (onDoubleClick) {
      el.on('plotly_doubleclick', onDoubleClick);
    }

    // Selection events
    if (onSelected) {
      el.on('plotly_selected', onSelected);
    }
    if (onDeselect) {
      el.on('plotly_deselect', onDeselect);
    }

    // Layout events
    if (onRelayout) {
      el.on('plotly_relayout', onRelayout);
    }
    if (onRestyle) {
      el.on('plotly_restyle', onRestyle);
    }

    // Other events
    if (onRedraw) {
      el.on('plotly_redraw', onRedraw);
    }
    if (onAnimated) {
      el.on('plotly_animated', onAnimated);
    }
  }, [
    onHover, onUnhover, onClick, onDoubleClick,
    onSelected, onDeselect, onRelayout, onRestyle,
    onRedraw, onAnimated
  ]);

  // Export handler
  const handleExport = useCallback(async (format: string) => {
    if (!containerRef.current || !plotlyInstanceRef.current) {
      return;
    }

    try {
      const Plotly = plotlyInstanceRef.current;
      
      switch (format) {
        case 'png':
          await Plotly.downloadImage(containerRef.current, {
            format: 'png',
            width: spec.layout.width || 1920,
            height: spec.layout.height || 1080,
            filename: 'bwr-plot'
          });
          break;
          
        case 'svg':
          await Plotly.downloadImage(containerRef.current, {
            format: 'svg',
            width: spec.layout.width || 1920,
            height: spec.layout.height || 1080,
            filename: 'bwr-plot'
          });
          break;
          
        case 'pdf':
          // PDF export typically requires server-side rendering
          console.warn('PDF export not yet implemented');
          break;
          
        default:
          console.warn(`Unknown export format: ${format}`);
      }
      
      onExport?.(format);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to export as ${format}`);
      onError?.(error);
    }
  }, [spec, onExport, onError]);

  // Export method is exposed through props
  // If we need imperative API, use PlotlyRendererWithRef

  // Loading state
  if (state.isLoading || externalLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className={`flex items-center justify-center p-8 ${className}`} style={style}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="text-gray-400">Loading chart...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    
    return (
      <div className={`p-6 bg-red-900/20 border border-red-500/30 rounded-lg ${className}`} style={style}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-300">Chart Rendering Error</h3>
            <p className="mt-1 text-sm text-red-200">{state.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render container
  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '1920px', // BWR standard width
        maxHeight: '1080px', // BWR standard height
        ...style
      }}
    />
  );
};

// Forward ref version for imperative API
export const PlotlyRendererWithRef = React.forwardRef<
  { export: (format: string) => void; getPlotly: () => any },
  PlotlyRendererProps
>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportHandler, setExportHandler] = useState<((format: string) => void) | null>(null);
  const [plotlyInstance, setPlotlyInstance] = useState<any>(null);

  // Create a modified onPlotlyReady that captures the instance
  const handlePlotlyReady = React.useCallback((plotly: any) => {
    setPlotlyInstance(plotly);
    props.onPlotlyReady?.(plotly);
  }, [props]);

  // Create a PlotlyRenderer with export handler
  const RendererWithExport = () => (
    <PlotlyRenderer
      {...props}
      onPlotlyReady={handlePlotlyReady}
      onExport={(format) => {
        // Store the export handler for imperative access
        props.onExport?.(format);
      }}
    />
  );

  // Expose imperative methods
  React.useImperativeHandle(ref, () => ({
    export: (format: string) => {
      // Trigger export through the component
      if (containerRef.current && plotlyInstance) {
        // Direct export using Plotly instance
        plotlyInstance.downloadImage(containerRef.current, {
          format,
          width: props.spec.layout.width || 1920,
          height: props.spec.layout.height || 1080,
          filename: 'bwr-plot'
        });
      }
    },
    getPlotly: () => plotlyInstance
  }), [plotlyInstance, props.spec]);

  return <div ref={containerRef}><RendererWithExport /></div>;
});

PlotlyRenderer.displayName = 'PlotlyRenderer';
PlotlyRendererWithRef.displayName = 'PlotlyRendererWithRef';

export default PlotlyRenderer;