/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Désactiver l'optimisation pour éviter le bug clientModules
  swcMinify: false,
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl/dist/mapbox-gl.js',
    };
    
    // Désactiver le tracing côté client
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
