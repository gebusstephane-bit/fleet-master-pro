import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fleet-master.fr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/settings',
          '/vehicles',
          '/drivers',
          '/maintenance',
          '/routes',
          '/inspections',
          '/agenda',
          '/sos',
          '/superadmin',
          '/api/',
          '/onboarding',
          '/auth/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
