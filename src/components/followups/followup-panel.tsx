'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import {
  ChevronDown, Loader2, HeartPulse, TrendingUp, Clock, Activity,
  Edit3, Trash2, Stethoscope, Plus, FileText, AlertTriangle, Skull
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { updateFollowup, deleteFollowup, getFollowupEvents, addFollowupEvent } from '@/lib/actions/followups'
import {
  FOLLOWUP_OUTCOME_LABELS, FOLLOWUP_OUTCOME_COLORS, AGE_RANGE_LABELS,
  FOLLOWUP_EVENT_LABELS, FOLLOWUP_EVENT_COLORS, CAUSE_OF_DEATH_OPTIONS
} from '@/types/database'
import type {
  PatientFollowupWithEntry, FollowupOutcome, FollowupEventType,
  AgeRange, PatientSex, FollowupEvent
} from '@/types/database'

interface Stats {
  total: number
  outcomes: Record<string, number>
  exeatRate: number
  decedeRate: number
  avgStay: number
  complications: number
}

interface Props {
  initialFollowups: PatientFollowupWithEntry[]
  stats: Stats | null
}

export function FollowupPanel({ initialFollowups, stats }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR'
  const followups = initialFollowups
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Formulaire édition
  const [editOutcome, setEditOutcome] = useState<FollowupOutcome>('en_cours')
  const [editDischarge, setEditDischarge] = useState('')
  const [editCauseOfDeath, setEditCauseOfDeath] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAgeRange, setEditAgeRange] = useState<AgeRange | ''>('')
  const [editSex, setEditSex] = useState<PatientSex | ''>('')
  const [editAsaScore, setEditAsaScore] = useState<number | ''>('')

  // Timeline events
  const [events, setEvents] = useState<Record<string, FollowupEvent[]>>({})
  const [loadingEvents, setLoadingEvents] = useState<string | null>(null)
  const [showAddEvent, setShowAddEvent] = useState<string | null>(null)
  const [newEventType, setNewEventType] = useState<FollowupEventType>('note')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventDesc, setNewEventDesc] = useState('')

  const loadEvents = useCallback(async (followupId: string) => {
    if (events[followupId]) return
    setLoadingEvents(followupId)
    const result = await getFollowupEvents(followupId)
    setEvents(prev => ({ ...prev, [followupId]: result }))
    setLoadingEvents(null)
  }, [events])

  // Charger les événements quand on expand un suivi
  useEffect(() => {
    if (expanded) loadEvents(expanded)
  }, [expanded, loadEvents])

  function openEdit(f: PatientFollowupWithEntry) {
    setEditingId(f.id)
    setEditOutcome(f.outcome)
    setEditDischarge(f.discharge_date || '')
    setEditCauseOfDeath(f.cause_of_death || '')
    setEditNotes(f.notes || '')
    setEditAgeRange(f.age_range || '')
    setEditSex(f.sex || '')
    setEditAsaScore(f.asa_score ?? '')
    setExpanded(f.id)
  }

  function handleUpdate(followupId: string) {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateFollowup(followupId, {
        outcome: editOutcome,
        discharge_date: editDischarge || null,
        cause_of_death: editOutcome === 'decede' ? editCauseOfDeath || null : null,
        notes: editNotes || null,
        age_range: editAgeRange as AgeRange || null,
        sex: editSex as PatientSex || null,
        asa_score: editAsaScore ? Number(editAsaScore) : null,
      })
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: t('followups.updated') })
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
        setFeedback({ type: 'success', message: t('followups.deleted') })
      }
    })
  }

  function handleAddEvent(followupId: string) {
    if (!newEventDesc.trim()) return
    setFeedback(null)
    startTransition(async () => {
      const result = await addFollowupEvent(followupId, {
        event_type: newEventType,
        event_date: newEventDate || new Date().toISOString().slice(0, 10),
        description: newEventDesc,
      })
      if (result.error) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        // Recharger les événements
        const updated = await getFollowupEvents(followupId)
        setEvents(prev => ({ ...prev, [followupId]: updated }))
        setNewEventType('note')
        setNewEventDate('')
        setNewEventDesc('')
        setShowAddEvent(null)
        setFeedback({ type: 'success', message: t('followups.eventAdded') })
      }
    })
  }

  const outcomeIcon = (outcome: FollowupOutcome) => {
    switch (outcome) {
      case 'en_cours': return <Clock className="h-4 w-4" />
      case 'exeat': return <TrendingUp className="h-4 w-4" />
      case 'decede': return <Skull className="h-4 w-4" />
    }
  }

  const dischargeDateLabel = (outcome: FollowupOutcome) =>
    outcome === 'decede' ? t('followups.deathDate') : t('followups.dischargeDate.label')

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
            <HeartPulse className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t('followups.title')}</h1>
            <p className="text-xs text-slate-500">{followups.length} suivi{followups.length !== 1 ? 's' : ''} · {t('followups.subtitle')}</p>
          </div>
        </div>
        <a
          href="/logbook"
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Stethoscope className="h-3.5 w-3.5" />
          {t('followups.logbook')}
        </a>
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
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-1.5">
          <div className="rounded-xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold text-blue-600">{stats.total}</p>
            <p className="text-[11px] text-slate-500">{t('followups.total')}</p>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold text-emerald-600">{stats.exeatRate}%</p>
            <p className="text-[11px] text-slate-500">{t('followups.exeat')}</p>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold text-orange-600">{stats.complications}</p>
            <p className="text-[11px] text-slate-500">{t('followups.complications.label')}</p>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold text-slate-600">{stats.decedeRate}%</p>
            <p className="text-[11px] text-slate-500">{t('followups.deceased')}</p>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold text-indigo-600">{stats.avgStay}j</p>
            <p className="text-[11px] text-slate-500">{t('followups.avgStay.label')}</p>
          </div>
        </div>
      )}

      {/* Répartition des résultats */}
      {stats && stats.total > 0 && (
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
          {(['en_cours', 'exeat', 'decede'] as FollowupOutcome[]).map(o => {
            const pct = (stats.outcomes[o] || 0) / stats.total * 100
            if (pct === 0) return null
            const colors: Record<string, string> = {
              en_cours: 'bg-amber-400', exeat: 'bg-emerald-500', decede: 'bg-slate-500'
            }
            return <div key={o} className={`${colors[o]} transition-all`} style={{ width: `${pct}%` }} title={`${FOLLOWUP_OUTCOME_LABELS[o]} ${Math.round(pct)}%`} />
          })}
        </div>
      )}

      {/* Liste des suivis */}
      {followups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <HeartPulse className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">{t('followups.title')}</p>
          <p className="mx-auto mt-2 max-w-xs text-xs text-slate-400">
            {t('followups.noFollowupsDesc')}
          </p>
          <a href="/logbook" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            <Stethoscope className="h-3.5 w-3.5" /> {t('followups.registerEntry')}
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {followups.map(f => {
            const isExpanded = expanded === f.id
            const isEditing = editingId === f.id
            const entryInfo = f.entry as { procedure?: { name: string } | null; specialty?: { name: string } | null; hospital?: { name: string } | null } | undefined
            const followupEvents = events[f.id] || []
            const isLoadingEvents = loadingEvents === f.id
            const isClosed = f.outcome === 'exeat' || f.outcome === 'decede'

            return (
              <div key={f.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => { setExpanded(isExpanded ? null : f.id); if (isEditing) setEditingId(null) }}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${FOLLOWUP_OUTCOME_COLORS[f.outcome]}`}>
                    {outcomeIcon(f.outcome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {f.anonymous_id}
                      <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${FOLLOWUP_OUTCOME_COLORS[f.outcome]}`}>
                        {FOLLOWUP_OUTCOME_LABELS[f.outcome]}
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {new Date(f.intervention_date).toLocaleDateString(dateLocale)}
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
                        {/* Détails du suivi */}
                        <dl className="space-y-1.5 text-xs">
                          {f.age_range && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.ageRange.label')}</dt>
                              <dd className="font-medium">{AGE_RANGE_LABELS[f.age_range]}</dd>
                            </div>
                          )}
                          {f.sex && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.sex.label')}</dt>
                              <dd className="font-medium">{f.sex === 'M' ? t('followups.male') : t('followups.female')}</dd>
                            </div>
                          )}
                          {f.asa_score && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.asa.label')}</dt>
                              <dd className="font-medium">ASA {f.asa_score}</dd>
                            </div>
                          )}
                          {f.discharge_date && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{dischargeDateLabel(f.outcome)}</dt>
                              <dd className="font-medium">{new Date(f.discharge_date).toLocaleDateString(dateLocale)}</dd>
                            </div>
                          )}
                          {f.outcome === 'decede' && f.cause_of_death && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.causeOfDeath')}</dt>
                              <dd className="font-medium text-slate-700">{f.cause_of_death}</dd>
                            </div>
                          )}
                          {f.complication_type && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.complication')}</dt>
                              <dd className="font-medium text-orange-600">{f.complication_type}</dd>
                            </div>
                          )}
                          {f.complication_date && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.dateComplication')}</dt>
                              <dd className="font-medium">{new Date(f.complication_date).toLocaleDateString(dateLocale)}</dd>
                            </div>
                          )}
                          {entryInfo?.hospital?.name && (
                            <div className="flex justify-between">
                              <dt className="text-slate-500">{t('followups.hospital')}</dt>
                              <dd className="font-medium">{entryInfo.hospital.name}</dd>
                            </div>
                          )}
                          {f.notes && (
                            <div className="pt-1">
                              <dt className="text-slate-500">{t('followups.notes')}</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{f.notes}</dd>
                            </div>
                          )}
                        </dl>

                        {/* Timeline des événements */}
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {t('followups.medicalRecord')} ({followupEvents.length})
                            </p>
                            {!isClosed && (
                              <button
                                onClick={() => {
                                  setShowAddEvent(showAddEvent === f.id ? null : f.id)
                                  setNewEventDate(new Date().toISOString().slice(0, 10))
                                }}
                                className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100"
                              >
                                <Plus className="h-3 w-3" /> {t('followups.addEvent')}
                              </button>
                            )}
                            {isClosed && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                {t('followups.closedRecord')}
                              </span>
                            )}
                          </div>

                          {/* Formulaire ajout événement */}
                          {showAddEvent === f.id && !isClosed && (
                            <div className="mb-3 rounded-lg bg-rose-50/50 p-2.5 ring-1 ring-rose-100">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-slate-600">{t('followups.eventType')}</label>
                                  <select value={newEventType} onChange={e => setNewEventType(e.target.value as FollowupEventType)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-rose-300 focus:outline-none">
                                    {Object.entries(FOLLOWUP_EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-slate-600">{t('followups.eventDate')}</label>
                                  <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-rose-300 focus:outline-none" />
                                </div>
                              </div>
                              <div className="mt-2">
                                <label className="mb-1 block text-[10px] font-medium text-slate-600">{t('followups.eventDesc')}</label>
                                <textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={2}
                                  placeholder={t('followups.eventPlaceholder')}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-rose-300 focus:outline-none" />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={() => handleAddEvent(f.id)} disabled={isPending || !newEventDesc.trim()}
                                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-500 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
                                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('followups.addButton')}
                                </button>
                                <button onClick={() => setShowAddEvent(null)}
                                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                  {t('followups.cancel')}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Liste des événements */}
                          {isLoadingEvents ? (
                            <div className="flex items-center justify-center py-3">
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                          ) : followupEvents.length === 0 ? (
                            <p className="py-2 text-center text-[11px] text-slate-400">{t('followups.noEvents')}</p>
                          ) : (
                            <div className="relative ml-2 space-y-2 border-l-2 border-slate-200 pl-3">
                              {followupEvents.map(ev => (
                                <div key={ev.id} className="relative">
                                  <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                                  <div className={`rounded-lg border px-2.5 py-2 ${FOLLOWUP_EVENT_COLORS[ev.event_type]}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-semibold">{FOLLOWUP_EVENT_LABELS[ev.event_type]}</span>
                                      <span className="text-[10px] opacity-70">{new Date(ev.event_date).toLocaleDateString(dateLocale)}</span>
                                    </div>
                                    <p className="mt-0.5 text-xs">{ev.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => openEdit(f)}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                            <Edit3 className="h-3 w-3" /> {t('followups.edit')}
                          </button>
                          <button onClick={() => handleDelete(f.id)} disabled={isPending}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                            <Trash2 className="h-3 w-3" /> {t('followups.delete')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Contexte patient */}
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('followups.patientContext')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">{t('followups.ageRange.label')}</label>
                            <select value={editAgeRange} onChange={e => setEditAgeRange(e.target.value as AgeRange)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-rose-300 focus:outline-none">
                              <option value="">—</option>
                              {Object.entries(AGE_RANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">{t('followups.sex.label')}</label>
                            <select value={editSex} onChange={e => setEditSex(e.target.value as PatientSex)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-rose-300 focus:outline-none">
                              <option value="">—</option>
                              <option value="M">{t('followups.male')}</option>
                              <option value="F">{t('followups.female')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">{t('followups.asa.label')}</label>
                            <select value={editAsaScore} onChange={e => setEditAsaScore(e.target.value ? Number(e.target.value) : '')}
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-rose-300 focus:outline-none">
                              <option value="">—</option>
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>ASA {n}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Résultat & évolution */}
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('followups.resultEvolution')}</p>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">{t('followups.result')}</label>
                          <select value={editOutcome} onChange={e => setEditOutcome(e.target.value as FollowupOutcome)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none">
                            {Object.entries(FOLLOWUP_OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">{dischargeDateLabel(editOutcome)}</label>
                          <input type="date" value={editDischarge} onChange={e => setEditDischarge(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none" />
                        </div>

                        {/* Cause du décès — visible uniquement si outcome = decede */}
                        {editOutcome === 'decede' && (
                          <div>
                            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                              <AlertTriangle className="h-3 w-3 text-slate-400" /> {t('followups.causeOfDeath')}
                            </label>
                            <select value={editCauseOfDeath} onChange={e => setEditCauseOfDeath(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none">
                              <option value="">— Sélectionner —</option>
                              {CAUSE_OF_DEATH_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">{t('followups.notes')}</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-300 focus:outline-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(f.id)} disabled={isPending}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('followups.save')}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200">
                            {t('followups.cancel')}
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
