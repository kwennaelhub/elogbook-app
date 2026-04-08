'use client'

import { useState } from 'react'
import { Users, BookCheck, Upload, Stethoscope, Search, Download, Plus, X } from 'lucide-react'
import type { DesRegistry, Profile, Hospital } from '@/types/database'
import { DES_LEVEL_LABELS, SUPERVISOR_TITLE_LABELS } from '@/types/database'
import type { SupervisorTitle } from '@/types/database'
import { createSupervisor, updateSupervisor } from '@/lib/actions/data'

interface AdminPanelProps {
  registryEntries: DesRegistry[]
  registryCount: number
  users: (Profile & { hospital?: { name: string } | null })[]
  usersCount: number
  supervisors: (Profile & { hospital?: { name: string } | null })[]
  supervisorsCount: number
  hospitals: Hospital[]
}

export function AdminPanel({
  registryEntries, registryCount,
  users, usersCount,
  supervisors, supervisorsCount,
  hospitals,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'registry' | 'users' | 'supervisors'>('registry')
  const [search, setSearch] = useState('')
  const [showAddSupervisor, setShowAddSupervisor] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', title: 'Pr' as string, hospital_id: '', phone: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addResult, setAddResult] = useState<{ error?: string; success?: boolean; tempPassword?: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Filtrage par recherche
  const filteredRegistry = registryEntries.filter(e =>
    !search || [e.last_name, e.first_name, e.matricule].some(f => f.toLowerCase().includes(search.toLowerCase()))
  )
  const filteredUsers = users.filter(u =>
    !search || [u.last_name, u.first_name, u.email].some(f => f.toLowerCase().includes(search.toLowerCase()))
  )
  const filteredSupervisors = supervisors.filter(s =>
    !search || [s.last_name, s.first_name, s.email, s.title || ''].some(f => f.toLowerCase().includes(search.toLowerCase()))
  )

  const handleExport = async (type: string) => {
    const response = await fetch(`/api/export/${type}?search=${encodeURIComponent(search)}`)
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddSupervisor = async () => {
    setAddLoading(true)
    setAddResult(null)
    const result = await createSupervisor(addForm)
    setAddResult(result)
    setAddLoading(false)
    if (result.success) {
      setAddForm({ first_name: '', last_name: '', email: '', title: 'Pr', hospital_id: '', phone: '' })
    }
  }

  const handleUpdateTitle = async (id: string) => {
    await updateSupervisor(id, { title: editTitle })
    setEditingId(null)
  }

  const tabs = [
    { key: 'registry' as const, label: `Registre DES (${registryCount})`, icon: BookCheck },
    { key: 'users' as const, label: `Utilisateurs (${usersCount})`, icon: Users },
    { key: 'supervisors' as const, label: `Superviseurs (${supervisorsCount})`, icon: Stethoscope },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Barre de recherche + Export */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, matricule..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>
        <button
          onClick={() => handleExport(tab === 'registry' ? 'registry' : tab === 'users' ? 'students' : 'supervisors')}
          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Download className="h-4 w-4" /> Excel
        </button>
        {tab === 'registry' && (
          <button className="flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
            <Upload className="h-4 w-4" /> CSV
          </button>
        )}
        {tab === 'supervisors' && (
          <button
            onClick={() => setShowAddSupervisor(true)}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        )}
      </div>

      {/* Modal Ajout Superviseur */}
      {showAddSupervisor && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Nouveau superviseur</h3>
            <button onClick={() => { setShowAddSupervisor(false); setAddResult(null) }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {addResult?.error && (
            <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{addResult.error}</div>
          )}
          {addResult?.success && (
            <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <p className="font-medium">Superviseur créé avec succès !</p>
              <p className="mt-1">Mot de passe temporaire : <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs">{addResult.tempPassword}</code></p>
              <p className="mt-1 text-xs">Communiquez ce mot de passe au superviseur. Il pourra le changer à la première connexion.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
              <select
                value={addForm.title}
                onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {(Object.entries(SUPERVISOR_TITLE_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v} ({k})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hôpital</label>
              <select
                value={addForm.hospital_id}
                onChange={e => setAddForm(p => ({ ...p, hospital_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">— Sélectionner —</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nom</label>
              <input
                value={addForm.last_name}
                onChange={e => setAddForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Prénom</label>
              <input
                value={addForm.first_name}
                onChange={e => setAddForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Téléphone</label>
              <input
                value={addForm.phone}
                onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddSupervisor}
            disabled={addLoading || !addForm.email || !addForm.last_name || !addForm.first_name || !addForm.hospital_id}
            className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addLoading ? 'Création...' : 'Créer le superviseur'}
          </button>
        </div>
      )}

      {/* Registre DES */}
      {tab === 'registry' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Matricule</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Nom</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Prénom</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Niveau</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Promo</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistry.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{entry.matricule}</td>
                  <td className="px-3 py-2 font-medium">{entry.last_name}</td>
                  <td className="px-3 py-2">{entry.first_name}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {DES_LEVEL_LABELS[entry.des_level]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{entry.promotion_year}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRegistry.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Aucun résultat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Utilisateurs */}
      {tab === 'users' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Nom</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Email</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Rôle</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Niveau</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Hôpital</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{u.last_name} {u.first_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{u.email}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'supervisor' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{u.des_level || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{u.hospital?.name || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`h-2 w-2 inline-block rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Aucun résultat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Superviseurs */}
      {tab === 'supervisors' && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Titre</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Nom complet</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Email</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Hôpital</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Téléphone</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSupervisors.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                        >
                          {(Object.keys(SUPERVISOR_TITLE_LABELS) as SupervisorTitle[]).map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                        <button onClick={() => handleUpdateTitle(s.id)} className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">OK</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">x</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(s.id); setEditTitle(s.title || 'Dr') }}
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                      >
                        {s.title || '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{s.last_name} {s.first_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{s.email}</td>
                  <td className="px-3 py-2 text-xs">{s.hospital?.name || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{s.phone || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`h-2 w-2 inline-block rounded-full ${s.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  </td>
                </tr>
              ))}
              {filteredSupervisors.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Aucun superviseur enregistré</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
