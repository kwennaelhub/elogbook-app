'use client'

import { useState, useActionState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { createGarde, type GardeState } from '@/lib/actions/gardes'
import { GARDE_TYPE_LABELS } from '@/types/database'
import type { Hospital, GardeWithDetails } from '@/types/database'

interface CalendarViewProps {
  initialGardes: GardeWithDetails[]
  hospitals: Hospital[]
  supervisors: { id: string; first_name: string; last_name: string }[]
  initialMonth: number
  initialYear: number
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const GARDE_COLORS: Record<string, string> = {
  day: 'bg-blue-500',
  night: 'bg-indigo-600',
  '24h': 'bg-purple-600',
  weekend: 'bg-amber-500',
}

export function CalendarView({ initialGardes, hospitals, supervisors, initialMonth, initialYear }: CalendarViewProps) {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [gardes] = useState(initialGardes)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [state, action, isPending] = useActionState<GardeState, FormData>(createGarde, {})

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
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-slate-100">
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h2 className="text-lg font-semibold text-slate-900">
          {MONTHS[month - 1]} {year}
        </h2>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-slate-100">
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Grille calendrier */}
      <div className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="mb-1 grid grid-cols-7 gap-px">
          {DAYS.map((d) => (
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
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button
              onClick={() => { setShowModal(true) }}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3 w-3" /> Garde
            </button>
          </div>

          {selectedGardes.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune garde ce jour</p>
          ) : (
            <div className="space-y-2">
              {selectedGardes.map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${GARDE_COLORS[g.type]}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{GARDE_TYPE_LABELS[g.type]}</p>
                    <p className="text-xs text-slate-500">
                      {(g.hospital as { name: string } | undefined)?.name}
                      {g.service && ` · ${g.service}`}
                      {g.senior_name && ` · Dr ${g.senior_name}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    g.source === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {g.source === 'admin' ? 'Planning' : 'Perso'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {Object.entries(GARDE_TYPE_LABELS).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${GARDE_COLORS[key]}`} />
            {label}
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
              <h3 className="text-lg font-semibold text-slate-900">Ajouter une garde</h3>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select name="type" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  {Object.entries(GARDE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Hôpital</label>
                <select name="hospital_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">— Sélectionner —</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
                <input name="service" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Ex : Urgences chirurgicales" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Senior de garde</label>
                <select name="senior_id" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">— Sélectionner —</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>Dr {s.last_name} {s.first_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
