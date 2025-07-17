// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Plotly Wrapper Tests                                                               │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDefaultConfig } from '../../../lib/config';
import { 
  buildBaseLayout,
  addTitles,
  addSourceAnnotation,
  buildAxisConfig 
} from './builders/layout';

describe('Plotly Wrapper', () => {
  let config = getDefaultConfig();
  
  beforeEach(() => {
    config = getDefaultConfig();
  });
  
  describe('Layout Builder', () => {
    it('should build base layout with correct dimensions', () => {
      const layout = buildBaseLayout(config);
      
      expect(layout.width).toBe(1920);
      expect(layout.height).toBe(1080);
      expect(layout.paper_bgcolor).toBe('#1A1A1A');
      expect(layout.plot_bgcolor).toBe('#1A1A1A');
    });
    
    it('should set correct margins', () => {
      const layout = buildBaseLayout(config);
      
      expect(layout.margin).toEqual({
        l: 120,
        r: 70,
        t: 108,
        b: 0, // margin_b_min + plot_area_b_padding
        pad: 0,
      });
    });
    
    it('should configure legend correctly', () => {
      const layout = buildBaseLayout(config);
      
      expect(layout.legend?.orientation).toBe('h');
      expect(layout.legend?.y).toBe(-0.138);
      expect(layout.legend?.x).toBe(0.0);
      expect(layout.legend?.font?.size).toBe(14.4);
    });
    
    it('should add title with correct formatting', () => {
      const baseLayout = buildBaseLayout(config);
      const withTitle = addTitles(baseLayout, config, 'Test Title', 'Test Subtitle');
      
      expect(withTitle.title?.text).toBe('Test Title<br><sub>Test Subtitle</sub>');
      expect(withTitle.title?.font?.size).toBe(51.6);
      expect(withTitle.title?.font?.color).toBe('#ededed');
      expect(withTitle.title?.x).toBe(0.035);
    });
    
    it('should add source annotation', () => {
      const baseLayout = buildBaseLayout(config);
      const withSource = addSourceAnnotation(baseLayout, config, 'Test Source');
      
      expect(withSource.annotations).toHaveLength(1);
      expect(withSource.annotations?.[0].text).toBe('Source: Test Source');
      expect(withSource.annotations?.[0].font?.size).toBe(17.4);
      expect(withSource.annotations?.[0].font?.color).toBe('#9f95c6');
    });
    
    it('should build x-axis config with correct settings', () => {
      const xAxis = buildAxisConfig(config, 'x');
      
      expect(xAxis.showgrid).toBe(false);
      expect(xAxis.gridcolor).toBe('rgb(38, 38, 38)');
      expect(xAxis.linewidth).toBe(2.5);
      expect(xAxis.ticklen).toBe(6);
      expect(xAxis.nticks).toBe(15);
      expect(xAxis.tickformat).toBe('%d %b %y');
    });
    
    it('should build y-axis config with correct settings', () => {
      const yAxis = buildAxisConfig(config, 'y');
      
      expect(yAxis.showgrid).toBe(true);
      expect(yAxis.gridcolor).toBe('rgb(38, 38, 38)');
      expect(yAxis.gridwidth).toBe(2.5);
      expect(yAxis.zeroline).toBe(true);
      expect(yAxis.zerolinewidth).toBe(2.5);
      expect(yAxis.showspikes).toBe(true);
      expect(yAxis.spikethickness).toBe(2.4);
    });
  });
});