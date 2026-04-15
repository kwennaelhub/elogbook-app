'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Global Error Handler — erreurs fatales (layout root cassé, crash React).
 * Remplace le layout entier, donc doit inclure <html> et <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: 'white',
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              Erreur critique
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
              Une erreur inattendue s&apos;est produite. L&apos;équipe InternLog a été notifiée.
            </p>
            {error.digest && (
              <p style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', margin: '0 0 24px' }}>
                Réf : {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: '#4f6fff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '8px',
              }}
            >
              Réessayer
            </button>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                background: '#f1f5f9',
                color: '#475569',
                textDecoration: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
