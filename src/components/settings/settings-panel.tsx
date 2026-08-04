'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { User, Hospital, AlertTriangle, Trash2, Camera, Pencil, Check, X, Save, Globe, Lock, Eye, EyeOff, Download, ShieldAlert } from 'lucide-react'
import { changePassword } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  // RGPD — Export
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ error?: string; success?: boolean; rowCount?: number; sizeKb?: number } | null>(null)

  // RGPD — Delete (nouveau flux : password + reason + 30j grace)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteShowPw, setDeleteShowPw] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleExport = async () => {
    setExporting(true)
    setExportResult(null)
    try {
      const res = await fetch('/api/user/export', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setExportResult({ error: body.message || body.error || 'gdpr.error.internal' })
        return
      }
      setExportResult({ success: true, rowCount: body.row_count, sizeKb: body.size_kb })
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePassword) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword, reason: deleteReason || undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(body.message || body.error || 'gdpr.error.deleteFailed')
        return
      }
      // Session déjà invalidée côté serveur — redirection vers /login
      router.push('/login?deletion=pending')
    } finally {
      setDeleting(false)
    }
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

      {/* RGPD — Export self-service (Art. 20) */}
      <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-emerald-500/20">
        <div className="mb-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-foreground">Mes données personnelles</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Téléchargez une copie complète de vos données (profil, interventions, gardes, notes,
          suivis) au format JSON — conformément à l&apos;article 20 du RGPD (droit à la portabilité).
          Le lien de téléchargement vous sera envoyé par email et restera valide 24 h.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Génération en cours…' : 'Exporter mes données (RGPD)'}
        </button>
        {exportResult?.success ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            ✅ Export prêt — {exportResult.rowCount} enregistrements ({exportResult.sizeKb} Ko).
            Consultez votre boîte email (vérifiez les spams).
          </p>
        ) : exportResult?.error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
            ❌ {exportResult.error === 'gdpr.error.rateLimited'
              ? 'Vous avez atteint la limite de 3 exports par 24 heures.'
              : `Erreur : ${exportResult.error}`}
          </p>
        ) : null}
      </div>

      {/* Zone dangereuse — Suppression compte (Art. 17) avec grace period 30j */}
      <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-destructive/30">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">Zone dangereuse</h3>
        </div>

        {!showDeleteConfirm ? (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              La suppression de votre compte est réversible pendant 30 jours. Passé ce délai,
              toutes vos données personnelles seront effacées ou anonymisées. Cette action
              relève de l&apos;article 17 du RGPD.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer mon compte
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-destructive/10 p-3">
              <div className="mb-2 flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                <div className="text-xs font-medium text-destructive">
                  Vous avez 30 jours pour annuler cette demande. Après quoi vos données seront
                  effacées définitivement. Nous vous recommandons d&apos;exporter vos données au
                  préalable via le bouton ci-dessus.
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Confirmez avec votre mot de passe
              </label>
              <div className="relative">
                <input
                  type={deleteShowPw ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-destructive/40 bg-card px-3 py-2 pr-10 text-sm text-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20"
                />
                <button
                  type="button"
                  onClick={() => setDeleteShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={deleteShowPw ? 'Masquer' : 'Afficher'}
                >
                  {deleteShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Raison (facultatif — nous aide à améliorer InternLog)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Ex. je n'utilise plus l'application, préoccupations de confidentialité…"
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {deleteReason.length}/500
              </p>
            </div>

            {deleteError ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                {deleteError === 'gdpr.error.passwordInvalid'
                  ? 'Mot de passe incorrect.'
                  : deleteError === 'gdpr.error.activeSubscription'
                  ? 'Un abonnement est actif. Annulez-le avant de supprimer votre compte.'
                  : deleteError === 'gdpr.error.alreadyPending'
                  ? 'Une demande de suppression est déjà en cours.'
                  : `Erreur : ${deleteError}`}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletePassword('')
                  setDeleteReason('')
                  setDeleteError(null)
                }}
                className="flex-1 rounded-lg border border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={!deletePassword || deleting}
                className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? 'Envoi…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
