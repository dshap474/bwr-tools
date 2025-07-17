// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plotly Event Handlers                                                               │
// └────────────────────────────────────────────────────────────────────────────────────┘

export interface PlotlyEventData {
  points: Array<{
    data: any;
    fullData: any;
    curveNumber: number;
    pointNumber: number;
    pointIndex: number;
    x: any;
    y: any;
    z?: any;
    lat?: number;
    lon?: number;
  }>;
  event: MouseEvent;
}

export interface PlotlyHoverData extends PlotlyEventData {
  xvals?: any[];
  yvals?: any[];
}

export interface PlotlyClickData extends PlotlyEventData {}

export interface PlotlySelectData {
  points: PlotlyEventData['points'];
  range?: {
    x?: [number, number];
    y?: [number, number];
  };
  lassoPoints?: {
    x: number[];
    y: number[];
  };
}

export interface PlotlyRelayoutData {
  'xaxis.range'?: [number, number];
  'xaxis.range[0]'?: number;
  'xaxis.range[1]'?: number;
  'yaxis.range'?: [number, number];
  'yaxis.range[0]'?: number;
  'yaxis.range[1]'?: number;
  'xaxis.autorange'?: boolean;
  'yaxis.autorange'?: boolean;
  width?: number;
  height?: number;
  autosize?: boolean;
  dragmode?: string;
  hovermode?: string;
}

export interface PlotlyRestyleData {
  [key: string]: any;
}

/**
 * Create hover event handler
 */
export function createHoverHandler(
  callback?: (data: PlotlyHoverData) => void
): (data: PlotlyHoverData) => void {
  return (data: PlotlyHoverData) => {
    // Extract useful information
    const hoverInfo = data.points.map(point => ({
      seriesName: point.data.name || `Series ${point.curveNumber}`,
      x: point.x,
      y: point.y,
      z: point.z,
      pointIndex: point.pointIndex,
      curveNumber: point.curveNumber,
      customData: point.data.customdata?.[point.pointIndex]
    }));

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Hover event:', hoverInfo);
    }

    callback?.(data);
  };
}

/**
 * Create click event handler
 */
export function createClickHandler(
  callback?: (data: PlotlyClickData) => void
): (data: PlotlyClickData) => void {
  return (data: PlotlyClickData) => {
    // Extract clicked point information
    const clickedPoint = data.points[0];
    if (clickedPoint) {
      const clickInfo = {
        seriesName: clickedPoint.data.name || `Series ${clickedPoint.curveNumber}`,
        x: clickedPoint.x,
        y: clickedPoint.y,
        z: clickedPoint.z,
        pointIndex: clickedPoint.pointIndex,
        curveNumber: clickedPoint.curveNumber,
        customData: clickedPoint.data.customdata?.[clickedPoint.pointIndex]
      };

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Click event:', clickInfo);
      }
    }

    callback?.(data);
  };
}

/**
 * Create selection event handler
 */
export function createSelectHandler(
  callback?: (data: PlotlySelectData) => void
): (data: PlotlySelectData) => void {
  return (data: PlotlySelectData) => {
    // Extract selection information
    const selectedPoints = data.points.map(point => ({
      seriesName: point.data.name || `Series ${point.curveNumber}`,
      x: point.x,
      y: point.y,
      pointIndex: point.pointIndex,
      curveNumber: point.curveNumber
    }));

    const selectionInfo = {
      pointCount: selectedPoints.length,
      points: selectedPoints,
      range: data.range,
      lassoPoints: data.lassoPoints
    };

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Selection event:', selectionInfo);
    }

    callback?.(data);
  };
}

/**
 * Create relayout event handler (zoom, pan, resize)
 */
export function createRelayoutHandler(
  callback?: (data: PlotlyRelayoutData) => void
): (data: PlotlyRelayoutData) => void {
  return (data: PlotlyRelayoutData) => {
    // Extract layout changes
    const layoutChanges: any = {};

    // Check for axis range changes (zoom/pan)
    if ('xaxis.range[0]' in data && 'xaxis.range[1]' in data) {
      layoutChanges.xRange = [data['xaxis.range[0]'], data['xaxis.range[1]']];
    }
    if ('yaxis.range[0]' in data && 'yaxis.range[1]' in data) {
      layoutChanges.yRange = [data['yaxis.range[0]'], data['yaxis.range[1]']];
    }

    // Check for autorange reset
    if (data['xaxis.autorange']) {
      layoutChanges.xAutorange = true;
    }
    if (data['yaxis.autorange']) {
      layoutChanges.yAutorange = true;
    }

    // Check for size changes
    if (data.width || data.height) {
      layoutChanges.size = {
        width: data.width,
        height: data.height
      };
    }

    // Log in development
    if (process.env.NODE_ENV === 'development' && Object.keys(layoutChanges).length > 0) {
      console.log('Relayout event:', layoutChanges);
    }

    callback?.(data);
  };
}

/**
 * Create restyle event handler (data updates)
 */
export function createRestyleHandler(
  callback?: (data: PlotlyRestyleData) => void
): (data: PlotlyRestyleData) => void {
  return (data: PlotlyRestyleData) => {
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Restyle event:', data);
    }

    callback?.(data);
  };
}

/**
 * Create legend click handler
 */
export function createLegendClickHandler(
  callback?: (data: any) => boolean | void
): (data: any) => boolean | void {
  return (data: any) => {
    const curveNumber = data.curveNumber;
    const legendItem = data.data[curveNumber];
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Legend click:', {
        curveNumber,
        name: legendItem?.name,
        visible: legendItem?.visible
      });
    }

    // Return false to prevent default legend click behavior
    // Return true or undefined to allow it
    const result = callback?.(data);
    return result !== undefined ? result : true;
  };
}

/**
 * Create legend double click handler
 */
export function createLegendDoubleClickHandler(
  callback?: (data: any) => boolean | void
): (data: any) => boolean | void {
  return (data: any) => {
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Legend double click:', data);
    }

    // Return false to prevent default behavior
    const result = callback?.(data);
    return result !== undefined ? result : true;
  };
}

/**
 * Attach all event handlers to a Plotly element
 */
export function attachEventHandlers(
  element: HTMLElement,
  handlers: {
    onHover?: (data: PlotlyHoverData) => void;
    onUnhover?: (data: PlotlyEventData) => void;
    onClick?: (data: PlotlyClickData) => void;
    onDoubleClick?: (data: PlotlyClickData) => void;
    onSelected?: (data: PlotlySelectData) => void;
    onDeselect?: () => void;
    onRelayout?: (data: PlotlyRelayoutData) => void;
    onRestyle?: (data: PlotlyRestyleData) => void;
    onLegendClick?: (data: any) => boolean | void;
    onLegendDoubleClick?: (data: any) => boolean | void;
  }
): void {
  // Hover events
  if (handlers.onHover) {
    element.on('plotly_hover', createHoverHandler(handlers.onHover));
  }
  if (handlers.onUnhover) {
    element.on('plotly_unhover', handlers.onUnhover);
  }

  // Click events
  if (handlers.onClick) {
    element.on('plotly_click', createClickHandler(handlers.onClick));
  }
  if (handlers.onDoubleClick) {
    element.on('plotly_doubleclick', handlers.onDoubleClick);
  }

  // Selection events
  if (handlers.onSelected) {
    element.on('plotly_selected', createSelectHandler(handlers.onSelected));
  }
  if (handlers.onDeselect) {
    element.on('plotly_deselect', handlers.onDeselect);
  }

  // Layout events
  if (handlers.onRelayout) {
    element.on('plotly_relayout', createRelayoutHandler(handlers.onRelayout));
  }
  if (handlers.onRestyle) {
    element.on('plotly_restyle', createRestyleHandler(handlers.onRestyle));
  }

  // Legend events
  if (handlers.onLegendClick) {
    element.on('plotly_legendclick', createLegendClickHandler(handlers.onLegendClick));
  }
  if (handlers.onLegendDoubleClick) {
    element.on('plotly_legenddoubleclick', createLegendDoubleClickHandler(handlers.onLegendDoubleClick));
  }
}

/**
 * Remove all event handlers from a Plotly element
 */
export function removeEventHandlers(element: HTMLElement): void {
  // Remove all plotly event listeners
  const events = [
    'plotly_hover',
    'plotly_unhover',
    'plotly_click',
    'plotly_doubleclick',
    'plotly_selected',
    'plotly_deselect',
    'plotly_relayout',
    'plotly_restyle',
    'plotly_legendclick',
    'plotly_legenddoubleclick'
  ];

  events.forEach(event => {
    element.removeAllListeners(event);
  });
}