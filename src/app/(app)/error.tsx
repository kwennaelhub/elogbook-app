'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Error Boundary pour les pages protégées (app).
 * Capture les erreurs dans les pages enfants sans casser le layout.
 * Gère le cas circuit breaker ouvert (Supabase indisponible).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const isCircuitOpen = error.message?.includes('CIRCUIT_OPEN') || error.message?.includes('circuit')
  const isNetwork = error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout')

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mb-4 text-5xl">
          {isCircuitOpen ? '🔌' : isNetwork ? '📡' : '😵'}
        </div>

        <h2 className="mb-2 text-xl font-bold text-foreground">
          {isCircuitOpen
            ? 'Service temporairement indisponible'
            : isNetwork
              ? 'Problème de connexion'
              : 'Une erreur est survenue'}
        </h2>

        <p className="mb-6 body-text">
          {isCircuitOpen
            ? 'Le serveur de données ne répond plus. Le système réessaiera automatiquement dans quelques secondes.'
            : isNetwork
              ? 'Impossible de contacter le serveur. Vérifiez votre connexion internet.'
              : 'Un problème inattendu a été détecté. Essayez de recharger la page.'}
        </p>

        {error.digest && (
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            Réf : {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary"
          >
            Réessayer
          </button>
          <a
            href="/logbook"
            className="btn-secondary"
          >
            Logbook
          </a>
        </div>
      </div>
    </div>
  )
}
