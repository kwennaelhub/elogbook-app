'use client'

import { useState, useTransition } from 'react'
import { Plus, X, ChevronDown, Loader2, HeartPulse, TrendingUp, Clock, Activity, Edit3, Trash2 } from 'lucide-react'
import { createFollowup, updateFollowup, deleteFollowup } from '@/lib/actions/followups'
import { FOLLOWUP_OUTCOME_LABELS, FOLLOWUP_OUTCOME_COLORS, AGE_RANGE_LABELS } from '@/types/database'
import type { PatientFollowupWithEntry, FollowupOutcome, AgeRange, PatientSex } from '@/types/database'

interface Stats {
  total: number
  outcomes: Record<string, number>
  successRate: number
  complicationRate: number
  avgStay: number
}

interface Props {
  initialFollowups: PatientFollowupWithEntry[]
  stats: Stats | null
}

export function FollowupPanel({ initialFollowups, stats }: Props) {
  const [followups] = useState(initialFollowups)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Formulaire création
  const [interventionDate, setInterventionDate] = useState('')
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('')
  const [sex, setSex] = useState<PatientSex | ''>('')
  const [asaScore, setAsaScore] = useState<number | ''>('')
  const [formNotes, setFormNotes] = useState('')

  // Formulaire édition
  const [editOutcome, setEditOutcome] = useState<FollowupOutcome>('pending')
  const [editDischarge, setEditDischarge] = useState('')
  const [editComplicationType, setEditComplicationType] = useState('')
  const [editComplicationDate, setEditComplicationDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  function resetForm() {
    setInterventionDate('')
    setAgeRange('')
    setSex('')
    setAsaScore('')
    setFormNotes('')
    setShowForm(false)
  }

  function openEdit(f: PatientFollowupWithEntry) {
    setEditingId(f.id)
    setEditOutcome(f.outcome)
    setEditDischarge(f.discharge_date || '')
    setEditComplicationType(f.complication_type || '')
    setEditComplicationDate(f.complication_date || '')
    setEditNotes(f.notes || '')
    setExpanded(f.id)
  }

  function handleCreate() {
    setFeedback(null)
    startTransition(async () => {
      const result = await createFollowup({
        intervention_date: interventionDate,
        age_range: ageRange as AgeRange || undefined,
        sex: sex as PatientSex || undefined,
        asa_score: asaScore ? Number(asaScore) : undefined,
        notes: formNotes || undefined,
      })
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: 'Suivi créé' })
        resetForm()
      }
    })
  }

  function handleUpdate(followupId: string) {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateFollowup(followupId, {
        outcome: editOutcome,
        discharge_date: editDischarge || null,
        complication_type: editComplicationType || null,
        complication_date: editComplicationDate || null,
        notes: editNotes || null,
      })
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: 'Suivi mis à jour' })
        setEditingId(null)
      }
    })
  }

  function handleDelete(followupId: string) {
    setFeedback(null)
    startTransition(async () => {
      const result = await deleteFollowup(followupId)
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: 'Suivi supprimé' })
      }
    })
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
            <HeartPulse className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Suivi patients</h1>
            <p className="text-xs text-slate-500">{followups.length} suivi{followups.length !== 1 ? 's' : ''} · Données anonymisées</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Annuler' : 'Nouveau'}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-3 rounded-lg p-2.5 text-xs ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Stats rapides */}
      {stats && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-[9px] text-slate-500">Total</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-bold text-emerald-600">{stats.successRate}%</p>
            <p className="text-[9px] text-slate-500">Succès</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-bold text-orange-600">{stats.complicationRate}%</p>
            <p className="text-[9px] text-slate-500">Complications</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xl font-bold text-indigo-600">{stats.avgStay}j</p>
            <p className="text-[9px] text-slate-500">Séjour moy.</p>
          </div>
        </div>
      )}

      {/* Répartition des résultats */}
      {stats && stats.total > 0 && (
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
          {(['success', 'complication', 'failure', 'deceased', 'pending'] as FollowupOutcome[]).map(o => {
            const pct = (stats.outcomes[o] || 0) / stats.total * 100
            if (pct === 0) return null
            const colors: Record<string, string> = {
              success: 'bg-emerald-500', complication: 'bg-orange-500', failure: 'bg-red-500', deceased: 'bg-slate-500', pending: 'bg-amber-400'
            }
            return <div key={o} className={`${colors[o]} transition-all`} style={{ width: `${pct}%` }} title={`${FOLLOWUP_OUTCOME_LABELS[o]} ${Math.round(pct)}%`} />
          })}
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Nouveau suivi patient</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date d'intervention *</label>
              <input type="date" value={interventionDate} onChange={e => setInterventionDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tranche d'âge</label>
                <select value={ageRange} onChange={e => setAgeRange(e.target.value as AgeRange)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-rose-300 focus:outline-none">
                  <option value="">—</option>
                  {Object.entries(AGE_RANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Sexe</label>
                <select value={sex} onChange={e => setSex(e.target.value as PatientSex)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-rose-300 focus:outline-none">
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">ASA</label>
                <select value={asaScore} onChange={e => setAsaScore(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-rose-300 focus:outline-none">
                  <option value="">—</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>ASA {n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none"
                placeholder="Contexte, type d'intervention…" />
            </div>
            <button onClick={handleCreate} disabled={isPending || !interventionDate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer le suivi
            </button>
          </div>
        </div>
      )}

      {/* Liste des suivis */}
      {followups.length === 0 && !showForm ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <HeartPulse className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">Aucun suivi patient</p>
          <p className="mt-1 text-xs text-slate-400">Créez votre premier suivi pour suivre l'évolution post-opératoire</p>
        </div>
      ) : (
        <div className="space-y-2">
          {followups.map(f => {
            const isExpanded = expanded === f.id
            const isEditing = editingId === f.id
            const entryInfo = f.entry as { procedure?: { name: string } | null; specialty?: { name: string } | null; hospital?: { name: string } | null } | undefined

            return (
              <div key={f.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => { setExpanded(isExpanded ? null : f.id); if (isEditing) setEditingId(null) }}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${FOLLOWUP_OUTCOME_COLORS[f.outcome]}`}>
                    {f.outcome === 'pending' ? <Clock className="h-4 w-4" />
                      : f.outcome === 'success' ? <TrendingUp className="h-4 w-4" />
                      : <Activity className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {f.anonymous_id}
                      <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${FOLLOWUP_OUTCOME_COLORS[f.outcome]}`}>
                        {FOLLOWUP_OUTCOME_LABELS[f.outcome]}
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {new Date(f.intervention_date).toLocaleDateString('fr-FR')}
                      {entryInfo?.procedure?.name && ` · ${entryInfo.procedure.name}`}
                      {f.follow_up_days != null && ` · ${f.follow_up_days}j`}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                    {!isEditing ? (
                      <>
                        <dl className="space-y-1.5 text-xs">
                          {f.age_range && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Tranche d'âge</dt>
                              <dd className="font-medium">{AGE_RANGE_LABELS[f.age_range]}</dd>
                            </div>
                          )}
                          {f.sex && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Sexe</dt>
                              <dd className="font-medium">{f.sex === 'M' ? 'Masculin' : 'Féminin'}</dd>
                            </div>
                          )}
                          {f.asa_score && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Score ASA</dt>
                              <dd className="font-medium">ASA {f.asa_score}</dd>
                            </div>
                          )}
                          {f.discharge_date && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Date de sortie</dt>
                              <dd className="font-medium">{new Date(f.discharge_date).toLocaleDateString('fr-FR')}</dd>
                            </div>
                          )}
                          {f.complication_type && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Complication</dt>
                              <dd className="font-medium text-orange-600">{f.complication_type}</dd>
                            </div>
                          )}
                          {entryInfo?.hospital?.name && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Hôpital</dt>
                              <dd className="font-medium">{entryInfo.hospital.name}</dd>
                            </div>
                          )}
                          {f.notes && (
                            <div className="pt-1">
                              <dt className="text-slate-500">Notes</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{f.notes}</dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => openEdit(f)}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                            <Edit3 className="h-3 w-3" /> Modifier
                          </button>
                          <button onClick={() => handleDelete(f.id)} disabled={isPending}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                            <Trash2 className="h-3 w-3" /> Supprimer
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2.5">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Résultat</label>
                          <select value={editOutcome} onChange={e => setEditOutcome(e.target.value as FollowupOutcome)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none">
                            {Object.entries(FOLLOWUP_OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Date de sortie</label>
                          <input type="date" value={editDischarge} onChange={e => setEditDischarge(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none" />
                        </div>
                        {(editOutcome === 'complication' || editOutcome === 'failure') && (
                          <>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">Type de complication</label>
                              <input value={editComplicationType} onChange={e => setEditComplicationType(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none"
                                placeholder="Infection, hémorragie, etc." />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">Date de la complication</label>
                              <input type="date" value={editComplicationDate} onChange={e => setEditComplicationDate(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none" />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(f.id)} disabled={isPending}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200">
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
