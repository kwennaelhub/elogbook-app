'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { User, Hospital, AlertTriangle, Trash2, Camera, Pencil, Check, X, Save, Globe, Lock, Eye, EyeOff } from 'lucide-react'
import { deleteAccount, changePassword } from '@/lib/actions/auth'
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

  // Changement de mot de passe
  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwShow, setPwShow] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwResult, setPwResult] = useState<{ error?: string; success?: boolean } | null>(null)

  const handleChangePassword = async () => {
    setPwResult(null)
    if (pwNew !== pwConfirm) {
      setPwResult({ error: 'auth.error.passwordMismatch' })
      return
    }
    setPwLoading(true)
    const result = await changePassword(pwCurrent, pwNew)
    setPwLoading(false)
    setPwResult(result)
    if (result.success) {
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      setTimeout(() => {
        setPwOpen(false)
        setPwResult(null)
      }, 2500)
    }
  }

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
          saveResult.success ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
        }`}>
          {saveResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {saveResult.success ? t('settings.profileUpdated') : t(saveResult.error!)}
        </div>
      )}

      {/* Avatar + Nom */}
      <div className="card-base">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
                unoptimized={avatarPreview.startsWith('data:')}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white ring-2 ring-primary/30">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 rounded-full bg-foreground/80 p-1.5 text-white shadow-lg hover:bg-foreground/70 disabled:opacity-50"
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
            <h3 className="text-lg font-semibold text-foreground">
              {profile?.last_name} {profile?.first_name}
            </h3>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              {profile?.des_level && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t(`des.${profile.des_level}`)}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                profile?.role === 'developer' ? 'bg-primary/10 text-primary' :
                profile?.role === 'superadmin' ? 'bg-destructive/15 text-destructive' :
                profile?.role === 'admin' ? 'bg-purple-500/15 text-purple-400' :
                profile?.role === 'supervisor' ? 'bg-amber-500/15 text-amber-400' :
                'bg-primary/10 text-primary'
              }`}>
                {profile?.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              editing
                ? 'bg-secondary text-muted-foreground'
                : 'bg-primary text-white hover:bg-primary/90'
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
          <p className="mt-2 text-xs text-primary">{t('settings.uploading')}</p>
        )}
      </div>

      {/* Informations du profil */}
      <div className="card-base">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t('settings.profile')}</h3>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.lastName')} *</label>
                <input
                  value={form.last_name}
                  onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.firstName')} *</label>
                <input
                  value={form.first_name}
                  onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.phone')}</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+229 XX XX XX XX"
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.dob')}</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.hospital')}</label>
                <select
                  value={form.hospital_id}
                  onChange={e => setForm(p => ({ ...p, hospital_id: e.target.value }))}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t('common.select')}</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.desLevel')}</label>
                <select
                  value={form.des_level}
                  onChange={e => setForm(p => ({ ...p, des_level: e.target.value }))}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? t('settings.saving') : t('settings.saveChanges')}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.name')}</span>
              <span className="font-medium text-foreground">{profile?.last_name} {profile?.first_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.email')}</span>
              <span className="text-foreground">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.phone')}</span>
              <span className="text-foreground">{profile?.phone || t('settings.none')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.dob')}</span>
              <span className="text-foreground">
                {profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
                  : t('settings.none')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.level')}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {profile?.des_level ? t(`des.${profile.des_level}`) : t('settings.none')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.role')}</span>
              <span className="text-foreground">{profile?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.hospital')}</span>
              <span className="text-foreground">{profile?.hospital?.name || t('settings.none')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.matricule')}</span>
              <span className="font-mono text-xs text-foreground">{profile?.matricule || t('settings.none')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Langue */}
      <div className="card-base">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">{t('settings.language')}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLocale('fr')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              locale === 'fr' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <span className="mr-1.5 inline-block text-xs font-bold uppercase">FR</span> Français
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              locale === 'en' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <span className="mr-1.5 inline-block text-xs font-bold uppercase">EN</span> English
          </button>
        </div>
      </div>

      {/* Sécurité — Changement de mot de passe */}
      <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-border/40">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">{t('settings.security')}</h3>
          </div>
          {!pwOpen && (
            <button
              onClick={() => setPwOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('settings.changePassword')}
            </button>
          )}
        </div>

        {!pwOpen ? (
          <p className="text-xs text-muted-foreground">{t('settings.passwordHint')}</p>
        ) : (
          <div className="space-y-3">
            {pwResult?.error && (
              <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{t(pwResult.error)}</div>
            )}
            {pwResult?.success && (
              <div className="rounded-lg bg-accent/10 p-2 text-xs text-accent">{t('settings.passwordChanged')}</div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.currentPassword')}</label>
              <div className="relative">
                <input
                  type={pwShow ? 'text' : 'password'}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 pr-10 text-sm text-foreground focus:border-primary focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setPwShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={pwShow ? t('settings.hidePassword') : t('settings.showPassword')}
                >
                  {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.newPassword')}</label>
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                minLength={8}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{t('settings.passwordMinLength')}</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('settings.confirmPassword')}</label>
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                minLength={8}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                autoComplete="new-password"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setPwOpen(false); setPwCurrent(''); setPwNew(''); setPwConfirm(''); setPwResult(null) }}
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleChangePassword}
                disabled={pwLoading || !pwCurrent || pwNew.length < 8 || !pwConfirm}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {pwLoading ? t('settings.saving') : t('settings.saveNewPassword')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone dangereuse */}
      <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-destructive/30">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">{t('settings.dangerZone')}</h3>
        </div>

        {!showDeleteConfirm ? (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              {t('settings.deleteWarning')}
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              {t('settings.deleteAccount')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive">
                {t('settings.deleteConfirm')}
              </p>
            </div>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={t('settings.typeDelete')}
              className="w-full rounded-lg border border-destructive/40 bg-card px-3 py-2 text-sm text-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== confirmWord || deleting}
                className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
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
