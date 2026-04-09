import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-emerald-600">InternLog</Link>
          <Link href="/login" className="text-sm text-slate-500 hover:text-emerald-600">Connexion</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4 text-xs text-slate-500">
          <Link href="/legal/mentions" className="hover:text-emerald-600">Mentions légales</Link>
          <Link href="/legal/cgu" className="hover:text-emerald-600">CGU</Link>
          <Link href="/legal/confidentialite" className="hover:text-emerald-600">Confidentialité</Link>
          <Link href="/legal/cookies" className="hover:text-emerald-600">Cookies</Link>
        </div>
      </footer>
    </div>
  )
}
