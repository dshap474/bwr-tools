// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Configuration Validation Schemas                                                    │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { z } from 'zod';

// Font configuration schema
const BWRFontConfigSchema = z.object({
  size: z.number().positive(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(\d+,\s*\d+,\s*\d+\)$/),
});

// General configuration schema
const BWRGeneralConfigSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  template: z.string(),
  background_image_path: z.string(),
});

// Colors configuration schema
const BWRColorsConfigSchema = z.object({
  background_color: z.string(),
  primary: z.string(),
  bar_default: z.string(),
  hbar_positive: z.string(),
  hbar_negative: z.string(),
  default_palette: z.array(z.string()),
});

// Fonts configuration schema
const BWRFontsConfigSchema = z.object({
  normal_family: z.string(),
  bold_family: z.string(),
  title: BWRFontConfigSchema,
  subtitle: BWRFontConfigSchema,
  axis_title: BWRFontConfigSchema,
  tick: BWRFontConfigSchema,
  legend: BWRFontConfigSchema,
  annotation: BWRFontConfigSchema,
  table_header: BWRFontConfigSchema.optional(),
  table_cell: BWRFontConfigSchema.optional(),
});

// Watermark configuration schema
const BWRWatermarkConfigSchema = z.object({
  available_watermarks: z.record(z.string()),
  selected_watermark_key: z.string(),
  default_use: z.boolean(),
  chart_opacity: z.number().min(0).max(1),
  chart_layer: z.enum(['above', 'below']),
  chart_x: z.number(),
  chart_y: z.number(),
  chart_sizex: z.number().positive(),
  chart_sizey: z.number().positive(),
  chart_xanchor: z.enum(['left', 'center', 'right']),
});

// Layout configuration schema
const BWRLayoutConfigSchema = z.object({
  margin_l: z.number().nonnegative(),
  margin_r: z.number().nonnegative(),
  margin_t_base: z.number().nonnegative(),
  margin_b_min: z.number(),
  plot_area_b_padding: z.number(),
  title_x: z.number().min(0).max(1),
  title_padding: z.number().nonnegative(),
  hovermode: z.string(),
  hoverdistance: z.number().positive(),
  spikedistance: z.number().positive(),
});

// Complete BWR configuration schema
export const BWRConfigSchema = z.object({
  general: BWRGeneralConfigSchema,
  colors: BWRColorsConfigSchema,
  fonts: BWRFontsConfigSchema,
  watermark: BWRWatermarkConfigSchema,
  layout: BWRLayoutConfigSchema,
  // Add other sections as needed
});

/**
 * Validates a partial BWR configuration
 * @param config Configuration object to validate
 * @returns Validated configuration or throws ZodError
 */
export function validateConfig<T extends Partial<z.infer<typeof BWRConfigSchema>>>(
  config: T
): T {
  return BWRConfigSchema.partial().parse(config) as T;
}

/**
 * Safely validates a configuration and returns errors if any
 * @param config Configuration to validate
 * @returns Object with either data or error
 */
export function safeValidateConfig<T extends Partial<z.infer<typeof BWRConfigSchema>>>(
  config: T
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = BWRConfigSchema.partial().safeParse(config);
  if (result.success) {
    return { success: true, data: result.data as T };
  }
  return { success: false, error: result.error };
}