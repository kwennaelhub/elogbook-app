import { getGardes } from '@/lib/actions/gardes'
import { getHospitals, getSupervisors } from '@/lib/actions/data'
import { CalendarView } from '@/components/calendar/calendar-view'

export default async function CalendarPage() {
  const now = new Date()
  const [gardes, hospitals, supervisors] = await Promise.all([
    getGardes(now.getMonth() + 1, now.getFullYear()),
    getHospitals(),
    getSupervisors(),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <CalendarView
        initialGardes={gardes}
        hospitals={hospitals}
        supervisors={supervisors}
        initialMonth={now.getMonth() + 1}
        initialYear={now.getFullYear()}
      />
    </div>
  )
}
