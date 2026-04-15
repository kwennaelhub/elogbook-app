import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Uniquement en production
  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,
})
