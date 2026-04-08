import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPanel } from '@/components/settings/settings-panel'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, hospital:hospitals(name)')
    .eq('id', user.id)
    .single()

  const { data: hospitals } = await supabase
    .from('hospitals')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Paramètres</h2>
      <SettingsPanel profile={profile} hospitals={hospitals ?? []} />
    </div>
  )
}
