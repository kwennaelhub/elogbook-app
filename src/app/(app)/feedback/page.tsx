import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FeedbackForm } from '@/components/feedback/feedback-form'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, title')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Retour d&apos;expérience</h2>
      <p className="mb-4 text-sm text-slate-500">
        Aidez-nous à améliorer E-Logbook en partageant vos impressions
      </p>
      <FeedbackForm
        userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
        userRole={profile?.role || 'student'}
      />
    </div>
  )
}
