import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('internlog_locale')?.value as Locale) || 'fr'

  return (
    <I18nProvider initialLocale={locale}>
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg shadow-primary/20">
            <Image
              src="/logo.svg"
              alt="InternLog"
              width={80}
              height={80}
              className="rounded-2xl"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">InternLog</h1>
          <p className="mt-1 text-sm text-primary/80">Logbook Médical DES</p>
        </div>
        {children}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">
        <Link href="/legal/mentions" className="hover:text-primary">Mentions légales</Link>
        <span>·</span>
        <Link href="/legal/cgu" className="hover:text-primary">CGU</Link>
        <span>·</span>
        <Link href="/legal/confidentialite" className="hover:text-primary">Confidentialité</Link>
        <span>·</span>
        <Link href="/legal/cookies" className="hover:text-primary">Cookies</Link>
      </div>
    </div>
    </I18nProvider>
  )
}
