import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'
import { AppHeader } from '@/components/ui/app-header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, subscription:subscriptions(plan, status)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-full flex-col pb-16">
      <AppHeader profile={profile} />
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
