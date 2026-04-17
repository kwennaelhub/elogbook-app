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
 *
 * Variables d'environnement :
 *   LOG_LEVEL — override du niveau (trace|debug|info|warn|error|fatal|silent)
 *   NODE_ENV  — production=JSON structuré, development=pino-pretty, test=silent
 */

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

// LOG_LEVEL env var pour override (utile debug prod temporaire)
const level = process.env.LOG_LEVEL || (isTest ? 'silent' : isProduction ? 'info' : 'debug')

export const logger = pino({
  level,
  ...(isProduction
    ? {
        // Production : JSON structuré (parsable par Vercel/Sentry/Datadog)
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : isTest
      ? {}
      : {
          // Dev : pino-pretty pour lisibilité terminal
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
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
