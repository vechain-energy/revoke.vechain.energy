const withBundleAnalyzer = require('next-bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  experimental: {
    // Optimize client-side code
    optimizePackageImports: ['@heroicons/react'],
  },
  compiler: {
    // Optimize client bundle
    removeConsole: process.env.NODE_ENV === 'production',
  },
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        'pino-pretty': false,
      };
    }
    config.externals = [...(config.externals || []), 'pino-pretty', 'rate-limiter-flexible'];
    
    config.module.rules.push({
      test: /rate-limiter-flexible/,
      use: 'null-loader'
    });

    return config;
  },
};

// Apply plugins
module.exports = withNextIntl(withBundleAnalyzer(nextConfig));
