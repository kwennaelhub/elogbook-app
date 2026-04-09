'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { User, Hospital, AlertTriangle, Trash2, Camera, Pencil, Check, X, Save, Globe } from 'lucide-react'
import { deleteAccount } from '@/lib/actions/auth'
import { updateProfile } from '@/lib/actions/admin'
import { useI18n } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'
import type { Profile, DesLevel } from '@/types/database'

interface SettingsPanelProps {
  profile: (Profile & { hospital?: { name: string } | null }) | null
  hospitals: { id: string; name: string }[]
}

export function SettingsPanel({ profile, hospitals }: SettingsPanelProps) {
  const { locale, setLocale, t } = useI18n()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const confirmWord = t('settings.deleteConfirmWord')

  const handleDelete = async () => {
    if (deleteText !== confirmWord) return
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

    if (file.size > 2 * 1024 * 1024) {
      setSaveResult({ error: t('settings.imageTooLarge') })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)

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
        setSaveResult({ error: data.error || t('settings.uploadError') })
      }
    } catch {
      setSaveResult({ error: t('settings.uploadError') })
    }
    setUploadingAvatar(false)
  }

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase()
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR'

  return (
    <div className="space-y-4">
      {saveResult && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          saveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {saveResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {saveResult.success ? t('settings.profileUpdated') : saveResult.error}
        </div>
      )}

      {/* Avatar + Nom */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-200"
                unoptimized={avatarPreview.startsWith('data:')}
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
              aria-label={t('settings.changePhoto')}
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
                  {t(`des.${profile.des_level}`)}
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
              <span className="flex items-center gap-1"><X className="h-3 w-3" /> {t('common.cancel')}</span>
            ) : (
              <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> {t('common.edit')}</span>
            )}
          </button>
        </div>

        {uploadingAvatar && (
          <p className="mt-2 text-xs text-emerald-600">{t('settings.uploading')}</p>
        )}
      </div>

      {/* Informations du profil */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">{t('settings.profile')}</h3>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('settings.lastName')} *</label>
                <input
                  value={form.last_name}
                  onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('settings.firstName')} *</label>
                <input
                  value={form.first_name}
                  onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('settings.phone')}</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+229 XX XX XX XX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('settings.dob')}</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('settings.hospital')}</label>
                <select
                  value={form.hospital_id}
                  onChange={e => setForm(p => ({ ...p, hospital_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">{t('common.select')}</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('settings.desLevel')}</label>
                <select
                  value={form.des_level}
                  onChange={e => setForm(p => ({ ...p, des_level: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">{t('settings.notDefined')}</option>
                  {(['DES1', 'DES2', 'DES3', 'DES4', 'DES5'] as const).map((k) => (
                    <option key={k} value={k}>{t(`des.${k}`)}</option>
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
              {saving ? t('settings.saving') : t('settings.saveChanges')}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.name')}</span>
              <span className="font-medium text-slate-900">{profile?.last_name} {profile?.first_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.email')}</span>
              <span className="text-slate-700">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.phone')}</span>
              <span className="text-slate-700">{profile?.phone || t('settings.none')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.dob')}</span>
              <span className="text-slate-700">
                {profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
                  : t('settings.none')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.level')}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {profile?.des_level ? t(`des.${profile.des_level}`) : t('settings.none')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.role')}</span>
              <span className="text-slate-700">{profile?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.hospital')}</span>
              <span className="text-slate-700">{profile?.hospital?.name || t('settings.none')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('settings.matricule')}</span>
              <span className="font-mono text-xs text-slate-700">{profile?.matricule || t('settings.none')}</span>
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
            <span className="mr-1.5 inline-block text-xs font-bold uppercase">FR</span> Français
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              locale === 'en' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="mr-1.5 inline-block text-xs font-bold uppercase">EN</span> English
          </button>
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-red-200">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-red-700">{t('settings.dangerZone')}</h3>
        </div>

        {!showDeleteConfirm ? (
          <div>
            <p className="mb-3 text-xs text-slate-500">
              {t('settings.deleteWarning')}
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              {t('settings.deleteAccount')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs font-medium text-red-800">
                {t('settings.deleteConfirm')}
              </p>
            </div>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={t('settings.typeDelete')}
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== confirmWord || deleting}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t('settings.deleting') : t('settings.confirmDelete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
