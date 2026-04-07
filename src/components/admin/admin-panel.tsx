'use client'

import { useState } from 'react'
import { Users, BookCheck, Upload } from 'lucide-react'
import type { DesRegistry, Profile } from '@/types/database'
import { DES_LEVEL_LABELS } from '@/types/database'

interface AdminPanelProps {
  registryEntries: DesRegistry[]
  registryCount: number
  users: (Profile & { hospital?: { name: string } | null })[]
  usersCount: number
}

export function AdminPanel({ registryEntries, registryCount, users, usersCount }: AdminPanelProps) {
  const [tab, setTab] = useState<'registry' | 'users'>('registry')

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('registry')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'registry' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BookCheck className="h-4 w-4" /> Registre DES ({registryCount})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'users' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="h-4 w-4" /> Utilisateurs ({usersCount})
        </button>
      </div>

      {/* Registre DES */}
      {tab === 'registry' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Liste officielle des étudiants DES autorisés à s&apos;inscrire
            </p>
            <button className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
              <Upload className="h-3 w-3" /> Importer CSV
            </button>
          </div>

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
                {registryEntries.map((entry) => (
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
              </tbody>
            </table>
          </div>
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
              {users.map((u) => (
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
