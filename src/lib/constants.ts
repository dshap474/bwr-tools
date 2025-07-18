export const APP_CONFIG = {
  name: 'BWR Tools',
  description: 'Advanced plotting and data visualization tools',
  version: '1.0.0',
} as const

export const ROUTES = {
  home: '/',
  plots: '/plots',
  defillama: '/defillama',
  newsletter: '/newsletter',
  about: '/about',
} as const

export const TOOLS = [
  {
    name: 'Plots',
    path: ROUTES.plots,
    description: 'Advanced plotting and data visualization',
    features: [
      'Scatter/Line plots with dual axes',
      'Bar charts (vertical and horizontal)',
      'Multi-bar and stacked bar charts',
      'Metric share area charts',
      'Professional data tables',
    ],
  },
  {
    name: 'DeFiLlama',
    path: ROUTES.defillama,
    description: 'DeFi data analysis and visualization',
    features: [
      'Protocol TVL tracking',
      'Market share analysis',
      'Historical trend analysis',
      'Cross-protocol comparisons',
    ],
  },
  {
    name: 'Newsletter',
    path: ROUTES.newsletter,
    description: 'Daily newsletter content and insights',
    features: [
      'Market insights and analysis',
      'Key metrics and trends',
      'Research summaries',
      'Content suggestions',
    ],
  },
] as const