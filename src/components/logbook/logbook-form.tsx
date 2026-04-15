'use client'

import { useState, useActionState, useEffect } from 'react'
import { MapPin, AlertTriangle, ChevronRight, ChevronLeft, Check, HeartPulse } from 'lucide-react'
import { createEntry, type EntryState } from '@/lib/actions/entries'
import { ENTRY_MODE_THRESHOLD_HOURS } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'
import { BodyPartSelector, BODY_REGIONS } from './body-part-selector'
import type { Hospital, Specialty, Procedure } from '@/types/database'

interface LogbookFormProps {
  hospitals: Hospital[]
  specialties: Specialty[]
  procedures: Procedure[]
  supervisors: { id: string; first_name: string; last_name: string }[]
}

const STEP_KEYS = [
  'logbook.step.dateContext',
  'logbook.step.location',
  'logbook.step.specialtyGesture',
  'logbook.step.summary',
]

export function LogbookForm({ hospitals, specialties, procedures, supervisors }: LogbookFormProps) {
  const { t, locale } = useI18n()
  const [state, action, isPending] = useActionState<EntryState, FormData>(createEntry, {})
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    intervention_date: new Date().toISOString().split('T')[0],
    context: '' as string,
    patient_type: '' as string,
    operator_role: '' as string,
    hospital_id: '' as string,
    other_hospital: '',
    specialty_id: '' as string,
    segment_id: '' as string,
    procedure_id: '' as string,
    other_specialty: '',
    other_procedure: '',
    notes: '',
    supervisor_id: '' as string,
    body_region: '' as string,
    attestation_checked: false,
    enable_followup: false,
  })
  const [geoLocation, setGeoLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [geoError, setGeoError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  // Déterminer le mode (prospectif/rétrospectif)
  const isRetrospective = (() => {
    if (!formData.intervention_date) return false
    const intervention = new Date(formData.intervention_date)
    const now = new Date()
    const diffHours = (now.getTime() - intervention.getTime()) / (1000 * 60 * 60)
    return diffHours > ENTRY_MODE_THRESHOLD_HOURS
  })()

  // Hiérarchie conditionnelle des spécialités
  const topSpecialties = specialties.filter((s) => s.level === 0)
  const segments = specialties.filter(
    (s) => s.level === 1 && s.parent_id === formData.specialty_id
  )
  const filteredProcedures = procedures.filter(
    (p) => p.specialty_id === (formData.segment_id || formData.specialty_id)
  )

  // Géolocalisation
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(t('logbook.geoUnsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setGeoError('')
      },
      (err) => {
        setGeoError(err.code === 1 ? t('logbook.geoPermissionDenied') : t('logbook.geoUnavailable'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Succès → reset
  useEffect(() => {
    if (state.success) {
      setShowSuccess(true)
      setStep(0)
      setFormData({
        intervention_date: new Date().toISOString().split('T')[0],
        context: '', patient_type: '', operator_role: '',
        hospital_id: '', other_hospital: '',
        specialty_id: '', segment_id: '', procedure_id: '',
        other_specialty: '', other_procedure: '',
        notes: '', supervisor_id: '', body_region: '', attestation_checked: false, enable_followup: false,
      })
      setGeoLocation(null)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }, [state.success])

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'specialty_id') {
        updated.segment_id = ''
        updated.procedure_id = ''
      }
      if (field === 'segment_id') {
        updated.procedure_id = ''
      }
      return updated
    })
  }

  const canGoNext = () => {
    switch (step) {
      case 0: return formData.intervention_date && formData.context && formData.patient_type && formData.operator_role
      case 1: return formData.hospital_id
      case 2: return formData.specialty_id
      default: return true
    }
  }

  return (
    <div className="mb-6">
      {/* Notification succès */}
      {showSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          <Check className="h-4 w-4" /> {t('logbook.success')}
        </div>
      )}

      {/* Indicateur d'étapes */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t('logbook.newEntry')}</h2>
        {isRetrospective && formData.intervention_date && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            <AlertTriangle className="h-3 w-3" /> {t('logbook.retrospective')}
          </span>
        )}
      </div>

      <div className="mb-4 flex gap-1">
        {STEP_KEYS.map((key, i) => (
          <div key={key} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-secondary'
              }`}
            />
            <p className={`mt-1 text-center text-[10px] ${
              i === step ? 'font-semibold text-primary' : 'text-muted-foreground'
            }`}>
              {t(key)}
            </p>
          </div>
        ))}
      </div>

      {state.error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{t(state.error)}</div>
      )}

      {/* Étape 0 : Date & Contexte */}
      {step === 0 && (
        <div className="space-y-4 card-base">
          <div>
            <label className="label">{t('logbook.date')}</label>
            <input
              type="date"
              value={formData.intervention_date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => updateField('intervention_date', e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="label mb-2">{t('logbook.contextOp')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['programmed', 'emergency'] as const).map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => updateField('context', ctx)}
                  className={`touch-manipulation rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                    formData.context === ctx
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {ctx === 'programmed' ? t('logbook.programmed') : t('logbook.emergency')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">{t('logbook.patientType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['real', 'simulation'] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => updateField('patient_type', pt)}
                  className={`touch-manipulation rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                    formData.patient_type === pt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {pt === 'real' ? t('logbook.realPatient') : t('logbook.simulation')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">{t('logbook.operatorRole')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['observer', 'assistant', 'supervised_operator', 'autonomous_operator'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField('operator_role', key)}
                  className={`touch-manipulation rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                    formData.operator_role === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {t(`role.${key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Étape 1 : Lieu */}
      {step === 1 && (
        <div className="space-y-4 card-base">
          <div>
            <label className="label mb-2">{t('logbook.hospital')}</label>
            <div className="space-y-1.5">
              {hospitals.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => updateField('hospital_id', h.id)}
                  className={`flex w-full items-center justify-between rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all ${
                    formData.hospital_id === h.id
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <span>{h.name}</span>
                  <span className="text-xs text-muted-foreground">{h.city}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{t('logbook.otherHospital')}</label>
            <input
              type="text"
              value={formData.other_hospital}
              onChange={(e) => updateField('other_hospital', e.target.value)}
              className="input-field"
              placeholder={t('logbook.otherHospital')}
            />
          </div>

          {/* Géolocalisation */}
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t('logbook.geolocation')}</span>
              </div>
              <button
                type="button"
                onClick={captureLocation}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {geoLocation ? t('logbook.geoRecapture') : t('logbook.geoCapture')}
              </button>
            </div>
            {geoLocation && (
              <p className="mt-2 text-xs text-accent">
                {t('logbook.geoCaptured')} ({t('logbook.accuracy')} : {Math.round(geoLocation.accuracy)}m)
              </p>
            )}
            {geoError && <p className="mt-2 text-xs text-destructive">{geoError}</p>}
            <p className="mt-1 text-[10px] text-muted-foreground">{t('logbook.geoOptional')}</p>
          </div>

          <div>
            <label className="label">{t('logbook.seniorSupervisor')}</label>
            <select
              value={formData.supervisor_id}
              onChange={(e) => updateField('supervisor_id', e.target.value)}
              className="input-field"
            >
              <option value="">{t('common.select')}</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  Dr {s.last_name} {s.first_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Étape 2 : Spécialité & Geste */}
      {step === 2 && (
        <div className="space-y-4 card-base">
          <div>
            <label className="label">{t('logbook.specialty')}</label>
            <select
              value={formData.specialty_id}
              onChange={(e) => updateField('specialty_id', e.target.value)}
              className="input-field"
            >
              <option value="">{t('common.select')}</option>
              {topSpecialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {segments.length > 0 && (
            <div>
              <label className="label">{t('logbook.segment')}</label>
              <select
                value={formData.segment_id}
                onChange={(e) => updateField('segment_id', e.target.value)}
                className="input-field"
              >
                <option value="">{t('common.select')}</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {filteredProcedures.length > 0 && (
            <div>
              <label className="label">{t('logbook.surgicalProcedure')}</label>
              <select
                value={formData.procedure_id}
                onChange={(e) => updateField('procedure_id', e.target.value)}
                className="input-field"
              >
                <option value="">{t('common.select')}</option>
                {filteredProcedures.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sélecteur zone anatomique */}
          <BodyPartSelector
            value={formData.body_region}
            onChange={(regionId) => updateField('body_region', regionId)}
            locale={locale === 'en' ? 'en' : 'fr'}
          />

          <div>
            <label className="label">{t('logbook.notesObservations')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="input-field"
              placeholder={t('logbook.notesPlaceholder')}
            />
          </div>
        </div>
      )}

      {/* Étape 3 : Récapitulatif */}
      {step === 3 && (
        <form action={action} className="space-y-4">
          <div className="card-base">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t('logbook.summaryTitle')}</h3>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('logbook.date.label')}</dt>
                <dd className="font-medium text-foreground">{formData.intervention_date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('logbook.context')}</dt>
                <dd className="font-medium text-foreground">{formData.context === 'programmed' ? t('logbook.programmed') : t('logbook.emergency')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('logbook.role')}</dt>
                <dd className="font-medium text-foreground">{t(`role.${formData.operator_role}`)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('logbook.hospital')}</dt>
                <dd className="font-medium text-foreground">{hospitals.find((h) => h.id === formData.hospital_id)?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('logbook.specialty')}</dt>
                <dd className="font-medium text-foreground">{topSpecialties.find((s) => s.id === formData.specialty_id)?.name}</dd>
              </div>
              {formData.body_region && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Zone anatomique</dt>
                  <dd className="font-medium text-primary">
                    {BODY_REGIONS.find(r => r.id === formData.body_region)?.label || formData.body_region}
                  </dd>
                </div>
              )}
              {geoLocation && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('logbook.gpsLabel')}</dt>
                  <dd className="font-medium text-accent">{t('logbook.gpsCaptured')} ({Math.round(geoLocation.accuracy)}m)</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Suivi post-opératoire */}
          {formData.patient_type === 'real' && (
            <div className="card-base">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t('logbook.postopFollowup')}</h3>
                    <p className="text-[11px] text-muted-foreground">{t('logbook.postopDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">Premium</span>
                  <button
                    type="button"
                    onClick={() => updateField('enable_followup', !formData.enable_followup)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      formData.enable_followup ? 'bg-primary' : 'bg-secondary'
                    }`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      formData.enable_followup ? 'translate-x-5' : ''
                    }`} />
                  </button>
                </div>
              </div>
              {formData.enable_followup && (
                <p className="mt-2 rounded-lg bg-primary/10 p-2 text-xs text-primary">
                  {t('logbook.postopInfo')}
                </p>
              )}
            </div>
          )}

          {/* Attestation rétrospective */}
          {isRetrospective && (
            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-300">{t('logbook.attestationTitle')}</h3>
              </div>
              <p className="mb-3 text-xs text-amber-400">
                {t('logbook.attestationDesc')}
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={formData.attestation_checked}
                  onChange={(e) => updateField('attestation_checked', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="text-xs text-amber-300">
                  {t('logbook.attestationText')
                    .replace('{date}', formData.intervention_date)
                    .replace('{role}', t(`role.${formData.operator_role}`) || '...')}
                </span>
              </label>
            </div>
          )}

          {/* Champs cachés */}
          {Object.entries(formData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ))}
          {geoLocation && (
            <>
              <input type="hidden" name="geo_latitude" value={geoLocation.latitude} />
              <input type="hidden" name="geo_longitude" value={geoLocation.longitude} />
              <input type="hidden" name="geo_accuracy" value={geoLocation.accuracy} />
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" /> {t('logbook.previous')}
            </button>
            <button
              type="submit"
              disabled={isPending || (isRetrospective && !formData.attestation_checked)}
              className="flex-[2] rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? t('logbook.saving') : t('logbook.saveEntry')}
            </button>
          </div>
        </form>
      )}

      {/* Navigation */}
      {step < 3 && (
        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" /> {t('logbook.previous')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canGoNext()}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {t('logbook.next')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
