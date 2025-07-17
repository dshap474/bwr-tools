// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Display Controls Component                                                          │
// └────────────────────────────────────────────────────────────────────────────────────┘

'use client';

import React, { useState } from 'react';

export interface DisplayControlsProps {
  // Display settings
  showLegend: boolean;
  showGrid: boolean;
  showWatermark: boolean;
  watermarkText?: string;
  
  // Chart dimensions
  width?: number;
  height?: number;
  
  // Color scheme
  colorScheme: string;
  backgroundColor?: string;
  
  // Event handlers
  onShowLegendChange: (show: boolean) => void;
  onShowGridChange: (show: boolean) => void;
  onShowWatermarkChange: (show: boolean) => void;
  onWatermarkTextChange: (text: string) => void;
  onDimensionsChange: (width: number, height: number) => void;
  onColorSchemeChange: (scheme: string) => void;
  onBackgroundColorChange: (color: string) => void;
  
  // State
  disabled?: boolean;
  className?: string;
}

const COLOR_SCHEMES = [
  { id: 'bwr', name: 'BWR Default', colors: ['#5637cd', '#8B5CF6', '#A78BFA', '#C4B5FD'] },
  { id: 'blues', name: 'Blues', colors: ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD'] },
  { id: 'greens', name: 'Greens', colors: ['#166534', '#16A34A', '#4ADE80', '#86EFAC'] },
  { id: 'reds', name: 'Reds', colors: ['#991B1B', '#DC2626', '#F87171', '#FCA5A5'] },
  { id: 'oranges', name: 'Oranges', colors: ['#9A3412', '#EA580C', '#FB923C', '#FED7AA'] },
  { id: 'purples', name: 'Purples', colors: ['#581C87', '#9333EA', '#A855F7', '#C084FC'] },
  { id: 'categorical', name: 'Categorical', colors: ['#5637cd', '#16A34A', '#DC2626', '#F59E0B', '#8B5CF6'] }
];

const CHART_DIMENSIONS = [
  { label: 'Small (960x540)', width: 960, height: 540 },
  { label: 'Medium (1280x720)', width: 1280, height: 720 },
  { label: 'Large (1920x1080)', width: 1920, height: 1080 },
  { label: 'Square (1080x1080)', width: 1080, height: 1080 },
  { label: 'Wide (1920x800)', width: 1920, height: 800 },
  { label: 'Custom', width: 0, height: 0 }
];

export function DisplayControls({
  showLegend,
  showGrid,
  showWatermark,
  watermarkText = '',
  width = 1920,
  height = 1080,
  colorScheme = 'bwr',
  backgroundColor = '#1A1A1A',
  onShowLegendChange,
  onShowGridChange,
  onShowWatermarkChange,
  onWatermarkTextChange,
  onDimensionsChange,
  onColorSchemeChange,
  onBackgroundColorChange,
  disabled = false,
  className = ''
}: DisplayControlsProps) {
  const [customDimensions, setCustomDimensions] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState(() => {
    const preset = CHART_DIMENSIONS.find(d => d.width === width && d.height === height);
    return preset ? preset.label : 'Custom';
  });

  const handleDimensionPresetChange = (preset: string) => {
    setSelectedDimension(preset);
    
    if (preset === 'Custom') {
      setCustomDimensions(true);
    } else {
      setCustomDimensions(false);
      const dimension = CHART_DIMENSIONS.find(d => d.label === preset);
      if (dimension && dimension.width > 0) {
        onDimensionsChange(dimension.width, dimension.height);
      }
    }
  };

  const renderColorPreview = (colors: string[]) => (
    <div className="flex space-x-1">
      {colors.map((color, index) => (
        <div
          key={index}
          className="w-4 h-4 rounded-full border border-gray-600"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Display & Styling</h3>
        <div className="text-sm text-gray-400">
          Customize chart appearance
        </div>
      </div>

      {/* Chart Display Options */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="font-medium text-gray-300 mb-4">Chart Elements</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-300">Show Legend</div>
              <div className="text-xs text-gray-500">Display series legend</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => onShowLegendChange(e.target.checked)}
                className="sr-only peer"
                disabled={disabled}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-300">Show Grid</div>
              <div className="text-xs text-gray-500">Display background grid lines</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => onShowGridChange(e.target.checked)}
                className="sr-only peer"
                disabled={disabled}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-300">BWR Watermark</div>
              <div className="text-xs text-gray-500">Add BWR branding to chart</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => onShowWatermarkChange(e.target.checked)}
                className="sr-only peer"
                disabled={disabled}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {showWatermark && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Watermark Text
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => onWatermarkTextChange(e.target.value)}
                placeholder="Custom watermark text (optional)"
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                disabled={disabled}
              />
              <div className="text-xs text-gray-500 mt-1">
                Leave empty to use default BWR watermark
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Dimensions */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="font-medium text-gray-300 mb-4">Chart Dimensions</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Size Preset
            </label>
            <select
              value={selectedDimension}
              onChange={(e) => handleDimensionPresetChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
              disabled={disabled}
            >
              {CHART_DIMENSIONS.map(dim => (
                <option key={dim.label} value={dim.label}>
                  {dim.label}
                </option>
              ))}
            </select>
          </div>

          {customDimensions && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => onDimensionsChange(parseInt(e.target.value) || width, height)}
                  min="100"
                  max="4000"
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => onDimensionsChange(width, parseInt(e.target.value) || height)}
                  min="100"
                  max="4000"
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Current: {width} × {height} px (Aspect ratio: {(width / height).toFixed(2)}:1)
          </div>
        </div>
      </div>

      {/* Color Scheme */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="font-medium text-gray-300 mb-4">Color Scheme</h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {COLOR_SCHEMES.map(scheme => (
              <div
                key={scheme.id}
                className={`
                  p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${colorScheme === scheme.id 
                    ? 'border-blue-500 bg-blue-950/30' 
                    : 'border-gray-600 hover:border-gray-500'
                  }
                `}
                onClick={() => !disabled && onColorSchemeChange(scheme.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-300">
                      {scheme.name}
                    </div>
                    <div className="mt-2">
                      {renderColorPreview(scheme.colors)}
                    </div>
                  </div>
                  {colorScheme === scheme.id && (
                    <div className="text-blue-400">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="font-medium text-gray-300 mb-4">Background</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Background Color
            </label>
            <div className="flex space-x-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                className="w-12 h-10 rounded border border-gray-600 bg-gray-700"
                disabled={disabled}
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                placeholder="#1A1A1A"
                className="flex-1 bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                disabled={disabled}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Default BWR background is #1A1A1A
            </div>
          </div>

          <div className="flex space-x-2">
            {['#1A1A1A', '#000000', '#FFFFFF', '#F8F9FA', '#2D3748'].map(color => (
              <button
                key={color}
                onClick={() => onBackgroundColorChange(color)}
                className={`
                  w-8 h-8 rounded border-2 transition-all
                  ${backgroundColor === color ? 'border-blue-500' : 'border-gray-600'}
                `}
                style={{ backgroundColor: color }}
                disabled={disabled}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="font-medium text-gray-300 mb-4">Preview</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Dimensions:</span>
            <div className="text-gray-200">{width} × {height}</div>
          </div>
          <div>
            <span className="text-gray-400">Legend:</span>
            <div className={showLegend ? 'text-green-400' : 'text-gray-400'}>
              {showLegend ? 'Visible' : 'Hidden'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Grid:</span>
            <div className={showGrid ? 'text-green-400' : 'text-gray-400'}>
              {showGrid ? 'Visible' : 'Hidden'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Watermark:</span>
            <div className={showWatermark ? 'text-green-400' : 'text-gray-400'}>
              {showWatermark ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}