import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEntriesForSupervisor } from '@/lib/actions/entries'
import { SupervisionPanel } from '@/components/supervision/supervision-panel'

export default async function SupervisionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    !['supervisor', 'service_chief', 'institution_admin', 'admin', 'superadmin', 'developer'].includes(profile.role)
  ) {
    redirect('/logbook')
  }

  const { pending, validated, rejected } = await getEntriesForSupervisor()

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <SupervisionPanel
        pending={pending}
        validated={validated}
        rejected={rejected}
      />
    </div>
  )
}
