// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Configuration Tests                                                                 │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { describe, it, expect } from 'vitest';
import { DEFAULT_BWR_CONFIG, getDefaultConfig, mergeConfig, deepMergeDicts } from './index';

describe('BWR Configuration', () => {
  describe('Default Configuration Values', () => {
    it('should have exact Python-matching dimensions', () => {
      expect(DEFAULT_BWR_CONFIG.general.width).toBe(1920);
      expect(DEFAULT_BWR_CONFIG.general.height).toBe(1080);
    });

    it('should have exact Python-matching colors', () => {
      expect(DEFAULT_BWR_CONFIG.colors.background_color).toBe('#1A1A1A');
      expect(DEFAULT_BWR_CONFIG.colors.primary).toBe('#5637cd');
      expect(DEFAULT_BWR_CONFIG.colors.hbar_negative).toBe('#EF798A');
    });

    it('should have exact Python-matching font sizes', () => {
      // Critical: These must be exact decimals, not rounded!
      expect(DEFAULT_BWR_CONFIG.fonts.title.size).toBe(51.6);
      expect(DEFAULT_BWR_CONFIG.fonts.subtitle.size).toBe(21.6);
      expect(DEFAULT_BWR_CONFIG.fonts.axis_title.size).toBe(16.8);
      expect(DEFAULT_BWR_CONFIG.fonts.tick.size).toBe(21.6);
      expect(DEFAULT_BWR_CONFIG.fonts.legend.size).toBe(24.0);
      expect(DEFAULT_BWR_CONFIG.fonts.annotation.size).toBe(17.4);
    });

    it('should have exact Python-matching margins', () => {
      expect(DEFAULT_BWR_CONFIG.layout.margin_l).toBe(120);
      expect(DEFAULT_BWR_CONFIG.layout.margin_r).toBe(70);
      expect(DEFAULT_BWR_CONFIG.layout.margin_t_base).toBe(108);
      expect(DEFAULT_BWR_CONFIG.layout.margin_b_min).toBe(0);
    });

    it('should have exact Python-matching grid colors', () => {
      expect(DEFAULT_BWR_CONFIG.axes.gridcolor).toBe('rgb(38, 38, 38)');
      expect(DEFAULT_BWR_CONFIG.axes.linecolor).toBe('rgb(38, 38, 38)');
      expect(DEFAULT_BWR_CONFIG.axes.zerolinecolor).toBe('rgb(38, 38, 38)');
    });

    it('should have exact Python-matching line widths', () => {
      expect(DEFAULT_BWR_CONFIG.axes.linewidth).toBe(2.5);
      expect(DEFAULT_BWR_CONFIG.axes.gridwidth).toBe(2.5);
      expect(DEFAULT_BWR_CONFIG.axes.zerolinewidth).toBe(2.5);
      expect(DEFAULT_BWR_CONFIG.axes.spikethickness).toBe(2.4);
      expect(DEFAULT_BWR_CONFIG.plot_specific.scatter.line_width).toBe(4.2);
    });

    it('should have exact Python-matching scatter plot config', () => {
      const scatter = DEFAULT_BWR_CONFIG.plot_specific.scatter;
      expect(scatter.line_shape).toBe('spline');
      expect(scatter.line_smoothing).toBe(0.3);
      expect(scatter.mode).toBe('lines');
    });

    it('should have exact Python-matching watermark positioning', () => {
      const watermark = DEFAULT_BWR_CONFIG.watermark;
      expect(watermark.chart_x).toBe(1.012);
      expect(watermark.chart_y).toBe(1.275);
      expect(watermark.chart_sizex).toBe(0.20);
      expect(watermark.chart_sizey).toBe(0.20);
    });
  });

  describe('Configuration Utilities', () => {
    it('should deep clone configuration', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
      
      config1.colors.primary = '#ff0000';
      expect(config2.colors.primary).toBe('#5637cd');
    });

    it('should deep merge configurations', () => {
      const base = {
        a: 1,
        b: { c: 2, d: 3 },
        e: [1, 2, 3]
      };
      
      const override = {
        b: { c: 4 },
        e: [4, 5]
      };
      
      const result = deepMergeDicts(base, override);
      
      expect(result).toEqual({
        a: 1,
        b: { c: 4, d: 3 },
        e: [4, 5]
      });
    });

    it('should merge user config with defaults', () => {
      const userConfig = {
        colors: {
          primary: '#ff0000'
        },
        fonts: {
          title: { size: 60, color: '#ffffff' }
        }
      };
      
      const merged = mergeConfig(userConfig);
      
      expect(merged.colors.primary).toBe('#ff0000');
      expect(merged.colors.background_color).toBe('#1A1A1A'); // unchanged
      expect(merged.fonts.title.size).toBe(60);
      expect(merged.fonts.subtitle.size).toBe(21.6); // unchanged
    });
  });
});