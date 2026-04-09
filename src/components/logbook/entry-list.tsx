'use client'

import { useState } from 'react'
import { ChevronDown, Check, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { OPERATOR_ROLE_LABELS } from '@/types/database'
import type { EntryWithDetails } from '@/types/database'

interface EntryListProps {
  entries: EntryWithDetails[]
  totalCount: number
}

export function EntryList({ entries, totalCount }: EntryListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Clock className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">Aucune intervention enregistrée</p>
        <p className="mt-1 text-xs text-slate-400">Utilisez le formulaire ci-dessus pour commencer</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Historique <span className="text-slate-400">({totalCount})</span>
        </h2>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                entry.is_validated
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {entry.is_validated ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {(entry.procedure as { name: string } | undefined)?.name || (entry.specialty as { name: string } | undefined)?.name || 'Intervention'}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(entry.intervention_date).toLocaleDateString('fr-FR')} · {(entry.hospital as { name: string } | undefined)?.name}
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

            {expanded === entry.id && (
              <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Rôle</dt>
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
                        Dr {(entry.supervisor as { last_name: string; first_name: string }).last_name} {(entry.supervisor as { last_name: string; first_name: string }).first_name}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Soumis le</dt>
                    <dd className="font-medium">
                      {new Date(entry.submitted_at).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                  {entry.notes && (
                    <div className="pt-1">
                      <dt className="text-slate-500">Notes</dt>
                      <dd className="mt-0.5 text-slate-700">{entry.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
