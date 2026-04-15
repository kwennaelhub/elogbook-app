'use client'

import { useState } from 'react'
import { FileText, Pill, ClipboardList, Wrench, Stethoscope, Plus, X, ChevronDown, ChevronUp, Check, XCircle } from 'lucide-react'
import type { CroTemplate, PrescriptionTemplate, PreopTemplate, Instrument } from '@/types/database'
import { addCroTemplate, addPrescriptionTemplate, addPreopTemplate, addInstrument, addTechnique, approveReferentialItem, rejectReferentialItem } from '@/lib/actions/admin'
import { useI18n } from '@/lib/i18n/context'

interface Technique {
  id: string
  title: string
  steps: string[]
  tips: string | null
  contraindications: string | null
  refs: string | null
  status?: string
  specialty?: { name: string } | null
  procedure?: { name: string } | null
}

interface TemplatesTabsProps {
  croTemplates: CroTemplate[]
  prescriptionTemplates: PrescriptionTemplate[]
  preopTemplates: PreopTemplate[]
  instruments: Instrument[]
  techniques: Technique[]
  specialties: { id: string; name: string }[]
  isAdmin: boolean
}

const TABS = [
  { id: 'techniques', labelKey: 'templates.techniques', icon: Stethoscope },
  { id: 'cro', labelKey: 'templates.cro', icon: FileText },
  { id: 'prescriptions', labelKey: 'templates.prescriptions', icon: Pill },
  { id: 'preop', labelKey: 'templates.preop', icon: ClipboardList },
  { id: 'instruments', labelKey: 'templates.instruments', icon: Wrench },
]

const INSTRUMENT_CATEGORY_KEYS = ['coupe', 'prehension', 'hemostase', 'ecartement', 'suture', 'aspiration', 'autre'] as const

export function TemplatesTabs({
  croTemplates, prescriptionTemplates, preopTemplates, instruments, techniques, specialties, isAdmin,
}: TemplatesTabsProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('techniques')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addResult, setAddResult] = useState<{ error?: string; success?: boolean } | null>(null)

  // Form states
  const [formTitle, setFormTitle] = useState('')
  const [formSpecialty, setFormSpecialty] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('coupe')
  const [formDescription, setFormDescription] = useState('')
  const [formSteps, setFormSteps] = useState('')
  const [formTips, setFormTips] = useState('')
  const [formContra, setFormContra] = useState('')

  const [validationLoading, setValidationLoading] = useState<string | null>(null)

  const resetForm = () => {
    setFormTitle(''); setFormSpecialty(''); setFormContent('');
    setFormCategory('coupe'); setFormDescription(''); setFormSteps('');
    setFormTips(''); setFormContra(''); setAddResult(null)
  }

  const tableForTab = (tab: string) => {
    const map: Record<string, string> = {
      techniques: 'surgical_techniques', cro: 'cro_templates',
      prescriptions: 'prescription_templates', preop: 'preop_templates',
      instruments: 'instruments',
    }
    return map[tab] || ''
  }

  const handleApprove = async (itemId: string) => {
    setValidationLoading(itemId)
    const result = await approveReferentialItem(tableForTab(activeTab), itemId)
    setValidationLoading(null)
    if (result.error) setAddResult({ error: result.error })
    else setAddResult({ success: true })
  }

  const handleReject = async (itemId: string) => {
    setValidationLoading(itemId)
    const result = await rejectReferentialItem(tableForTab(activeTab), itemId)
    setValidationLoading(null)
    if (result.error) setAddResult({ error: result.error })
    else setAddResult({ success: true })
  }

  const handleAdd = async () => {
    setAddLoading(true)
    setAddResult(null)
    let result: { error?: string; success?: boolean }

    try {
      switch (activeTab) {
        case 'techniques': {
          const steps = formSteps.split('\n').map(s => s.trim()).filter(Boolean)
          if (!formTitle || steps.length === 0) {
            setAddResult({ error: t('templates.titleRequired') })
            setAddLoading(false)
            return
          }
          result = await addTechnique({
            title: formTitle,
            specialty_id: formSpecialty || undefined,
            steps,
            tips: formTips || undefined,
            contraindications: formContra || undefined,
          })
          break
        }
        case 'cro': {
          const content: Record<string, string> = {}
          formContent.split('\n\n').forEach(block => {
            const [key, ...rest] = block.split('\n')
            if (key) content[key.replace(':', '').trim()] = rest.join('\n').trim()
          })
          result = await addCroTemplate({ title: formTitle, specialty_id: formSpecialty || undefined, content })
          break
        }
        case 'prescriptions': {
          const content: Record<string, string> = {}
          formContent.split('\n').forEach(line => {
            const [key, ...rest] = line.split(':')
            if (key) content[key.trim()] = rest.join(':').trim()
          })
          result = await addPrescriptionTemplate({ title: formTitle, specialty_id: formSpecialty || undefined, content })
          break
        }
        case 'preop': {
          const items: Record<string, string> = {}
          formContent.split('\n').forEach(line => {
            const [key, ...rest] = line.split(':')
            if (key) items[key.trim()] = rest.join(':').trim()
          })
          result = await addPreopTemplate({ title: formTitle, specialty_id: formSpecialty || undefined, items })
          break
        }
        case 'instruments': {
          result = await addInstrument({
            name: formTitle,
            category: formCategory,
            description: formDescription || undefined,
          })
          break
        }
        default:
          result = { error: t('templates.unknownType') }
      }
    } catch {
      result = { error: t('templates.serverError') }
    }

    setAddResult(result)
    setAddLoading(false)
    if (result.success) resetForm()
  }

  return (
    <div>
      {/* Tabs scrollables */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-secondary p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedId(null); setShowAddForm(false); resetForm() }}
              className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(tab.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Bouton Ajouter (admin only) */}
      {isAdmin && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => { setShowAddForm(!showAddForm); setAddResult(null) }}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
          >
            {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddForm ? t('templates.close') : t('templates.add')}
          </button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {isAdmin && showAddForm && (
        <div className="mb-4 card-base">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {activeTab === 'techniques' ? t('templates.addTechnique') : activeTab === 'instruments' ? t('templates.addInstrument') : t('templates.addTemplate', { label: t(TABS.find(tb => tb.id === activeTab)?.labelKey || '') })}
          </h3>

          {addResult?.error && <div className="mb-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{t(addResult.error)}</div>}
          {addResult?.success && <div className="mb-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-400">{t('templates.submittedSuccess')}</div>}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {activeTab === 'instruments' ? t('templates.instrumentName') : t('templates.title')} *
              </label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder={activeTab === 'techniques' ? 'Ex: Appendicectomie par voie de McBurney' : activeTab === 'instruments' ? 'Ex: Bistouri n°11' : 'Titre...'}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {activeTab !== 'instruments' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('templates.specialty')}</label>
                <select
                  value={formSpecialty}
                  onChange={e => setFormSpecialty(e.target.value)}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">{t('templates.allSpecialties')}</option>
                  {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {activeTab === 'instruments' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('templates.category')} *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {INSTRUMENT_CATEGORY_KEYS.map((k) => (
                      <option key={k} value={k}>{t(`templates.cat.${k}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('templates.description')}</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === 'techniques' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('templates.steps')} * ({t('templates.stepsHint')})</label>
                  <textarea
                    value={formSteps}
                    onChange={e => setFormSteps(e.target.value)}
                    rows={6}
                    placeholder={"1. Installation du patient\n2. Asepsie et champs\n3. Incision de McBurney\n4. Ouverture plan par plan\n5. Ligature du méso-appendice\n6. Section de l'appendice\n7. Fermeture plan par plan"}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('templates.tips')}</label>
                  <textarea
                    value={formTips}
                    onChange={e => setFormTips(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('templates.contraindications')}</label>
                  <textarea
                    value={formContra}
                    onChange={e => setFormContra(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </>
            )}

            {['cro', 'prescriptions', 'preop'].includes(activeTab) && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {activeTab === 'cro' ? t('templates.contentCro') : t('templates.contentKeyValue')}
                </label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={6}
                  placeholder={
                    activeTab === 'cro'
                      ? "Indication\nDétails de l'indication...\n\nTechnique opératoire\nDescription de la technique..."
                      : "Élément 1: Détail\nÉlément 2: Détail"
                  }
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={addLoading || !formTitle}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {addLoading ? t('templates.saving') : t('templates.save')}
            </button>
          </div>
        </div>
      )}

      {/* ===== TECHNIQUES OPÉRATOIRES ===== */}
      {activeTab === 'techniques' && (
        <div className="space-y-2">
          {techniques.length === 0 ? (
            <div className="rounded-xl bg-secondary/50 py-12 text-center">
              <Stethoscope className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('templates.noTechniques')}</p>
              {isAdmin && <p className="mt-1 text-xs text-muted-foreground">{t('templates.useAddButton')}</p>}
            </div>
          ) : (
            techniques.map((tech) => (
              <div key={tech.id} className={`overflow-hidden rounded-xl bg-card shadow-sm border border-border/60 ring-0 ${tech.status === 'pending' ? 'ring-amber-300' : tech.status === 'rejected' ? 'ring-red-300' : 'ring-border'}`}>
                <button
                  type="button"
                  onClick={() => setSelectedId(selectedId === tech.id ? null : tech.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tech.title}
                      {isAdmin && tech.status && tech.status !== 'approved' && (
                        <StatusBadge status={tech.status} t={t} />
                      )}
                    </p>
                    <div className="mt-0.5 flex gap-1.5">
                      {tech.specialty && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {(tech.specialty as { name: string }).name}
                        </span>
                      )}
                      {tech.procedure && (
                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                          {(tech.procedure as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedId === tech.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {selectedId === tech.id && (
                  <div className="border-t border-border/60 px-4 py-3">
                    <div className="mb-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">{t('templates.stepsLabel')}</p>
                      <ol className="list-decimal space-y-1 pl-4 text-xs text-foreground">
                        {tech.steps.map((step, i) => (
                          <li key={i} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                    </div>
                    {tech.tips && (
                      <div className="mb-2 rounded-lg bg-amber-500/10 p-2 ring-1 ring-amber-500/20">
                        <p className="text-[10px] font-semibold text-amber-400">{t('templates.tipsLabel')}</p>
                        <p className="text-xs text-amber-300">{tech.tips}</p>
                      </div>
                    )}
                    {tech.contraindications && (
                      <div className="mb-2 rounded-lg bg-destructive/10 p-2 ring-1 ring-destructive/20">
                        <p className="text-[10px] font-semibold text-destructive">{t('templates.contraindicationsLabel')}</p>
                        <p className="text-xs text-destructive">{tech.contraindications}</p>
                      </div>
                    )}
                    {isAdmin && tech.status === 'pending' && (
                      <ValidationButtons itemId={tech.id} loading={validationLoading} onApprove={handleApprove} onReject={handleReject} t={t} />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== CRO ===== */}
      {activeTab === 'cro' && (
        <div className="space-y-2">
          {croTemplates.length === 0 ? (
            <EmptyState label={t('templates.noCro')} isAdmin={isAdmin} t={t} />
          ) : croTemplates.map((cro) => (
            <ExpandableCard key={cro.id} id={cro.id} title={cro.title} status={(cro as unknown as Record<string, unknown>).status as string} isAdmin={isAdmin} selectedId={selectedId} setSelectedId={setSelectedId} validationLoading={validationLoading} onApprove={handleApprove} onReject={handleReject} t={t}>
              <CroContent content={cro.content} />
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* ===== ORDONNANCES ===== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-2">
          {prescriptionTemplates.length === 0 ? (
            <EmptyState label={t('templates.noPrescriptions')} isAdmin={isAdmin} t={t} />
          ) : prescriptionTemplates.map((presc) => (
            <ExpandableCard key={presc.id} id={presc.id} title={presc.title} status={(presc as unknown as Record<string, unknown>).status as string} isAdmin={isAdmin} selectedId={selectedId} setSelectedId={setSelectedId} validationLoading={validationLoading} onApprove={handleApprove} onReject={handleReject} t={t}>
              <TemplateContent content={presc.content} />
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* ===== BILANS ===== */}
      {activeTab === 'preop' && (
        <div className="space-y-2">
          {preopTemplates.length === 0 ? (
            <EmptyState label={t('templates.noPreop')} isAdmin={isAdmin} t={t} />
          ) : preopTemplates.map((preop) => (
            <ExpandableCard key={preop.id} id={preop.id} title={preop.title} status={(preop as unknown as Record<string, unknown>).status as string} isAdmin={isAdmin} selectedId={selectedId} setSelectedId={setSelectedId} validationLoading={validationLoading} onApprove={handleApprove} onReject={handleReject} t={t}>
              <TemplateContent content={preop.items} />
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* ===== INSTRUMENTS ===== */}
      {activeTab === 'instruments' && (
        <div className="space-y-4">
          {instruments.length === 0 ? (
            <EmptyState label={t('templates.noInstruments')} isAdmin={isAdmin} t={t} />
          ) : INSTRUMENT_CATEGORY_KEYS.map((key) => {
            const catInstruments = instruments.filter((i) => i.category === key)
            if (catInstruments.length === 0) return null
            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t(`templates.cat.${key}`)}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {catInstruments.map((inst) => {
                    const instStatus = (inst as unknown as Record<string, unknown>).status as string | undefined
                    return (
                      <div key={inst.id} className={`rounded-xl bg-card p-3 shadow-sm ring-1 ${instStatus === 'pending' ? 'ring-amber-500/40' : 'ring-border'}`}>
                        {inst.image_url && (
                          <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-secondary">
                            <img src={inst.image_url} alt={inst.name} className="h-full w-full object-contain" />
                          </div>
                        )}
                        <p className="text-xs font-medium text-foreground">
                          {inst.name}
                          {isAdmin && instStatus && instStatus !== 'approved' && <StatusBadge status={instStatus} t={t} />}
                        </p>
                        {inst.description && <p className="mt-0.5 text-[10px] text-muted-foreground">{inst.description}</p>}
                        {isAdmin && instStatus === 'pending' && (
                          <div className="mt-2 flex gap-1">
                            <button onClick={() => handleApprove(inst.id)} disabled={validationLoading === inst.id}
                              className="flex items-center gap-0.5 rounded bg-primary px-2 py-1 text-[10px] font-medium text-white hover:bg-primary disabled:opacity-50">
                              <Check className="h-2.5 w-2.5" /> {t('templates.approve')}
                            </button>
                            <button onClick={() => handleReject(inst.id)} disabled={validationLoading === inst.id}
                              className="flex items-center gap-0.5 rounded bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50">
                              <XCircle className="h-2.5 w-2.5" /> {t('templates.rejectItem')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ===== Composants utilitaires =====

function EmptyState({ label, isAdmin, t }: { label: string; isAdmin: boolean; t: (key: string) => string }) {
  return (
    <div className="rounded-xl bg-secondary/50 py-12 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      {isAdmin && <p className="mt-1 text-xs text-muted-foreground">{t('templates.useAddButton')}</p>}
    </div>
  )
}

function ExpandableCard({ id, title, status, isAdmin, selectedId, setSelectedId, validationLoading, onApprove, onReject, children, t }: {
  id: string; title: string; status?: string; isAdmin?: boolean; selectedId: string | null; setSelectedId: (id: string | null) => void;
  validationLoading?: string | null; onApprove?: (id: string) => void; onReject?: (id: string) => void; children: React.ReactNode; t: (key: string) => string
}) {
  return (
    <div className={`overflow-hidden rounded-xl bg-card shadow-sm border border-border/60 ring-0 ${status === 'pending' ? 'ring-amber-500/40' : status === 'rejected' ? 'ring-destructive/40' : 'ring-border'}`}>
      <button
        type="button"
        onClick={() => setSelectedId(selectedId === id ? null : id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/50"
      >
        <p className="text-sm font-medium text-foreground">
          {title}
          {isAdmin && status && status !== 'approved' && <StatusBadge status={status} t={t} />}
        </p>
        {selectedId === id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {selectedId === id && (
        <div className="border-t border-border/60 px-4 py-3">
          {children}
          {isAdmin && status === 'pending' && onApprove && onReject && (
            <ValidationButtons itemId={id} loading={validationLoading ?? null} onApprove={onApprove} onReject={onReject} t={t} />
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const styles = status === 'pending'
    ? 'bg-amber-500/15 text-amber-400'
    : status === 'rejected'
    ? 'bg-destructive/15 text-destructive'
    : 'bg-primary/10 text-primary'
  const label = status === 'pending' ? t('templates.statusPending') : status === 'rejected' ? t('templates.statusRejected') : t('templates.statusApproved')
  return <span className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles}`}>{label}</span>
}

function ValidationButtons({ itemId, loading, onApprove, onReject, t }: {
  itemId: string; loading: string | null; onApprove: (id: string) => void; onReject: (id: string) => void; t: (key: string) => string
}) {
  const isLoading = loading === itemId
  return (
    <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
      <button onClick={() => onApprove(itemId)} disabled={isLoading}
        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary disabled:opacity-50">
        <Check className="h-3 w-3" /> {t('templates.approve')}
      </button>
      <button onClick={() => onReject(itemId)} disabled={isLoading}
        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-destructive/10 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50">
        <XCircle className="h-3 w-3" /> {t('templates.rejectItem')}
      </button>
    </div>
  )
}

function CroContent({ content }: { content: Record<string, unknown> }) {
  if (!content || typeof content !== 'object') return null
  return (
    <div className="space-y-2 text-xs text-foreground">
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <p className="font-semibold text-foreground">{key}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{String(value)}</p>
        </div>
      ))}
    </div>
  )
}

function TemplateContent({ content }: { content: Record<string, unknown> }) {
  if (!content || typeof content !== 'object') return null
  return (
    <div className="space-y-1 text-xs text-foreground">
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <span className="font-medium">{key}: </span>
          <span className="text-muted-foreground">{String(value)}</span>
        </div>
      ))}
    </div>
  )
}
