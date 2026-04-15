import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary">InternLog</Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">Connexion</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border bg-card px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/legal/mentions" className="hover:text-primary">Mentions légales</Link>
          <Link href="/legal/cgu" className="hover:text-primary">CGU</Link>
          <Link href="/legal/confidentialite" className="hover:text-primary">Confidentialité</Link>
          <Link href="/legal/cookies" className="hover:text-primary">Cookies</Link>
        </div>
      </footer>
    </div>
  )
}
