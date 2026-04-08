'use client'

import { useState, useTransition } from 'react'
import { Check, X, Clock, ChevronDown, AlertTriangle, MapPin, Loader2, Shield } from 'lucide-react'
import { validateEntry, rejectEntry } from '@/lib/actions/entries'
import { OPERATOR_ROLE_LABELS, SUPERVISOR_TITLE_LABELS } from '@/types/database'
import type { SupervisionEntry, SupervisorTitle } from '@/types/database'

type Tab = 'pending' | 'validated' | 'rejected'

interface Props {
  pending: SupervisionEntry[]
  validated: SupervisionEntry[]
  rejected: SupervisionEntry[]
}

export function SupervisionPanel({ pending, validated, rejected }: Props) {
  const [tab, setTab] = useState<Tab>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'En attente', count: pending.length },
    { key: 'validated', label: 'Validés', count: validated.length },
    { key: 'rejected', label: 'Rejetés', count: rejected.length },
  ]

  const entries = tab === 'pending' ? pending : tab === 'validated' ? validated : rejected

  function handleValidate(entryId: string) {
    setActionId(entryId)
    setFeedback(null)
    startTransition(async () => {
      const result = await validateEntry(entryId)
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: 'Acte validé avec succès' })
      }
      setActionId(null)
    })
  }

  function handleReject(entryId: string) {
    if (rejectingId === entryId) {
      // Confirmer le rejet
      setActionId(entryId)
      setFeedback(null)
      startTransition(async () => {
        const result = await rejectEntry(entryId, rejectReason || undefined)
        if (result.error) {
          setFeedback({ type: 'error', message: result.error })
        } else {
          setFeedback({ type: 'success', message: 'Acte rejeté' })
        }
        setRejectingId(null)
        setRejectReason('')
        setActionId(null)
      })
    } else {
      setRejectingId(entryId)
      setRejectReason('')
    }
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
          <Shield className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Supervision</h1>
          <p className="text-xs text-slate-500">Validez les actes de vos étudiants DES</p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {feedback.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {/* Onglets */}
      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setExpanded(null); setRejectingId(null) }}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            <span className={`ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              tab === key
                ? key === 'pending' ? 'bg-amber-100 text-amber-700'
                  : key === 'validated' ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
                : 'bg-slate-200 text-slate-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {entries.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            {tab === 'pending' && 'Aucun acte en attente de validation'}
            {tab === 'validated' && 'Aucun acte validé'}
            {tab === 'rejected' && 'Aucun acte rejeté'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              {/* Ligne résumé */}
              <button
                type="button"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  entry.is_validated
                    ? 'bg-green-100 text-green-700'
                    : entry.validated_at
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {entry.is_validated ? <Check className="h-4 w-4" />
                    : entry.validated_at ? <X className="h-4 w-4" />
                    : <Clock className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {(entry.student as { first_name: string; last_name: string } | undefined)?.first_name}{' '}
                    {(entry.student as { first_name: string; last_name: string } | undefined)?.last_name}
                    {(entry.student as { des_level?: string } | undefined)?.des_level && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">
                        {(entry.student as { des_level: string }).des_level}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {(entry.procedure as { name: string } | undefined)?.name || (entry.specialty as { name: string } | undefined)?.name || 'Intervention'}{' '}
                    · {new Date(entry.intervention_date).toLocaleDateString('fr-FR')}{' '}
                    · {(entry.hospital as { name: string } | undefined)?.name}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {entry.entry_mode === 'retrospective' && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {entry.geo_latitude && (
                    <MapPin className="h-3.5 w-3.5 text-green-500" />
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Détails */}
              {expanded === entry.id && (
                <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                  <dl className="space-y-1.5 text-xs">
                    {(entry.student as { matricule?: string } | undefined)?.matricule && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Matricule</dt>
                        <dd className="font-medium">{(entry.student as { matricule: string }).matricule}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Rôle opérateur</dt>
                      <dd className="font-medium">{OPERATOR_ROLE_LABELS[entry.operator_role]}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Contexte</dt>
                      <dd className="font-medium">{entry.context === 'programmed' ? 'Programmé' : 'Urgence'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Patient</dt>
                      <dd className="font-medium">{entry.patient_type === 'real' ? 'Réel' : 'Simulation'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Mode</dt>
                      <dd className={`font-medium ${entry.entry_mode === 'retrospective' ? 'text-amber-600' : 'text-green-600'}`}>
                        {entry.entry_mode === 'prospective' ? 'Prospectif' : 'Rétrospectif'}
                      </dd>
                    </div>
                    {entry.supervisor && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Superviseur</dt>
                        <dd className="font-medium">
                          {(entry.supervisor as { title?: string }).title && SUPERVISOR_TITLE_LABELS[(entry.supervisor as { title: string }).title as SupervisorTitle]}{' '}
                          {(entry.supervisor as { last_name: string }).last_name}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Soumis le</dt>
                      <dd className="font-medium">{new Date(entry.submitted_at).toLocaleString('fr-FR')}</dd>
                    </div>
                    {entry.notes && (
                      <div className="pt-1">
                        <dt className="text-slate-500">Notes</dt>
                        <dd className="mt-0.5 text-slate-700">{entry.notes}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Actions de validation (uniquement onglet pending) */}
                  {tab === 'pending' && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      {rejectingId === entry.id && (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motif du rejet (optionnel)…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-1 focus:ring-red-200"
                            rows={2}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleValidate(entry.id)}
                          disabled={isPending && actionId === entry.id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {isPending && actionId === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Valider
                        </button>
                        <button
                          onClick={() => handleReject(entry.id)}
                          disabled={isPending && actionId === entry.id}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            rejectingId === entry.id
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {isPending && actionId === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          {rejectingId === entry.id ? 'Confirmer le rejet' : 'Rejeter'}
                        </button>
                      </div>
                      {rejectingId === entry.id && (
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason('') }}
                          className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  )}

                  {/* Info rejet */}
                  {tab === 'rejected' && entry.notes?.startsWith('[REJETÉ]') && (
                    <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                      <span className="font-semibold">Motif :</span> {entry.notes.replace('[REJETÉ] ', '')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
