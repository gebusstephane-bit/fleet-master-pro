/**
 * Root Layout - FleetMaster Pro
 * Configuration globale de l'application
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'FleetMaster - Gestion de flotte intelligente',
  description: 'La première plateforme de gestion de flotte qui anticipe les pannes avant qu\'elles n\'arrivent. Réduisez vos coûts de 30% avec la maintenance prédictive.',
  keywords: ['gestion flotte', 'transport', 'logistique', 'maintenance prédictive', 'GPS', 'véhicules', 'fleet management'],
  authors: [{ name: 'FleetMaster' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  icons: {
    icon: '/logo-icon.svg',
    shortcut: '/logo-icon.svg',
    apple: '/logo-icon.svg',
  },
  openGraph: {
    title: 'FleetMaster - Gestion de flotte intelligente',
    description: 'La première plateforme de gestion de flotte qui anticipe les pannes avant qu\'elles n\'arrivent.',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FleetMaster - Gestion de flotte intelligente',
    description: 'La première plateforme de gestion de flotte qui anticipe les pannes.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
