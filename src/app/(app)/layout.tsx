import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'
import { AppHeader } from '@/components/ui/app-header'
import { registerSession, getActiveSessions } from '@/lib/actions/sessions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
    <div className="flex min-h-full flex-col pb-16">
      <AppHeader profile={profile} otherSessionsCount={sessionCount > 1 ? sessionCount - 1 : 0} />
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
