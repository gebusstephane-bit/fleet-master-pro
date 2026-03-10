import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring — 10% en prod, 100% en dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // NOTE: replayIntegration retiré ici — withSentryConfig (next.config.js) injecte
  // déjà Replay automatiquement. Deux instances simultanées causent un Uncaught Error
  // qui empêche React de s'hydrater → page blanche.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  // N'envoie rien si DSN absent (dev sans config Sentry)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filtre les erreurs non actionnables
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^AbortError/,
    /^NetworkError/,
    "Non-Error promise rejection captured",
    // Ignore le cas où Sentry Replay est déjà initialisé (double init guard)
    "Multiple Sentry Session Replay instances are not supported",
  ],
});
