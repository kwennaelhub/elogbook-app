/**
 * Circuit Breaker pour protéger contre les pannes de services externes.
 *
 * 3 états :
 * - CLOSED  → tout passe normalement
 * - OPEN    → requêtes rejetées immédiatement (service en panne)
 * - HALF_OPEN → laisse passer 1 requête test pour vérifier la reprise
 *
 * Compatible Edge Runtime (pas de Node.js APIs).
 */

import { circuitLogger as log } from '@/lib/logger'

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitBreakerOptions {
  /** Nombre d'échecs consécutifs avant ouverture du circuit */
  failureThreshold: number
  /** Durée en ms pendant laquelle le circuit reste ouvert avant de tester */
  resetTimeout: number
  /** Nom du circuit (pour les logs) */
  name: string
}

interface CircuitBreakerState {
  state: CircuitState
  failures: number
  lastFailure: number
  lastSuccess: number
}

const circuits = new Map<string, CircuitBreakerState>()

function getCircuit(name: string): CircuitBreakerState {
  if (!circuits.has(name)) {
    circuits.set(name, {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      lastSuccess: Date.now(),
    })
  }
  return circuits.get(name)!
}

export function createCircuitBreaker(options: CircuitBreakerOptions) {
  const { failureThreshold, resetTimeout, name } = options

  return {
    /**
     * Exécute une fonction protégée par le circuit breaker.
     * Lève une erreur CircuitOpenError si le circuit est ouvert.
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      const circuit = getCircuit(name)

      // Vérifier si on peut passer de OPEN → HALF_OPEN
      if (circuit.state === 'OPEN') {
        const elapsed = Date.now() - circuit.lastFailure
        if (elapsed >= resetTimeout) {
          circuit.state = 'HALF_OPEN'
          log.info({ name, elapsed: Math.round(elapsed / 1000) }, 'OPEN → HALF_OPEN (test de reprise)')
        } else {
          const retryIn = Math.ceil((resetTimeout - elapsed) / 1000)
          throw new CircuitOpenError(
            `Circuit ${name} ouvert — service indisponible. Réessai dans ${retryIn}s.`,
            retryIn
          )
        }
      }

      try {
        const result = await fn()
        this.onSuccess()
        return result
      } catch (error) {
        this.onFailure()
        throw error
      }
    },

    /** Signale un succès — ferme le circuit */
    onSuccess() {
      const circuit = getCircuit(name)
      if (circuit.state === 'HALF_OPEN') {
        log.info({ name }, 'HALF_OPEN → CLOSED (service rétabli)')
      }
      circuit.state = 'CLOSED'
      circuit.failures = 0
      circuit.lastSuccess = Date.now()
    },

    /** Signale un échec — incrémente ou ouvre le circuit */
    onFailure() {
      const circuit = getCircuit(name)
      circuit.failures++
      circuit.lastFailure = Date.now()

      if (circuit.state === 'HALF_OPEN') {
        // Le test a échoué — retour en OPEN
        circuit.state = 'OPEN'
        log.warn({ name, failures: circuit.failures }, 'HALF_OPEN → OPEN (test échoué)')
      } else if (circuit.failures >= failureThreshold) {
        circuit.state = 'OPEN'
        log.warn({ name, failures: circuit.failures }, 'CLOSED → OPEN (seuil atteint)')
      }
    },

    /** État actuel du circuit */
    getState(): { state: CircuitState; failures: number; lastFailure: number; lastSuccess: number } {
      return { ...getCircuit(name) }
    },

    /** Reset manuel */
    reset() {
      const circuit = getCircuit(name)
      circuit.state = 'CLOSED'
      circuit.failures = 0
      log.info({ name }, 'Reset manuel → CLOSED')
    },
  }
}

export class CircuitOpenError extends Error {
  public retryAfter: number

  constructor(message: string, retryAfter: number) {
    super(message)
    this.name = 'CircuitOpenError'
    this.retryAfter = retryAfter
  }
}

// =============================================
// Circuit Breaker pré-configuré pour Supabase
// =============================================
export const supabaseCircuit = createCircuitBreaker({
  name: 'supabase',
  failureThreshold: 5,   // 5 échecs consécutifs → circuit ouvert
  resetTimeout: 30_000,  // 30 secondes avant de retester
})
