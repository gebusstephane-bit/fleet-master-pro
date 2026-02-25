/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // ============================================
  // OUTPUT - Standalone désactivé (bug Next.js 14 avec route groups)
  // Réactiver avec output: 'standalone' si déploiement Docker
  // ============================================
  distDir: '.next',

  // ============================================
  // BUILD
  // ============================================
  compress: false,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false, // Build strict activé - erreurs résiduelles dans tests/
  },

  // ============================================
  // IMAGES - RemotePatterns pour Supabase/Stripe/OAuth
  // ============================================
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: '**.supabase.in', pathname: '/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.stripe.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.cloudfront.net', pathname: '/**' },
    ],
  },

  // ============================================
  // REDIRECTS - www vers non-www
  // ============================================
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.fleetmaster.pro' }],
        destination: 'https://fleetmaster.pro/:path*',
        permanent: true,
      },
    ];
  },

  // ============================================
  // HEADERS - Sécurité
  // ============================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://*.sentry.io https://*.ingest.sentry.io",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
        ],
      },
      {
        // Assets Next.js statiques — immutables (content-hashed)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Service Worker doit être servi sans cache
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  // ============================================
  // WEBPACK - Configuration supplémentaire
  // ============================================
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl/dist/mapbox-gl.js',
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // ============================================
  // EXPERIMENTAL
  // ============================================
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // ============================================
  // MISC
  // ============================================
  poweredByHeader: false,
  trailingSlash: false,
};

// ============================================
// SENTRY — Webpack plugin + source maps upload
// ============================================
module.exports = withSentryConfig(nextConfig, {
  // Organisation et projet Sentry (configurer dans .env ou GitHub Secrets)
  org: process.env.SENTRY_ORG || "fleetmaster",
  project: process.env.SENTRY_PROJECT || "fleetmaster-pro",

  // Silencieux hors CI (évite le bruit en développement local)
  silent: !process.env.CI,

  // Upload les source maps pour de vraies stack traces en prod
  widenClientFileUpload: true,

  // Cache les source maps côté client (ne pas les exposer publiquement)
  hideSourceMaps: true,

  // Supprime les logs Sentry du bundle client
  disableLogger: true,

  // Monitoring auto des déploiements Vercel
  automaticVercelMonitors: !!process.env.VERCEL,
});
