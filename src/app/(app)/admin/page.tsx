import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPanel } from '@/components/admin/admin-panel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/logbook')
  }

  const [
    { data: registryEntries, count: registryCount },
    { data: users, count: usersCount },
  ] = await Promise.all([
    supabase.from('des_registry').select('*', { count: 'exact' }).order('last_name').limit(50),
    supabase.from('profiles').select('*, hospital:hospitals(name)', { count: 'exact' }).order('last_name').limit(50),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Administration</h2>
      <AdminPanel
        registryEntries={registryEntries ?? []}
        registryCount={registryCount ?? 0}
        users={users ?? []}
        usersCount={usersCount ?? 0}
      />
    </div>
  )
}
