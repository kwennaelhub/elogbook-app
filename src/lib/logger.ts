import pino from 'pino'

/**
 * Logger structuré InternLog — basé sur pino
 *
 * Niveaux : trace < debug < info < warn < error < fatal
 *
 * Usage :
 *   import { logger } from '@/lib/logger'
 *   logger.info({ userId, plan }, 'Abonnement activé')
 *   logger.error({ err, endpoint }, 'Webhook PayPal échoué')
 *
 * Modules enfants (contexte automatique) :
 *   const log = logger.child({ module: 'paypal' })
 *   log.info({ subscriptionId }, 'Subscription created')
 */

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  ...(isProduction
    ? {
        // Production : JSON structuré (parsable par Vercel/Sentry/Datadog)
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Dev : lisible dans le terminal
        transport: {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
})

// Loggers enfants pré-configurés par module
export const authLogger = logger.child({ module: 'auth' })
export const paypalLogger = logger.child({ module: 'paypal' })
export const emailLogger = logger.child({ module: 'email' })
export const adhesionLogger = logger.child({ module: 'adhesion' })
export const adminLogger = logger.child({ module: 'admin' })
export const circuitLogger = logger.child({ module: 'circuit-breaker' })
export const uploadLogger = logger.child({ module: 'upload' })
