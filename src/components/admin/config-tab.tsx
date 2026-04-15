'use client'

import { useState } from 'react'
import { Plus, X, Pencil, Trash2, Check, Building2, Target, BookOpen, ChevronDown, ChevronUp, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type { DesLevel, Hospital, UserRole } from '@/types/database'
import {
  addHospital, updateHospital, deleteHospital,
  addSpecialty, updateSpecialty, deleteSpecialty,
  addProcedure, deleteProcedure,
  upsertDesObjective, deleteDesObjective,
  updateUserRole,
} from '@/lib/actions/admin'

interface ConfigTabProps {
  hospitals: Hospital[]
  specialties: { id: string; name: string; is_active: boolean }[]
  procedures: { id: string; name: string; specialty_id: string; specialty?: { name: string } | null }[]
  desObjectives: {
    id: string; des_level: string; category: string; label: string;
    target_count: number; description?: string | null;
    specialty_name?: string | null; procedure_name?: string | null;
  }[]
  currentUserRole: string
}

export function ConfigTab({ hospitals, specialties, procedures, desObjectives, currentUserRole }: ConfigTabProps) {
  const { t } = useI18n()
  const [section, setSection] = useState<'hospitals' | 'objectives' | 'specialties'>('hospitals')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const sections = [
    { key: 'hospitals' as const, label: t('config.hospitals'), icon: Building2 },
    { key: 'objectives' as const, label: t('config.objectives'), icon: Target },
    { key: 'specialties' as const, label: t('config.specialties'), icon: BookOpen },
  ]

  return (
    <div className="space-y-3">
      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          feedback.type === 'success' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {/* Section switcher */}
      <div className="flex gap-2">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              section === s.key
                ? 'bg-primary text-white'
                : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <s.icon className="h-3.5 w-3.5" /> {s.label}
          </button>
        ))}
      </div>

      {/* Hôpitaux */}
      {section === 'hospitals' && (
        <HospitalsManager hospitals={hospitals} onFeedback={showFeedback} t={t} />
      )}

      {/* Objectifs DES */}
      {section === 'objectives' && (
        <ObjectivesManager objectives={desObjectives} onFeedback={showFeedback} t={t} />
      )}

      {/* Spécialités & Procédures */}
      {section === 'specialties' && (
        <SpecialtiesManager
          specialties={specialties}
          procedures={procedures}
          onFeedback={showFeedback}
          t={t}
        />
      )}
    </div>
  )
}

// ==================== HÔPITAUX ====================

function HospitalsManager({
  hospitals,
  onFeedback,
  t,
}: {
  hospitals: Hospital[]
  onFeedback: (type: 'success' | 'error', msg: string) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')

  const handleAdd = async () => {
    if (!name.trim() || !city.trim()) return
    setLoading(true)
    const result = await addHospital({ name: name.trim(), city: city.trim() })
    setLoading(false)
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', t('config.hospitalAdded', { name }))
      setName('')
      setCity('')
      setShowAdd(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setLoading(true)
    const result = await updateHospital(id, { name: editName.trim(), city: editCity.trim() })
    setLoading(false)
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', t('config.hospitalUpdated'))
      setEditingId(null)
    }
  }

  const handleToggle = async (h: Hospital) => {
    const result = await updateHospital(h.id, { is_active: !h.is_active })
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', h.is_active ? t('config.deactivated') : t('config.reactivated'))
    }
  }

  return (
    <div className="card-base">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('config.hospitals')} ({hospitals.length})</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> {t('admin.add')}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <div className="mb-3 rounded-lg bg-primary/10 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.hospitalName')} *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="CNHU-HKM"
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.city')} *</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Cotonou"
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading || !name.trim() || !city.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('config.adding') : t('admin.confirm')}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50">
              {t('admin.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-1">
        {hospitals.map(h => (
          <div key={h.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
            h.is_active ? 'bg-secondary/50' : 'bg-destructive/10'
          }`}>
            {editingId === h.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 rounded border border-input px-2 py-1 text-xs focus:outline-none"
                />
                <input
                  value={editCity}
                  onChange={e => setEditCity(e.target.value)}
                  className="w-24 rounded border border-input px-2 py-1 text-xs focus:outline-none"
                />
                <button onClick={() => handleUpdate(h.id)} className="rounded bg-primary p-1 text-white">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <div>
                  <span className={`font-medium ${h.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{h.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{h.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingId(h.id); setEditName(h.name); setEditCity(h.city) }}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-muted-foreground"
                    title="Modifier"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleToggle(h)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      h.is_active
                        ? 'bg-accent/10 text-accent hover:bg-destructive/15 hover:text-destructive'
                        : 'bg-destructive/15 text-destructive hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    {h.is_active ? t('admin.active') : t('admin.inactive')}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {hospitals.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">{t('config.noHospitals')}</p>
        )}
      </div>
    </div>
  )
}

// ==================== OBJECTIFS DES ====================

function ObjectivesManager({
  objectives,
  onFeedback,
  t,
}: {
  objectives: ConfigTabProps['desObjectives']
  onFeedback: (type: 'success' | 'error', msg: string) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null)
  const [form, setForm] = useState({
    des_level: 'DES1',
    category: 'quantitative',
    label: '',
    target_count: 0,
    description: '',
    specialty_name: '',
    procedure_name: '',
  })

  const handleAdd = async () => {
    if (!form.label.trim()) return
    setLoading(true)
    const result = await upsertDesObjective({
      des_level: form.des_level,
      category: form.category,
      label: form.label.trim(),
      target_count: form.target_count,
      description: form.description.trim() || undefined,
      specialty_name: form.specialty_name.trim() || undefined,
      procedure_name: form.procedure_name.trim() || undefined,
    })
    setLoading(false)
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', t('config.objectiveSaved', { label: form.label }))
      setForm({ ...form, label: '', target_count: 0, description: '', specialty_name: '', procedure_name: '' })
      setShowAdd(false)
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Supprimer l'objectif « ${label} » ?`)) return
    const result = await deleteDesObjective(id)
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', t('config.objectiveDeleted'))
    }
  }

  // Grouper par niveau DES
  const grouped = (['DES1', 'DES2', 'DES3', 'DES4', 'DES5'] as const).map(level => ({
    level,
    label: t('des.' + level),
    quantitative: objectives.filter(o => o.des_level === level && o.category === 'quantitative'),
    qualitative: objectives.filter(o => o.des_level === level && o.category === 'qualitative'),
  }))

  return (
    <div className="card-base">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('config.objectives')}</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> {t('admin.add')}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <div className="mb-3 rounded-lg bg-primary/10 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('admin.desLevel')} *</label>
              <select
                value={form.des_level}
                onChange={e => setForm(p => ({ ...p, des_level: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                {(['DES1', 'DES2', 'DES3', 'DES4', 'DES5'] as const).map((k) => (
                  <option key={k} value={k}>{t('des.' + k)} ({k})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.category')} *</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="quantitative">{t('config.quantitative')}</option>
                <option value="qualitative">{t('config.qualitative')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.objectiveLabel')} *</label>
              <input
                value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="Ex: Total interventions, Herniorraphie, Appendicectomie..."
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.objectiveTarget')} *</label>
              <input
                type="number"
                value={form.target_count}
                onChange={e => setForm(p => ({ ...p, target_count: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {form.category === 'qualitative' && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('admin.specialty')}</label>
                  <input
                    value={form.specialty_name}
                    onChange={e => setForm(p => ({ ...p, specialty_name: e.target.value }))}
                    placeholder="Chirurgie Générale"
                    className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.procedure')}</label>
                  <input
                    value={form.procedure_name}
                    onChange={e => setForm(p => ({ ...p, procedure_name: e.target.value }))}
                    placeholder="Herniorraphie inguinale"
                    className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.description')}</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description détaillée de l'objectif"
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading || !form.label.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('admin.saving') : t('config.save')}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50">
              {t('admin.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Liste groupée par niveau */}
      <div className="space-y-2">
        {grouped.map(g => {
          const total = g.quantitative.length + g.qualitative.length
          const isExpanded = expandedLevel === g.level
          return (
            <div key={g.level} className="rounded-lg border border-border">
              <button
                onClick={() => setExpandedLevel(isExpanded ? null : g.level)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-secondary/50"
              >
                <span>{g.label} ({g.level})</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {total} objectif{total > 1 ? 's' : ''}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/60 px-3 py-2">
                  {total === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">{t('config.noObjectives')}</p>
                  ) : (
                    <div className="space-y-1">
                      {g.quantitative.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">{t('config.quantitativeLabel')}</p>
                          {g.quantitative.map(o => (
                            <div key={o.id} className="flex items-center justify-between rounded bg-blue-500/10 px-2 py-1.5 text-xs">
                              <div>
                                <span className="font-medium text-foreground">{o.label}</span>
                                <span className="ml-2 rounded bg-blue-500/25 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">{o.target_count}</span>
                                {o.description && <p className="mt-0.5 text-[10px] text-muted-foreground">{o.description}</p>}
                              </div>
                              <button
                                onClick={() => handleDelete(o.id, o.label)}
                                className="rounded p-1 text-destructive/70 hover:bg-destructive/20 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {g.qualitative.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400">{t('config.qualitativeLabel')}</p>
                          {g.qualitative.map(o => (
                            <div key={o.id} className="flex items-center justify-between rounded bg-purple-500/10 px-2 py-1.5 text-xs">
                              <div>
                                <span className="font-medium text-foreground">{o.label}</span>
                                <span className="ml-2 rounded bg-purple-500/25 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">{o.target_count}</span>
                                {o.specialty_name && (
                                  <span className="ml-1 text-[10px] text-muted-foreground">({o.specialty_name})</span>
                                )}
                                {o.procedure_name && (
                                  <span className="ml-1 text-[10px] text-muted-foreground">→ {o.procedure_name}</span>
                                )}
                                {o.description && <p className="mt-0.5 text-[10px] text-muted-foreground">{o.description}</p>}
                              </div>
                              <button
                                onClick={() => handleDelete(o.id, o.label)}
                                className="rounded p-1 text-destructive/70 hover:bg-destructive/20 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div className="mt-3 rounded-lg bg-secondary/50 p-2 text-[10px] text-muted-foreground">
        <p>{t('config.quantitativeInfo')}</p>
        <p>{t('config.qualitativeInfo')}</p>
      </div>
    </div>
  )
}

// ==================== SPÉCIALITÉS ====================

function SpecialtiesManager({
  specialties,
  procedures,
  onFeedback,
  t,
}: {
  specialties: { id: string; name: string; is_active: boolean }[]
  procedures: { id: string; name: string; specialty_id: string; specialty?: { name: string } | null }[]
  onFeedback: (type: 'success' | 'error', msg: string) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [showAddSpec, setShowAddSpec] = useState(false)
  const [showAddProc, setShowAddProc] = useState(false)
  const [specName, setSpecName] = useState('')
  const [procName, setProcName] = useState('')
  const [procSpecId, setProcSpecId] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null)

  const handleAddSpecialty = async () => {
    if (!specName.trim()) return
    setLoading(true)
    const result = await addSpecialty({ name: specName.trim() })
    setLoading(false)
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', t('config.specialtyAdded', { name: specName }))
      setSpecName('')
      setShowAddSpec(false)
    }
  }

  const handleAddProcedure = async () => {
    if (!procName.trim() || !procSpecId) return
    setLoading(true)
    const result = await addProcedure({ name: procName.trim(), specialty_id: procSpecId })
    setLoading(false)
    if (result.error) {
      onFeedback('error', result.error)
    } else {
      onFeedback('success', t('config.procedureAdded', { name: procName }))
      setProcName('')
      setShowAddProc(false)
    }
  }

  const handleDeleteSpec = async (id: string, name: string) => {
    if (!confirm(`Désactiver la spécialité « ${name} » ?`)) return
    const result = await deleteSpecialty(id)
    if (result.error) onFeedback('error', result.error)
    else onFeedback('success', t('config.specialtyDeactivated'))
  }

  const handleDeleteProc = async (id: string, name: string) => {
    if (!confirm(`Désactiver la procédure « ${name} » ?`)) return
    const result = await deleteProcedure(id)
    if (result.error) onFeedback('error', result.error)
    else onFeedback('success', t('config.procedureDeactivated'))
  }

  return (
    <div className="card-base">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('config.specialtiesAndProcedures')}</h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setShowAddSpec(!showAddSpec); setShowAddProc(false) }}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> {t('admin.specialty')}
          </button>
          <button
            onClick={() => { setShowAddProc(!showAddProc); setShowAddSpec(false) }}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> {t('config.procedure')}
          </button>
        </div>
      </div>

      {/* Formulaire ajout spécialité */}
      {showAddSpec && (
        <div className="mb-3 rounded-lg bg-primary/10 p-3">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.specialtyName')} *</label>
          <input
            value={specName}
            onChange={e => setSpecName(e.target.value)}
            placeholder="Ex: Chirurgie Orthopédique"
            className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAddSpecialty}
              disabled={loading || !specName.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('config.adding') : t('admin.add')}
            </button>
            <button onClick={() => setShowAddSpec(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50">
              {t('admin.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Formulaire ajout procédure */}
      {showAddProc && (
        <div className="mb-3 rounded-lg bg-blue-500/10 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('admin.specialty')} *</label>
              <select
                value={procSpecId}
                onChange={e => setProcSpecId(e.target.value)}
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">{t('common.select')}</option>
                {specialties.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{t('config.procedureName')} *</label>
              <input
                value={procName}
                onChange={e => setProcName(e.target.value)}
                placeholder="Ex: Appendicectomie"
                className="w-full rounded-lg border border-input px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAddProcedure}
              disabled={loading || !procName.trim() || !procSpecId}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('config.adding') : t('admin.add')}
            </button>
            <button onClick={() => setShowAddProc(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50">
              {t('admin.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Liste spécialités avec procédures */}
      <div className="space-y-1">
        {specialties.map(s => {
          const procs = procedures.filter(p => p.specialty_id === s.id)
          const isExpanded = expandedSpec === s.id
          return (
            <div key={s.id} className="rounded-lg border border-border">
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  onClick={() => setExpandedSpec(isExpanded ? null : s.id)}
                  className="flex items-center gap-2 text-left text-sm font-medium text-foreground"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  {s.name}
                  <span className="text-[10px] font-normal text-muted-foreground">{procs.length} procédure{procs.length > 1 ? 's' : ''}</span>
                </button>
                <button
                  onClick={() => handleDeleteSpec(s.id, s.name)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {isExpanded && procs.length > 0 && (
                <div className="border-t border-border/60 px-3 py-2">
                  {procs.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded bg-secondary/50 px-2 py-1 text-xs">
                      <span className="text-muted-foreground">{p.name}</span>
                      <button
                        onClick={() => handleDeleteProc(p.id, p.name)}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {isExpanded && procs.length === 0 && (
                <div className="border-t border-border/60 px-3 py-2">
                  <p className="text-center text-[10px] text-muted-foreground">{t('config.noProcedures')}</p>
                </div>
              )}
            </div>
          )
        })}
        {specialties.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">{t('config.noSpecialties')}</p>
        )}
      </div>
    </div>
  )
}
