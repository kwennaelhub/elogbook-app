import { getHospitals, getSpecialties, getProcedures, getSupervisors } from '@/lib/actions/data'
import { getEntries } from '@/lib/actions/entries'
import { LogbookForm } from '@/components/logbook/logbook-form'
import { EntryList } from '@/components/logbook/entry-list'
import { createClient } from '@/lib/supabase/server'

export default async function LogbookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // On remonte le rôle pour que le form puisse adapter l'UI (supervisor /
  // service_chief saisissent leurs propres interventions sans sélectionner
  // de superviseur-validateur : leurs entries sont auto-validées).
  let userRole: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role
  }

  const [hospitals, specialties, procedures, supervisors, { data: entries, count }] = await Promise.all([
    getHospitals(),
    getSpecialties(),
    getProcedures(),
    getSupervisors(),
    getEntries(),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <LogbookForm
        hospitals={hospitals}
        specialties={specialties}
        procedures={procedures}
        supervisors={supervisors}
        userRole={userRole}
      />
      <EntryList entries={entries} totalCount={count} />
    </div>
  )
}
