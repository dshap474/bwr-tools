import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
        '.turbo/',
        '.next/'
      ]
    }
  },
  resolve: {
    alias: {
      '@bwr-tools/plots-core': path.resolve(__dirname, './packages/tools/plots/core/src'),
      '@bwr-tools/plots-charts': path.resolve(__dirname, './packages/tools/plots/charts/src'),
      '@bwr-tools/config': path.resolve(__dirname, './packages/config/src'),
      '@bwr-tools/plots-data': path.resolve(__dirname, './packages/tools/plots/data/src'),
      '@bwr-tools/ui': path.resolve(__dirname, './packages/ui/src'),
      '@bwr-tools/plotly-wrapper': path.resolve(__dirname, './packages/tools/plots/plotly-wrapper/src'),
      '@bwr-tools/types': path.resolve(__dirname, './packages/types/src'),
    }
  }
});