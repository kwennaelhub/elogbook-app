import Link from 'next/link'

/**
 * Page 404 — route inexistante.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-7xl font-bold text-primary/20">404</div>
        <div className="mb-4 text-4xl">🔍</div>
        <h1 className="mb-2 text-xl font-bold text-foreground">
          Page introuvable
        </h1>
        <p className="mb-8 body-text">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/logbook"
            className="btn-primary"
          >
            Mon Logbook
          </Link>
          <Link
            href="/login"
            className="btn-secondary"
          >
            Connexion
          </Link>
        </div>
        <p className="mt-8 caption">
          InternLog — Logbook Médical DES
        </p>
      </div>
    </div>
  )
}
