'use client'

import { useState } from 'react'
import { User, Hospital, AlertTriangle, Trash2 } from 'lucide-react'
import { deleteAccount } from '@/lib/actions/auth'
import type { Profile } from '@/types/database'
import { DES_LEVEL_LABELS } from '@/types/database'
import type { DesLevel } from '@/types/database'

interface SettingsPanelProps {
  profile: (Profile & { hospital?: { name: string } | null }) | null
  hospitals: { id: string; name: string }[]
}

export function SettingsPanel({ profile, hospitals }: SettingsPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (deleteText !== 'SUPPRIMER') return
    setDeleting(true)
    await deleteAccount()
  }

  return (
    <div className="space-y-4">
      {/* Informations du profil */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Mon profil</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Nom</span>
            <span className="font-medium text-slate-900">{profile?.last_name} {profile?.first_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="text-slate-700">{profile?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Niveau</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {profile?.des_level ? DES_LEVEL_LABELS[profile.des_level as DesLevel] : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Rôle</span>
            <span className="text-slate-700">{profile?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Hôpital</span>
            <span className="text-slate-700">{profile?.hospital?.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Matricule</span>
            <span className="font-mono text-xs text-slate-700">{profile?.matricule || '—'}</span>
          </div>
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-red-200">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-red-700">Zone dangereuse</h3>
        </div>

        {!showDeleteConfirm ? (
          <div>
            <p className="mb-3 text-xs text-slate-500">
              La suppression de votre compte est irréversible. Toutes vos données (interventions, gardes, statistiques) seront définitivement désactivées.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer mon compte
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs font-medium text-red-800">
                Cette action est irréversible. Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous.
              </p>
            </div>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Tapez SUPPRIMER"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== 'SUPPRIMER' || deleting}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
