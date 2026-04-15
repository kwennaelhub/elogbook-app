import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Envoyer 100% des erreurs, 10% des transactions (perf)
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Uniquement en production
  enabled: process.env.NODE_ENV === 'production',

  // Filtrer les erreurs bruyantes
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'ChunkLoadError',
    /Loading chunk \d+ failed/,
  ],

  // Environnement
  environment: process.env.NODE_ENV,
})
