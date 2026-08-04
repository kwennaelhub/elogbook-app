'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, X, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  firstName: string
  email: string
  requestedAt: string
  scheduledFor: string
  reason: string | null
}

export function DeletionPendingPanel({ firstName, email, requestedAt, scheduledFor, reason }: Props) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { daysLeft, hoursLeft, formattedDate } = useMemo(() => {
    const target = new Date(scheduledFor).getTime()
    const diff = Math.max(0, target - now)
    const d = Math.floor(diff / (24 * 60 * 60 * 1000))
    const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(scheduledFor))
    return { daysLeft: d, hoursLeft: h, formattedDate: fmt }
  }, [scheduledFor, now])

  const handleCancel = async () => {
    setCancelling(true)
    setCancelResult(null)
    try {
      const res = await fetch('/api/account/delete/cancel', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCancelResult({ error: body.error || 'gdpr.error.cancelFailed' })
        return
      }
      setCancelResult({ success: true })
      setTimeout(() => router.push('/'), 1500)
    } finally {
      setCancelling(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const requestedDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(requestedAt))

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="bg-gradient-to-r from-red-900 to-red-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-200" />
          <div>
            <h1 className="text-lg font-semibold text-white">Compte en cours de suppression</h1>
            <p className="text-sm text-red-200">Article 17 RGPD — droit à l&apos;effacement</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6 text-slate-700">
        <p className="text-sm leading-relaxed">
          Bonjour {firstName || 'utilisateur'}, votre demande de suppression du compte
          associé à <strong>{email}</strong> a été enregistrée le{' '}
          <strong>{requestedDate}</strong>.
        </p>

        <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
          <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wide text-red-700">
            <Clock className="h-3.5 w-3.5" />
            Effacement effectif dans
          </div>
          <div className="text-3xl font-bold text-red-900">
            {daysLeft} jour{daysLeft > 1 ? 's' : ''} {hoursLeft > 0 ? `${hoursLeft}h` : ''}
          </div>
          <div className="mt-1 text-xs text-red-600">soit le {formattedDate}</div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <p className="mb-2 font-medium text-slate-900">Pendant ces {daysLeft > 0 ? daysLeft : 30} jours :</p>
          <ul className="ml-4 list-disc space-y-1 text-slate-600">
            <li>Vous ne pouvez plus créer ni modifier d&apos;entrées, gardes ou notes.</li>
            <li>Vous pouvez toujours annuler cette demande à tout moment ci-dessous.</li>
            <li>Après l&apos;échéance, vos données personnelles seront effacées ou anonymisées.</li>
          </ul>
        </div>

        {reason ? (
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">Raison indiquée :</span> {reason}
          </div>
        ) : null}

        {cancelResult?.success ? (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Demande annulée. Redirection en cours…
          </div>
        ) : cancelResult?.error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Erreur lors de l&apos;annulation : {cancelResult.error}. Réessayez ou contactez le support.
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleCancel}
            disabled={cancelling || cancelResult?.success}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            {cancelling ? 'Annulation…' : 'Annuler ma demande de suppression'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Un email de confirmation avec ces mêmes informations vous a été envoyé.
        </p>
      </div>
    </div>
  )
}
