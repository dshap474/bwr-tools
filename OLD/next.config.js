/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Configure module transpilation - TEMPORARILY DISABLED
  // transpilePackages: [
  //   '@bwr-tools/ui',
  //   '@bwr-tools/config',
  //   '@bwr-tools/types',
  //   '@bwr-tools/file-parser',
  //   '@bwr-tools/plots-core',
  //   '@bwr-tools/plots-charts',
  //   '@bwr-tools/plots-data',
  //   '@bwr-tools/plotly-wrapper',
  // ],
  
  // Webpack configuration
  webpack: (config) => {
    // Handle worker files
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'worker-loader' },
    });
    
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  
  // Proxy for development server comparison
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: 'http://localhost:5000/:path*',
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;