// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Chart Container Component                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useRef, useEffect, useState } from 'react';

export interface ChartContainerProps {
  // Size props
  width?: number | string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  maxWidth?: number | string;
  responsive?: boolean;
  
  // Content props
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  
  // State props
  loading?: boolean;
  error?: string | Error;
  
  // Style props
  className?: string;
  style?: React.CSSProperties;
  containerClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  
  // Content
  children: React.ReactNode;
  
  // Callbacks
  onResize?: (width: number, height: number) => void;
}

interface ContainerSize {
  width: number;
  height: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  width = '100%',
  height = 600,
  minHeight = 400,
  maxHeight = 1080, // BWR standard height
  maxWidth = 1920, // BWR standard width  
  responsive = true,
  title,
  subtitle,
  footer,
  loading = false,
  error,
  className = '',
  style,
  containerClassName = '',
  headerClassName = '',
  footerClassName = '',
  children,
  onResize
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  // Handle responsive sizing
  useEffect(() => {
    if (!responsive || !containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
        onResize?.(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [responsive, onResize]);

  // Calculate container styles
  const containerStyle: React.CSSProperties = {
    width,
    height,
    minHeight,
    maxHeight,
    maxWidth,
    position: 'relative',
    ...style
  };

  // Error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return (
      <div 
        className={`bg-gray-900 rounded-lg border border-red-500/30 overflow-hidden ${containerClassName}`}
        style={containerStyle}
      >
        <div className="p-6 bg-red-900/20">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-300">Chart Error</h3>
              <p className="mt-1 text-sm text-red-200">{errorMessage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div 
        className={`bg-gray-900 rounded-lg border border-gray-700 overflow-hidden ${containerClassName}`}
        style={containerStyle}
      >
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading chart...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div 
      className={`bg-gray-900 rounded-lg border border-gray-700 overflow-hidden ${containerClassName}`}
      style={containerStyle}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className={`px-6 py-4 border-b border-gray-700 ${headerClassName}`}>
          {title && (
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div 
        ref={containerRef}
        className={`relative ${className}`}
        style={{
          height: title || subtitle ? `calc(100% - ${footer ? '120px' : '64px'})` : footer ? 'calc(100% - 56px)' : '100%'
        }}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={`px-6 py-3 border-t border-gray-700 bg-gray-800/50 ${footerClassName}`}>
          <div className="text-xs text-gray-500">
            {footer}
          </div>
        </div>
      )}

      {/* Size indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && responsive && size.width > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-gray-800/80 px-2 py-1 rounded">
          {Math.round(size.width)} × {Math.round(size.height)}
        </div>
      )}
    </div>
  );
};

// Specialized containers for different chart types
export const ScatterChartContainer: React.FC<ChartContainerProps> = (props) => {
  return <ChartContainer {...props} className="scatter-chart-container" />;
};

export const BarChartContainer: React.FC<ChartContainerProps> = (props) => {
  return <ChartContainer {...props} className="bar-chart-container" />;
};

export const LineChartContainer: React.FC<ChartContainerProps> = (props) => {
  return <ChartContainer {...props} className="line-chart-container" />;
};

export const TableChartContainer: React.FC<ChartContainerProps> = (props) => {
  return <ChartContainer {...props} className="table-chart-container overflow-auto" />;
};

// Export all containers
export default ChartContainer;