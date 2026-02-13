/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Désactiver complètement le output file tracing
  outputFileTracing: false,
  // Désactiver l'optimisation SWC qui cause des bugs
  swcMinify: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    // Désactiver les optimisations expérimentales problématiques
    optimizeCss: false,
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl/dist/mapbox-gl.js',
    };
    return config;
  },
};

module.exports = nextConfig;
