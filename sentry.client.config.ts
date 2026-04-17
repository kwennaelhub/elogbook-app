import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Release : liée au commit pour tracking des régressions
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',

  // Envoyer 100 % des erreurs, 10 % des transactions (perf)
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Uniquement en production (si DSN configuré)
  enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filtrer les erreurs bruyantes côté client
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'ChunkLoadError',
    /Loading chunk \d+ failed/,
    /Network request failed/,
    /AbortError/,
  ],

  // Environnement
  environment: process.env.NODE_ENV,
})
