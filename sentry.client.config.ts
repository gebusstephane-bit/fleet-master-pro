import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring — 10% en prod, 100% en dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay : uniquement en cas d'erreur (RGPD friendly)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [
    Sentry.replayIntegration({
      // Masque toutes les données utilisateur dans les replays
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // N'envoie rien si DSN absent (dev sans config Sentry)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filtre les erreurs non actionnables
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^AbortError/,
    /^NetworkError/,
    "Non-Error promise rejection captured",
  ],
});
