/**
 * Root Layout - FleetMaster Pro
 * Configuration globale de l'application
 */

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'FleetMaster Pro - Gestion de flotte intelligente',
    template: '%s | FleetMaster Pro',
  },
  description: 'SaaS de gestion de flotte pour transporteurs. Maintenance prédictive, tournées optimisées, conformité réglementaire. Réduisez vos coûts de 30%.',
  keywords: ['gestion flotte', 'transport', 'logistique', 'maintenance prédictive', 'GPS', 'véhicules', 'fleet management', 'SaaS transport'],
  authors: [{ name: 'FleetMaster Pro' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fleet-master.fr'),

  // ── PWA manifest ──────────────────────────────────────────────────────────
  manifest: '/manifest.json',

  // ── Icônes ────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-96x96.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // ── Apple Web App (Add to Home Screen iOS) ────────────────────────────────
  appleWebApp: {
    capable: true,
    title: 'FleetMaster Pro',
    statusBarStyle: 'black-translucent',
  },

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    title: 'FleetMaster Pro - Gestion de flotte intelligente',
    description: 'SaaS de gestion de flotte pour transporteurs. Maintenance, tournées, conformité réglementaire.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://fleet-master.fr',
    siteName: 'FleetMaster Pro',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FleetMaster Pro - Tableau de bord de gestion de flotte',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },

  // ── Twitter Card ──────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'FleetMaster Pro - Gestion de flotte intelligente',
    description: 'SaaS de gestion de flotte pour transporteurs. Réduisez vos coûts de 30% avec la maintenance prédictive.',
    images: ['/og-image.jpg'],
  },

  // ── Indexation ────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  themeColor: '#09090b',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
