'use client'

import { useState } from 'react'
import { FileText, Pill, ClipboardList, Wrench } from 'lucide-react'
import type { CroTemplate, PrescriptionTemplate, PreopTemplate, Instrument } from '@/types/database'

interface TemplatesTabsProps {
  croTemplates: CroTemplate[]
  prescriptionTemplates: PrescriptionTemplate[]
  preopTemplates: PreopTemplate[]
  instruments: Instrument[]
}

const TABS = [
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
}

export function TemplatesTabs({
  croTemplates, prescriptionTemplates, preopTemplates, instruments,
}: TemplatesTabsProps) {
  const [activeTab, setActiveTab] = useState('cro')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedTemplate(null) }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* CRO Templates */}
      {activeTab === 'cro' && (
        <div className="space-y-2">
          {croTemplates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun template CRO disponible</p>
          ) : (
            croTemplates.map((t) => (
              <div key={t.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <p className="text-sm font-medium text-slate-900">{t.title}</p>
                </button>
                {selectedTemplate === t.id && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <CroContent content={t.content} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-2">
          {prescriptionTemplates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucune ordonnance type disponible</p>
          ) : (
            prescriptionTemplates.map((t) => (
              <div key={t.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <p className="text-sm font-medium text-slate-900">{t.title}</p>
                </button>
                {selectedTemplate === t.id && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <TemplateContent content={t.content} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Bilans pré-opératoires */}
      {activeTab === 'preop' && (
        <div className="space-y-2">
          {preopTemplates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun bilan pré-op disponible</p>
          ) : (
            preopTemplates.map((t) => (
              <div key={t.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <p className="text-sm font-medium text-slate-900">{t.title}</p>
                </button>
                {selectedTemplate === t.id && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <TemplateContent content={t.items} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Instruments */}
      {activeTab === 'instruments' && (
        <div className="space-y-4">
          {Object.entries(INSTRUMENT_CATEGORIES).map(([key, label]) => {
            const catInstruments = instruments.filter((i) => i.category === key)
            if (catInstruments.length === 0) return null
            return (
              <div key={key}>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">{label}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {catInstruments.map((inst) => (
                    <div
                      key={inst.id}
                      className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
                    >
                      {inst.image_url && (
                        <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-slate-100">
                          <img src={inst.image_url} alt={inst.name} className="h-full w-full object-contain" />
                        </div>
                      )}
                      <p className="text-xs font-medium text-slate-900">{inst.name}</p>
                      {inst.description && (
                        <p className="mt-0.5 text-[10px] text-slate-500">{inst.description}</p>
                      )}
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
