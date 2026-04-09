'use client'

import { useState, useRef } from 'react'
import { User, Hospital, AlertTriangle, Trash2, Camera, Pencil, Check, X, Save, Globe } from 'lucide-react'
import { deleteAccount } from '@/lib/actions/auth'
import { updateProfile } from '@/lib/actions/admin'
import { useI18n } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'
import type { Profile } from '@/types/database'
import { DES_LEVEL_LABELS } from '@/types/database'
import type { DesLevel } from '@/types/database'

interface SettingsPanelProps {
  profile: (Profile & { hospital?: { name: string } | null }) | null
  hospitals: { id: string; name: string }[]
}

export function SettingsPanel({ profile, hospitals }: SettingsPanelProps) {
  const { locale, setLocale, t } = useI18n()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Édition du profil
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    hospital_id: profile?.hospital_id || '',
    des_level: profile?.des_level || '',
    date_of_birth: profile?.date_of_birth || '',
  })

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDelete = async () => {
    if (deleteText !== 'SUPPRIMER') return
    setDeleting(true)
    await deleteAccount()
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    const result = await updateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      hospital_id: form.hospital_id,
      des_level: form.des_level,
      date_of_birth: form.date_of_birth,
    })
    setSaving(false)
    setSaveResult(result)
    if (result.success) {
      setEditing(false)
      setTimeout(() => setSaveResult(null), 3000)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setSaveResult({ error: 'L\'image ne doit pas dépasser 2 Mo' })
      return
    }

    // Prévisualisation locale
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload vers Supabase Storage via API
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (data.url) {
        await updateProfile({ avatar_url: data.url })
        setAvatarPreview(data.url)
        setSaveResult({ success: true })
        setTimeout(() => setSaveResult(null), 3000)
      } else {
        setSaveResult({ error: data.error || 'Erreur lors de l\'upload' })
      }
    } catch {
      setSaveResult({ error: 'Erreur lors de l\'upload de l\'avatar' })
    }
    setUploadingAvatar(false)
  }

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="space-y-4">
      {/* Feedback */}
      {saveResult && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          saveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {saveResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {saveResult.success ? 'Profil mis à jour avec succès !' : saveResult.error}
        </div>
      )}

      {/* Avatar + Nom */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white ring-2 ring-emerald-200">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 rounded-full bg-slate-700 p-1.5 text-white shadow-lg hover:bg-slate-600 disabled:opacity-50"
              title="Changer la photo"
            >
              <Camera className="h-3 w-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {profile?.last_name} {profile?.first_name}
            </h3>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              {profile?.des_level && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {DES_LEVEL_LABELS[profile.des_level as DesLevel]}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                profile?.role === 'developer' ? 'bg-emerald-100 text-emerald-800' :
                profile?.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                profile?.role === 'supervisor' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {profile?.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              editing
                ? 'bg-slate-200 text-slate-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {editing ? (
              <span className="flex items-center gap-1"><X className="h-3 w-3" /> Annuler</span>
            ) : (
              <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> Modifier</span>
            )}
          </button>
        </div>

        {uploadingAvatar && (
          <p className="mt-2 text-xs text-emerald-600">Upload en cours...</p>
        )}
      </div>

      {/* Informations du profil */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Informations personnelles</h3>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nom *</label>
                <input
                  value={form.last_name}
                  onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Prénom *</label>
                <input
                  value={form.first_name}
                  onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+229 XX XX XX XX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Date de naissance</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Hôpital</label>
                <select
                  value={form.hospital_id}
                  onChange={e => setForm(p => ({ ...p, hospital_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">— Sélectionner —</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Niveau DES</label>
                <select
                  value={form.des_level}
                  onChange={e => setForm(p => ({ ...p, des_level: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">— Non défini —</option>
                  {(Object.entries(DES_LEVEL_LABELS) as [DesLevel, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.first_name || !form.last_name}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        ) : (
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
              <span className="text-slate-500">Téléphone</span>
              <span className="text-slate-700">{profile?.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date de naissance</span>
              <span className="text-slate-700">
                {profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </span>
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
        )}
      </div>

      {/* Langue */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-800">{t('settings.language')}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLocale('fr')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              locale === 'fr' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🇫🇷 Français
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              locale === 'en' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🇬🇧 English
          </button>
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
