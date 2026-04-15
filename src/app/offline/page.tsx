'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-foreground">Mode hors-ligne</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Vous n'avez pas de connexion internet.<br />
          Les pages visitées sont disponibles en cache.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
