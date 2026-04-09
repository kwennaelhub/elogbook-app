import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'
import { AppHeader } from '@/components/ui/app-header'
import { registerSession, getActiveSessions } from '@/lib/actions/sessions'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const locale = (cookieStore.get('internlog_locale')?.value as Locale) || 'fr'

  const [{ data: profile }, _] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, subscription:subscriptions(plan, status)')
      .eq('id', user.id)
      .single(),
    registerSession(),
  ])

  const { count: sessionCount } = await getActiveSessions()

  return (
    <I18nProvider initialLocale={locale}>
      <div className="flex min-h-full flex-col bg-slate-50 pb-16">
        <AppHeader profile={profile} otherSessionsCount={sessionCount > 1 ? sessionCount - 1 : 0} />
        <main className="flex-1 pb-4">
          {children}
        </main>
        <BottomNav />
      </div>
    </I18nProvider>
  )
}
