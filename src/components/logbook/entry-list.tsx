'use client'

import { useState } from 'react'
import { ChevronDown, Check, Clock, MapPin, AlertTriangle } from 'lucide-react'
import type { EntryWithDetails } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'

interface EntryListProps {
  entries: EntryWithDetails[]
  totalCount: number
}

export function EntryList({ entries, totalCount }: EntryListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { t, locale } = useI18n()

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{t('entries.noEntries')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('entries.noEntriesHint')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {t('entries.history')} <span className="text-muted-foreground">({totalCount})</span>
        </h2>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary/20"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                entry.is_validated
                  ? 'bg-accent/10 text-accent'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {entry.is_validated ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {(entry.procedure as { name: string } | undefined)?.name || (entry.specialty as { name: string } | undefined)?.name || t('entries.intervention')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.intervention_date).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR')} · {(entry.hospital as { name: string } | undefined)?.name}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {entry.entry_mode === 'retrospective' && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
                {entry.geo_latitude && (
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expanded === entry.id && (
              <div className="border-t border-border/60 px-3 pb-3 pt-2">
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('entries.role')}</dt>
                    <dd className="font-medium text-foreground">{t(`role.${entry.operator_role}`)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('entries.context')}</dt>
                    <dd className="font-medium text-foreground">{entry.context === 'programmed' ? t('entries.programmed') : t('entries.emergency')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('entries.patient')}</dt>
                    <dd className="font-medium text-foreground">{entry.patient_type === 'real' ? t('entries.real') : t('entries.simulation')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('entries.mode')}</dt>
                    <dd className={`font-medium ${entry.entry_mode === 'retrospective' ? 'text-amber-600' : 'text-accent'}`}>
                      {entry.entry_mode === 'prospective' ? t('entries.prospective') : t('entries.retrospective')}
                    </dd>
                  </div>
                  {entry.supervisor && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('entries.supervisor')}</dt>
                      <dd className="font-medium text-foreground">
                        Dr {(entry.supervisor as { last_name: string; first_name: string }).last_name} {(entry.supervisor as { last_name: string; first_name: string }).first_name}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('entries.submittedAt')}</dt>
                    <dd className="font-medium text-foreground">
                      {new Date(entry.submitted_at).toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')}
                    </dd>
                  </div>
                  {entry.notes && (
                    <div className="pt-1">
                      <dt className="text-muted-foreground">{t('entries.notes')}</dt>
                      <dd className="mt-0.5 text-foreground">{entry.notes}</dd>
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
