import { getHospitals, getSpecialties, getProcedures, getSupervisors } from '@/lib/actions/data'
import { getEntries } from '@/lib/actions/entries'
import { LogbookForm } from '@/components/logbook/logbook-form'
import { EntryList } from '@/components/logbook/entry-list'

export default async function LogbookPage() {
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
      />
      <EntryList entries={entries} totalCount={count} />
    </div>
  )
}
