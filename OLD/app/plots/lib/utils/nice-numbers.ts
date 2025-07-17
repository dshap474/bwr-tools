// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Nice Numbers Utilities                                                              │
// └────────────────────────────────────────────────────────────────────────────────────┘

/**
 * Y-axis grid parameters
 */
export interface YAxisGridParams {
  range: [number, number];
  tick0: number;
  dtick: number;
  tickmode: 'linear';
}

/**
 * Return a 'nice' number approximately equal to value for axis scaling.
 * Exact port from Python _nice_number function.
 * 
 * @param value Input value to make 'nice'
 * @param round Whether to round or just find nice number
 * @returns Nice number
 */
export function niceNumber(value: number, round: boolean = false): number {
  if (value === 0) return 0;
  if (!isFinite(value)) return value;
  
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const f = Math.abs(value) / Math.pow(10, exp);
  
  let nf: number;
  if (round) {
    if (f < 1.5) {
      nf = 1;
    } else if (f < 3) {
      nf = 2;
    } else if (f < 7) {
      nf = 5;
    } else {
      nf = 10;
    }
  } else {
    if (f <= 1) {
      nf = 1;
    } else if (f <= 2) {
      nf = 2;
    } else if (f <= 5) {
      nf = 5;
    } else {
      nf = 10;
    }
  }
  
  return nf * Math.pow(10, exp) * Math.sign(value);
}

/**
 * Calculate y-axis range and tick parameters so the lowest gridline matches the axis minimum 
 * and the topmost gridline is always >= the data maximum, using 'nice' intervals.
 * The axis maximum is extended by `topExtra` (fractional) above the topmost gridline to ensure visibility.
 * If all data is positive, the axis minimum and lowest gridline are set to zero.
 * 
 * Exact port from Python calculate_yaxis_grid_params function.
 * 
 * @param yData Array of y-values (numbers)
 * @param padding Fraction of data range to pad below min (default: 0.05)
 * @param numGridlines Number of gridlines to show (default: 5)
 * @param topExtra Fractional extra space above the top gridline (default: 0.002 for 0.2%)
 * @returns Object with range, tick0, dtick, tickmode
 */
export function calculateYAxisGridParams(
  yData: number[],
  padding: number = 0.05,
  numGridlines: number = 5,
  topExtra: number = 0.002
): YAxisGridParams {
  // Filter out NaN and null values
  const validData = yData.filter(y => isFinite(y));
  
  if (validData.length === 0) {
    // No valid data, return default range
    return {
      range: [0, 1],
      tick0: 0,
      dtick: 0.2,
      tickmode: 'linear'
    };
  }
  
  const yMinData = Math.min(...validData);
  let yMax = Math.max(...validData);
  
  if (yMinData === yMax) {
    yMax = yMinData + 1; // Ensure visible range
  }
  
  const dataRange = yMax - yMinData;
  
  // Calculate initial axis_min based on data minimum
  let initialAxisMin: number;
  if (yMinData >= 0) {
    initialAxisMin = 0;
  } else {
    initialAxisMin = yMinData - dataRange * padding;
  }
  
  const initialAxisMax = yMax + dataRange * padding;
  
  // Calculate the 'nice' tick interval
  const rawTick = (initialAxisMax - initialAxisMin) / (numGridlines - 1);
  const dtick = niceNumber(rawTick, true);
  
  // Snap axis_min to a multiple of dtick
  const snappedAxisMin = Math.floor(initialAxisMin / dtick) * dtick;
  
  // Correction: If data min is non-negative but snapping made axis_min negative, force to 0
  let finalAxisMin = snappedAxisMin;
  if (yMinData >= 0 && snappedAxisMin < 0) {
    finalAxisMin = 0.0;
  }
  
  // Calculate the final axis maximum based on the corrected axis minimum
  const nTicks = Math.ceil((yMax - finalAxisMin) / dtick) + 1;
  const finalAxisMax = finalAxisMin + dtick * (nTicks - 1);
  
  // Extend axis_max by top_extra percent of the axis range
  const finalAxisMaxExtended = finalAxisMax + (finalAxisMax - finalAxisMin) * topExtra;
  
  return {
    range: [finalAxisMin, finalAxisMaxExtended],
    tick0: finalAxisMin,
    dtick: dtick,
    tickmode: 'linear'
  };
}

/**
 * Calculate nice axis limits
 * 
 * @param min Minimum value in data
 * @param max Maximum value in data
 * @param numTicks Desired number of ticks
 * @returns Object with min, max, and tick interval
 */
export function calculateNiceAxisLimits(
  min: number,
  max: number,
  numTicks: number = 5
): { min: number; max: number; tickInterval: number } {
  if (min === max) {
    const center = min;
    const spread = Math.abs(center) * 0.1 || 1;
    min = center - spread;
    max = center + spread;
  }
  
  const range = max - min;
  const roughTickInterval = range / (numTicks - 1);
  const niceTickInterval = niceNumber(roughTickInterval, true);
  
  const niceMin = Math.floor(min / niceTickInterval) * niceTickInterval;
  const niceMax = Math.ceil(max / niceTickInterval) * niceTickInterval;
  
  return {
    min: niceMin,
    max: niceMax,
    tickInterval: niceTickInterval
  };
}

/**
 * Generate nice tick values for an axis
 * 
 * @param min Minimum axis value
 * @param max Maximum axis value
 * @param numTicks Desired number of ticks
 * @returns Array of tick values
 */
export function generateNiceTicks(min: number, max: number, numTicks: number = 5): number[] {
  const { min: niceMin, max: niceMax, tickInterval } = calculateNiceAxisLimits(min, max, numTicks);
  
  const ticks: number[] = [];
  let current = niceMin;
  
  while (current <= niceMax + tickInterval * 0.001) { // Small epsilon to handle floating point
    ticks.push(current);
    current += tickInterval;
  }
  
  return ticks;
}

/**
 * Calculate nice step size for a given range
 * 
 * @param range Total range (max - min)
 * @param numSteps Desired number of steps
 * @returns Nice step size
 */
export function calculateNiceStepSize(range: number, numSteps: number): number {
  if (range === 0) return 1;
  
  const roughStep = range / numSteps;
  return niceNumber(roughStep, true);
}

/**
 * Round a value to a nice number for display
 * 
 * @param value Value to round
 * @param precision Optional precision (number of significant digits)
 * @returns Rounded nice number
 */
export function roundToNice(value: number, precision?: number): number {
  if (!isFinite(value) || value === 0) return value;
  
  if (precision !== undefined) {
    const exp = Math.floor(Math.log10(Math.abs(value)));
    const targetExp = exp - precision + 1;
    const factor = Math.pow(10, -targetExp);
    return Math.round(value * factor) / factor;
  }
  
  return niceNumber(value, true);
}

/**
 * Get appropriate number of decimal places for a value
 * 
 * @param value Value to analyze
 * @param tickInterval Tick interval for context
 * @returns Number of decimal places to show
 */
export function getDecimalPlaces(value: number, tickInterval?: number): number {
  if (!isFinite(value)) return 0;
  
  const reference = tickInterval || Math.abs(value);
  if (reference >= 1) return 0;
  
  // Count decimal places needed
  let places = 0;
  let test = reference;
  while (test < 1 && places < 10) {
    test *= 10;
    places++;
  }
  
  return Math.min(places + 1, 6); // Cap at 6 decimal places
}

/**
 * Format a number for axis display
 * 
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @param useThousandsSeparator Whether to use thousands separator
 * @returns Formatted string
 */
export function formatAxisNumber(
  value: number,
  decimalPlaces: number = 0,
  useThousandsSeparator: boolean = true
): string {
  if (!isFinite(value)) return String(value);
  
  const formatted = value.toFixed(decimalPlaces);
  
  if (useThousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  
  return formatted;
}

/**
 * Auto-format number based on magnitude
 * 
 * @param value Number to format
 * @returns Formatted string
 */
export function autoFormatNumber(value: number): string {
  if (!isFinite(value)) return String(value);
  
  const abs = Math.abs(value);
  
  if (abs >= 1e9) {
    return formatAxisNumber(value / 1e9, 1) + 'B';
  } else if (abs >= 1e6) {
    return formatAxisNumber(value / 1e6, 1) + 'M';
  } else if (abs >= 1e3) {
    return formatAxisNumber(value / 1e3, 1) + 'K';
  } else if (abs >= 1) {
    return formatAxisNumber(value, 0);
  } else if (abs >= 0.01) {
    return formatAxisNumber(value, 2);
  } else {
    return value.toExponential(2);
  }
}