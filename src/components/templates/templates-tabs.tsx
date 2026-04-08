'use client'

import { useState } from 'react'
import { FileText, Pill, ClipboardList, Wrench, Stethoscope, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { CroTemplate, PrescriptionTemplate, PreopTemplate, Instrument } from '@/types/database'
import { addCroTemplate, addPrescriptionTemplate, addPreopTemplate, addInstrument, addTechnique } from '@/lib/actions/admin'

interface Technique {
  id: string
  title: string
  steps: string[]
  tips: string | null
  contraindications: string | null
  refs: string | null
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
  { id: 'techniques', label: 'Techniques', icon: Stethoscope },
  { id: 'cro', label: 'CRO', icon: FileText },
  { id: 'prescriptions', label: 'Ordonnances', icon: Pill },
  { id: 'preop', label: 'Bilans', icon: ClipboardList },
  { id: 'instruments', label: 'Instruments', icon: Wrench },
]

const INSTRUMENT_CATEGORIES: Record<string, string> = {
  coupe: 'Coupe',
  prehension: 'Préhension',
  hemostase: 'Hémostase',
  ecartement: 'Écartement',
  suture: 'Suture',
  aspiration: 'Aspiration',
  autre: 'Autre',
}

export function TemplatesTabs({
  croTemplates, prescriptionTemplates, preopTemplates, instruments, techniques, specialties, isAdmin,
}: TemplatesTabsProps) {
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

  const resetForm = () => {
    setFormTitle(''); setFormSpecialty(''); setFormContent('');
    setFormCategory('coupe'); setFormDescription(''); setFormSteps('');
    setFormTips(''); setFormContra(''); setAddResult(null)
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
            setAddResult({ error: 'Titre et étapes sont obligatoires' })
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
          result = { error: 'Type inconnu' }
      }
    } catch {
      result = { error: 'Erreur serveur' }
    }

    setAddResult(result)
    setAddLoading(false)
    if (result.success) resetForm()
  }

  return (
    <div>
      {/* Tabs scrollables */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedId(null); setShowAddForm(false); resetForm() }}
              className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Bouton Ajouter (admin only) */}
      {isAdmin && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => { setShowAddForm(!showAddForm); setAddResult(null) }}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddForm ? 'Fermer' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {isAdmin && showAddForm && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Ajouter {activeTab === 'techniques' ? 'une technique opératoire' : activeTab === 'instruments' ? 'un instrument' : `un ${TABS.find(t => t.id === activeTab)?.label}`}
          </h3>

          {addResult?.error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{addResult.error}</div>}
          {addResult?.success && <div className="mb-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">Ajouté avec succès ! Rechargez la page.</div>}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {activeTab === 'instruments' ? 'Nom de l\'instrument' : 'Titre'} *
              </label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder={activeTab === 'techniques' ? 'Ex: Appendicectomie par voie de McBurney' : activeTab === 'instruments' ? 'Ex: Bistouri n°11' : 'Titre...'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {activeTab !== 'instruments' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Spécialité</label>
                <select
                  value={formSpecialty}
                  onChange={e => setFormSpecialty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">— Toutes —</option>
                  {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {activeTab === 'instruments' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Catégorie *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    {Object.entries(INSTRUMENT_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {activeTab === 'techniques' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Étapes opératoires * (une par ligne)</label>
                  <textarea
                    value={formSteps}
                    onChange={e => setFormSteps(e.target.value)}
                    rows={6}
                    placeholder={"1. Installation du patient\n2. Asepsie et champs\n3. Incision de McBurney\n4. Ouverture plan par plan\n5. Ligature du méso-appendice\n6. Section de l'appendice\n7. Fermeture plan par plan"}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Astuces / Points clés</label>
                  <textarea
                    value={formTips}
                    onChange={e => setFormTips(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Contre-indications</label>
                  <textarea
                    value={formContra}
                    onChange={e => setFormContra(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {['cro', 'prescriptions', 'preop'].includes(activeTab) && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Contenu {activeTab === 'cro' ? '(sections séparées par une ligne vide)' : '(clé: valeur, une par ligne)'}
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={addLoading || !formTitle}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {addLoading ? 'Ajout en cours...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* ===== TECHNIQUES OPÉRATOIRES ===== */}
      {activeTab === 'techniques' && (
        <div className="space-y-2">
          {techniques.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-12 text-center">
              <Stethoscope className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">Aucune technique opératoire disponible</p>
              {isAdmin && <p className="mt-1 text-xs text-slate-400">Utilisez le bouton "Ajouter" ci-dessus</p>}
            </div>
          ) : (
            techniques.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.title}</p>
                    <div className="mt-0.5 flex gap-1.5">
                      {t.specialty && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          {(t.specialty as { name: string }).name}
                        </span>
                      )}
                      {t.procedure && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {(t.procedure as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedId === t.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {selectedId === t.id && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <div className="mb-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Étapes</p>
                      <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-700">
                        {t.steps.map((step, i) => (
                          <li key={i} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                    </div>
                    {t.tips && (
                      <div className="mb-2 rounded-lg bg-amber-50 p-2">
                        <p className="text-[10px] font-semibold text-amber-700">Points clés</p>
                        <p className="text-xs text-amber-800">{t.tips}</p>
                      </div>
                    )}
                    {t.contraindications && (
                      <div className="rounded-lg bg-red-50 p-2">
                        <p className="text-[10px] font-semibold text-red-700">Contre-indications</p>
                        <p className="text-xs text-red-800">{t.contraindications}</p>
                      </div>
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
            <EmptyState label="Aucun template CRO" isAdmin={isAdmin} />
          ) : croTemplates.map((t) => (
            <ExpandableCard key={t.id} id={t.id} title={t.title} selectedId={selectedId} setSelectedId={setSelectedId}>
              <CroContent content={t.content} />
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* ===== ORDONNANCES ===== */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-2">
          {prescriptionTemplates.length === 0 ? (
            <EmptyState label="Aucune ordonnance type" isAdmin={isAdmin} />
          ) : prescriptionTemplates.map((t) => (
            <ExpandableCard key={t.id} id={t.id} title={t.title} selectedId={selectedId} setSelectedId={setSelectedId}>
              <TemplateContent content={t.content} />
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* ===== BILANS ===== */}
      {activeTab === 'preop' && (
        <div className="space-y-2">
          {preopTemplates.length === 0 ? (
            <EmptyState label="Aucun bilan pré-op" isAdmin={isAdmin} />
          ) : preopTemplates.map((t) => (
            <ExpandableCard key={t.id} id={t.id} title={t.title} selectedId={selectedId} setSelectedId={setSelectedId}>
              <TemplateContent content={t.items} />
            </ExpandableCard>
          ))}
        </div>
      )}

      {/* ===== INSTRUMENTS ===== */}
      {activeTab === 'instruments' && (
        <div className="space-y-4">
          {instruments.length === 0 ? (
            <EmptyState label="Aucun instrument" isAdmin={isAdmin} />
          ) : Object.entries(INSTRUMENT_CATEGORIES).map(([key, label]) => {
            const catInstruments = instruments.filter((i) => i.category === key)
            if (catInstruments.length === 0) return null
            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">{label}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {catInstruments.map((inst) => (
                    <div key={inst.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      {inst.image_url && (
                        <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-slate-100">
                          <img src={inst.image_url} alt={inst.name} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-slate-900">{inst.name}</p>
                      {inst.description && <p className="mt-0.5 text-[10px] text-slate-500">{inst.description}</p>}
                    </div>
                  ))}
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

function EmptyState({ label, isAdmin }: { label: string; isAdmin: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 py-12 text-center">
      <p className="text-sm text-slate-400">{label}</p>
      {isAdmin && <p className="mt-1 text-xs text-slate-400">Utilisez le bouton "Ajouter" ci-dessus</p>}
    </div>
  )
}

function ExpandableCard({ id, title, selectedId, setSelectedId, children }: {
  id: string; title: string; selectedId: string | null; setSelectedId: (id: string | null) => void; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setSelectedId(selectedId === id ? null : id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {selectedId === id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {selectedId === id && (
        <div className="border-t border-slate-100 px-4 py-3">{children}</div>
      )}
    </div>
  )
}

function CroContent({ content }: { content: Record<string, unknown> }) {
  if (!content || typeof content !== 'object') return null
  return (
    <div className="space-y-2 text-xs text-slate-700">
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <p className="font-semibold text-slate-900">{key}</p>
          <p className="whitespace-pre-wrap text-slate-600">{String(value)}</p>
        </div>
      ))}
    </div>
  )
}

function TemplateContent({ content }: { content: Record<string, unknown> }) {
  if (!content || typeof content !== 'object') return null
  return (
    <div className="space-y-1 text-xs text-slate-700">
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <span className="font-medium">{key}: </span>
          <span className="text-slate-600">{String(value)}</span>
        </div>
      ))}
    </div>
  )
}
