'use client'

import { useState, useActionState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Users, Phone } from 'lucide-react'
import { createGarde, type GardeState } from '@/lib/actions/gardes'
import { SUPERVISOR_TITLE_LABELS } from '@/types/database'
import type { Hospital, GardeWithDetails, SupervisorTitle, DesLevel } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'

interface CalendarViewProps {
  initialGardes: GardeWithDetails[]
  hospitals: Hospital[]
  supervisors: { id: string; first_name: string; last_name: string }[]
  initialMonth: number
  initialYear: number
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const GARDE_TYPE_KEYS: Record<string, string> = {
  day: 'garde.day',
  night: 'garde.night',
  '24h': 'garde.24h',
  weekend: 'garde.weekend',
}

const GARDE_COLORS: Record<string, string> = {
  day: 'bg-blue-500',
  night: 'bg-indigo-600',
  '24h': 'bg-purple-600',
  weekend: 'bg-amber-500',
}

export function CalendarView({ initialGardes, hospitals, supervisors, initialMonth, initialYear }: CalendarViewProps) {
  const { t, locale } = useI18n()
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [gardes] = useState(initialGardes)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [state, action, isPending] = useActionState<GardeState, FormData>(createGarde, {})

  const localeDateLocale = locale === 'en' ? 'en-GB' : 'fr-FR'
  const days = locale === 'en' ? DAYS_EN : DAYS_FR

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // lundi = 0
  const daysInMonth = lastDay.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const getGardesForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return gardes.filter((g) => g.date === dateStr)
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1) }
    else setMonth(month - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1) }
    else setMonth(month + 1)
  }

  const selectedGardes = selectedDate ? gardes.filter((g) => g.date === selectedDate) : []

  return (
    <div>
      {/* Header mois */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none" aria-label={locale === 'en' ? 'Previous month' : 'Mois précédent'}>
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h2 className="text-lg font-semibold capitalize text-slate-900">
          {new Date(year, month - 1).toLocaleDateString(localeDateLocale, { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none" aria-label={locale === 'en' ? 'Next month' : 'Mois suivant'}>
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Grille calendrier */}
      <div className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="mb-1 grid grid-cols-7 gap-px">
          {days.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-slate-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="aspect-square" />

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayGardes = getGardesForDay(day)
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all ${
                  isSelected ? 'bg-blue-600 text-white' :
                  isToday ? 'bg-blue-100 font-bold text-blue-700' :
                  'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {day}
                {dayGardes.length > 0 && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {dayGardes.map((g) => (
                      <div
                        key={g.id}
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : GARDE_COLORS[g.type] || 'bg-slate-400'}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDate && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(localeDateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button
              onClick={() => { setShowModal(true) }}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-3 w-3" /> {t('calendar.addGarde')}
            </button>
          </div>

          {selectedGardes.length === 0 ? (
            <p className="text-sm text-slate-400">{t('calendar.noGarde')}</p>
          ) : (
            <div className="space-y-2">
              {/* En-tête équipe */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Users className="h-3.5 w-3.5" />
                {t('calendar.teamMembers', { count: selectedGardes.length })}
              </div>

              {selectedGardes.map((g) => {
                const user = g.user as { first_name: string; last_name: string; phone?: string | null; title?: string | null; des_level?: string | null } | undefined
                const senior = g.senior as { first_name: string; last_name: string; title?: string | null } | undefined

                return (
                  <div key={g.id} className="rounded-lg bg-slate-50 p-3">
                    {/* Ligne principale : type + hôpital + badge */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${GARDE_COLORS[g.type]}`} />
                      <span className="text-sm font-semibold text-slate-800">{t(GARDE_TYPE_KEYS[g.type] || `garde.${g.type}`)}</span>
                      {(g.hospital as { name: string } | undefined)?.name && (
                        <span className="text-xs text-slate-500">· {(g.hospital as { name: string }).name}</span>
                      )}
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        g.source === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {g.source === 'admin' ? t('calendar.planning') : t('calendar.personal')}
                      </span>
                    </div>

                    {/* Interne / DES */}
                    {user && (
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800">
                              {user.title && SUPERVISOR_TITLE_LABELS[user.title as SupervisorTitle]
                                ? `${SUPERVISOR_TITLE_LABELS[user.title as SupervisorTitle]} `
                                : ''
                              }
                              {user.first_name} {user.last_name}
                            </p>
                            {user.des_level && (
                              <p className="text-[10px] text-slate-400">{t(`des.${user.des_level}`) || user.des_level}</p>
                            )}
                          </div>
                        </div>
                        {user.phone && (
                          <a href={`tel:${user.phone}`} className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Senior de garde */}
                    {(senior || g.senior_name) && (
                      <div className="flex items-center gap-2 border-t border-slate-200/60 pt-1.5">
                        <span className="text-[10px] font-medium text-slate-400">{t('calendar.senior')} :</span>
                        <span className="text-xs text-slate-600">
                          {senior
                            ? `${senior.title && SUPERVISOR_TITLE_LABELS[senior.title as SupervisorTitle] ? SUPERVISOR_TITLE_LABELS[senior.title as SupervisorTitle] + ' ' : 'Dr '}${senior.last_name} ${senior.first_name}`
                            : `Dr ${g.senior_name}`
                          }
                        </span>
                      </div>
                    )}

                    {/* Service */}
                    {g.service && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-medium text-slate-400">{t('calendar.service')} :</span>
                        <span className="text-xs text-slate-600">{g.service}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {g.notes && (
                      <p className="mt-1 text-[10px] italic text-slate-400">{g.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {(['day', 'night', '24h', 'weekend'] as const).map((key) => (
          <span key={key} className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${GARDE_COLORS[key]}`} />
            {t(`garde.${key}`)}
          </span>
        ))}
      </div>

      {/* Modal ajout garde */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <form
            action={action}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{t('calendar.addTitle')}</h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {state.error && (
              <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{state.error}</div>
            )}

            <input type="hidden" name="date" value={selectedDate || ''} />

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('calendar.type')}</label>
                <select name="type" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  {(['day', 'night', '24h', 'weekend'] as const).map((k) => (
                    <option key={k} value={k}>{t(`garde.${k}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.hospital')}</label>
                <select name="hospital_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <option value="">{t('common.select')}</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('calendar.service')}</label>
                <input name="service" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" placeholder="Ex : Urgences chirurgicales" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('calendar.senior')}</label>
                <select name="senior_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <option value="">{t('common.select')}</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>Dr {s.last_name} {s.first_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.notes')}</label>
                <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? t('calendar.saving') : t('calendar.save')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
