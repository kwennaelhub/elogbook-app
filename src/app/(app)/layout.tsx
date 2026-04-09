import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'
import { AppHeader } from '@/components/ui/app-header'
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

  // Profil — avec fallback si la table subscriptions n'existe pas encore
  let profile = null
  const { data, error } = await supabase
    .from('profiles')
    .select('*, subscription:subscriptions(plan, status)')
    .eq('id', user.id)
    .single()

  if (error && !data) {
    const { data: fallback } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = fallback
  } else {
    profile = data
  }

  // Session tracking — résilient, pas de re-auth (réutilise le même client supabase)
  let sessionCount = 0
  try {
    const token = cookieStore.get('internlog_session_token')?.value
    if (token) {
      await supabase
        .from('active_sessions')
        .upsert({
          user_id: user.id,
          session_token: token,
          last_active: new Date().toISOString(),
        }, { onConflict: 'session_token' })
    } else {
      const newToken = crypto.randomUUID()
      cookieStore.set('internlog_session_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
      await supabase
        .from('active_sessions')
        .upsert({
          user_id: user.id,
          session_token: newToken,
          last_active: new Date().toISOString(),
        }, { onConflict: 'session_token' })
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('active_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('last_active', cutoff)
    sessionCount = count ?? 0
  } catch {
    // Table active_sessions pas encore créée — ignore
  }

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
