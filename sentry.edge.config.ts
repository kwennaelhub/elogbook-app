import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Release : liée au commit pour tracking des régressions
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  tracesSampleRate: 0.1,

  // Uniquement en production (si DSN configuré)
  enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
})
