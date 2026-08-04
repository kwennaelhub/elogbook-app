import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeletionPendingPanel } from '@/components/gdpr/deletion-pending-panel'

export const dynamic = 'force-dynamic'

export default async function DeletionPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, email, deletion_requested_at, deletion_scheduled_for, deletion_reason')
    .eq('id', user.id)
    .single()

  // Si aucune demande active, retour à l'app (sécurité + confort).
  if (!profile?.deletion_requested_at) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <DeletionPendingPanel
          firstName={profile.first_name ?? ''}
          email={profile.email}
          requestedAt={profile.deletion_requested_at}
          scheduledFor={profile.deletion_scheduled_for ?? profile.deletion_requested_at}
          reason={profile.deletion_reason}
        />
      </div>
    </div>
  )
}
