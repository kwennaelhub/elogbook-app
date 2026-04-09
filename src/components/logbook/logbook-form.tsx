'use client'

import { useState, useActionState, useEffect } from 'react'
import { MapPin, AlertTriangle, ChevronRight, ChevronLeft, Check, HeartPulse } from 'lucide-react'
import { createEntry, type EntryState } from '@/lib/actions/entries'
import { ENTRY_MODE_THRESHOLD_HOURS } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'
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
  const { t } = useI18n()
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
        notes: '', supervisor_id: '', attestation_checked: false, enable_followup: false,
      })
      setGeoLocation(null)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }, [state.success])

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // Reset les champs dépendants
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
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <Check className="h-4 w-4" /> {t('logbook.success')}
        </div>
      )}

      {/* Indicateur d'étapes */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t('logbook.newEntry')}</h2>
        {isRetrospective && formData.intervention_date && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" /> {t('logbook.retrospective')}
          </span>
        )}
      </div>

      <div className="mb-4 flex gap-1">
        {STEP_KEYS.map((key, i) => (
          <div key={key} className="flex-1">
            <div
              className={`h-1 rounded-full ${
                i <= step ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />
            <p className={`mt-1 text-center text-[10px] ${
              i === step ? 'font-medium text-emerald-600' : 'text-slate-400'
            }`}>
              {t(key)}
            </p>
          </div>
        ))}
      </div>

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* Étape 0 : Date & Contexte */}
      {step === 0 && (
        <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.date')}</label>
            <input
              type="date"
              value={formData.intervention_date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => updateField('intervention_date', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t('logbook.contextOp')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['programmed', 'emergency'] as const).map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => updateField('context', ctx)}
                  className={`touch-manipulation rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                    formData.context === ctx
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {ctx === 'programmed' ? t('logbook.programmed') : t('logbook.emergency')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t('logbook.patientType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['real', 'simulation'] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => updateField('patient_type', pt)}
                  className={`touch-manipulation rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                    formData.patient_type === pt
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {pt === 'real' ? t('logbook.realPatient') : t('logbook.simulation')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t('logbook.operatorRole')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['observer', 'assistant', 'supervised_operator', 'autonomous_operator'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField('operator_role', key)}
                  className={`touch-manipulation rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                    formData.operator_role === key
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
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
        <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t('logbook.hospital')}</label>
            <div className="space-y-1.5">
              {hospitals.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => updateField('hospital_id', h.id)}
                  className={`flex w-full items-center justify-between rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all ${
                    formData.hospital_id === h.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{h.name}</span>
                  <span className="text-xs text-slate-400">{h.city}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.otherHospital')}</label>
            <input
              type="text"
              value={formData.other_hospital}
              onChange={(e) => updateField('other_hospital', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              placeholder={t('logbook.otherHospital')}
            />
          </div>

          {/* Géolocalisation */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{t('logbook.geolocation')}</span>
              </div>
              <button
                type="button"
                onClick={captureLocation}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                {geoLocation ? t('logbook.geoRecapture') : t('logbook.geoCapture')}
              </button>
            </div>
            {geoLocation && (
              <p className="mt-2 text-xs text-green-600">
                {t('logbook.geoCaptured')} ({t('logbook.accuracy')} : {Math.round(geoLocation.accuracy)}m)
              </p>
            )}
            {geoError && <p className="mt-2 text-xs text-red-500">{geoError}</p>}
            <p className="mt-1 text-[10px] text-slate-400">{t('logbook.geoOptional')}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.seniorSupervisor')}</label>
            <select
              value={formData.supervisor_id}
              onChange={(e) => updateField('supervisor_id', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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
        <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.specialty')}</label>
            <select
              value={formData.specialty_id}
              onChange={(e) => updateField('specialty_id', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">{t('common.select')}</option>
              {topSpecialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {segments.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.segment')}</label>
              <select
                value={formData.segment_id}
                onChange={(e) => updateField('segment_id', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.surgicalProcedure')}</label>
              <select
                value={formData.procedure_id}
                onChange={(e) => updateField('procedure_id', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="">{t('common.select')}</option>
                {filteredProcedures.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('logbook.notesObservations')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              placeholder={t('logbook.notesPlaceholder')}
            />
          </div>
        </div>
      )}

      {/* Étape 3 : Récapitulatif */}
      {step === 3 && (
        <form action={action} className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('logbook.summaryTitle')}</h3>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('logbook.date.label')}</dt>
                <dd className="font-medium text-slate-900">{formData.intervention_date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('logbook.context')}</dt>
                <dd className="font-medium">{formData.context === 'programmed' ? t('logbook.programmed') : t('logbook.emergency')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('logbook.role')}</dt>
                <dd className="font-medium">{t(`role.${formData.operator_role}`)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('logbook.hospital')}</dt>
                <dd className="font-medium">{hospitals.find((h) => h.id === formData.hospital_id)?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('logbook.specialty')}</dt>
                <dd className="font-medium">{topSpecialties.find((s) => s.id === formData.specialty_id)?.name}</dd>
              </div>
              {geoLocation && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('logbook.gpsLabel')}</dt>
                  <dd className="font-medium text-green-600">{t('logbook.gpsCaptured')} ({Math.round(geoLocation.accuracy)}m)</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Suivi post-opératoire (Premium — patients réels uniquement) */}
          {formData.patient_type === 'real' && (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('logbook.postopFollowup')}</h3>
                    <p className="text-[11px] text-slate-500">{t('logbook.postopDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Premium</span>
                  <button
                    type="button"
                    onClick={() => updateField('enable_followup', !formData.enable_followup)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      formData.enable_followup ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      formData.enable_followup ? 'translate-x-5' : ''
                    }`} />
                  </button>
                </div>
              </div>
              {formData.enable_followup && (
                <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                  {t('logbook.postopInfo')}
                </p>
              )}
            </div>
          )}

          {/* Attestation rétrospective */}
          {isRetrospective && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">{t('logbook.attestationTitle')}</h3>
              </div>
              <p className="mb-3 text-xs text-amber-700">
                {t('logbook.attestationDesc')}
              </p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={formData.attestation_checked}
                  onChange={(e) => updateField('attestation_checked', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs text-amber-800">
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
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" /> {t('logbook.previous')}
            </button>
            <button
              type="submit"
              disabled={isPending || (isRetrospective && !formData.attestation_checked)}
              className="flex-[2] rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
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
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" /> {t('logbook.previous')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canGoNext()}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t('logbook.next')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
