'use client'

import { useState, useRef } from 'react'
import { Users, BookCheck, Upload, Stethoscope, Search, Download, Plus, X, FileSpreadsheet, UserPlus, AlertCircle, CheckCircle, Settings2, Shield, Building2, ClipboardList, Trash2 } from 'lucide-react'
import type { DesRegistry, Profile, Hospital, DesLevel } from '@/types/database'
import { SUPERVISOR_TITLE_LABELS } from '@/types/database'
import type { SupervisorTitle, UserRole } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'
import { createSupervisor, updateSupervisor, addDesRegistryEntry, importDesRegistryBatch } from '@/lib/actions/data'
import { updateUserRole, deleteUser } from '@/lib/actions/admin'
import { useRouter } from 'next/navigation'
import { ConfigTab } from './config-tab'
import { SeatsTab } from './seats-tab'

interface AdminPanelProps {
  registryEntries: DesRegistry[]
  registryCount: number
  users: (Profile & { hospital?: { name: string } | null })[]
  usersCount: number
  supervisors: (Profile & { hospital?: { name: string } | null })[]
  supervisorsCount: number
  hospitals: Hospital[]
  specialties: { id: string; name: string; is_active: boolean }[]
  procedures: { id: string; name: string; specialty_id: string; specialty?: { name: string } | null }[]
  desObjectives: { id: string; des_level: string; category: string; label: string; target_count: number; description?: string | null; specialty_name?: string | null; procedure_name?: string | null }[]
  institutionalSeats: unknown[]
  adhesionRequests: { id: string; first_name: string; last_name: string; email: string; phone?: string | null; hospital_id?: string | null; hospital_other?: string | null; specialty_id?: string | null; des_level: string; promotion_year?: number | null; motivation?: string | null; status: string; created_at: string }[]
  adhesionCount: number
  currentUserRole: string
}

export function AdminPanel({
  registryEntries, registryCount,
  users, usersCount,
  supervisors, supervisorsCount,
  hospitals, specialties, procedures, desObjectives,
  institutionalSeats,
  adhesionRequests, adhesionCount,
  currentUserRole,
}: AdminPanelProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [tab, setTab] = useState<'registry' | 'users' | 'supervisors' | 'seats' | 'adhesions' | 'config'>('registry')
  const [adhesions, setAdhesions] = useState(adhesionRequests)
  const [adhesionLoading, setAdhesionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // Gestion des rôles (Users tab)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleResult, setRoleResult] = useState<{ error?: string; success?: boolean } | null>(null)
  // Suppression utilisateur (Users tab)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ error?: string; success?: boolean } | null>(null)

  const handleRoleChange = async (userId: string) => {
    setRoleLoading(true)
    setRoleResult(null)
    const result = await updateUserRole(userId, selectedRole)
    setRoleResult(result)
    setRoleLoading(false)
    if (result.success) {
      setEditingRoleId(null)
      setTimeout(() => setRoleResult(null), 3000)
    }
  }

  const canManageRoles = ['developer', 'superadmin'].includes(currentUserRole)
  const canDeleteUsers = ['developer', 'superadmin'].includes(currentUserRole)

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteResult(null)
    const result = await deleteUser(deleteTarget.id)
    setDeleteLoading(false)
    if (result.success) {
      setDeleteResult({ success: true })
      setDeleteTarget(null)
      router.refresh()
      setTimeout(() => setDeleteResult(null), 4000)
    } else {
      setDeleteResult({ error: result.error })
    }
  }
  // Superviseur
  const [showAddSupervisor, setShowAddSupervisor] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', title: 'Pr' as string, hospital_id: '', phone: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addResult, setAddResult] = useState<{ error?: string; success?: boolean; tempPassword?: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  // Registre DES — ajout manuel
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [studentForm, setStudentForm] = useState({
    matricule: '', first_name: '', last_name: '', email: '',
    des_level: 'DES1' as string, promotion_year: new Date().getFullYear(), university: 'Université d\'Abomey-Calavi', specialty: '',
  })
  const [studentLoading, setStudentLoading] = useState(false)
  const [studentResult, setStudentResult] = useState<{ error?: string; success?: boolean } | null>(null)
  // Registre DES — import CSV
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ imported?: number; errors?: string[]; error?: string } | null>(null)

  // Filtrage par recherche
  const filteredRegistry = registryEntries.filter(e =>
    !search || [e.last_name, e.first_name, e.matricule, (e as DesRegistry & { matricule_long?: string }).matricule_long || ''].some(f => f.toLowerCase().includes(search.toLowerCase()))
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

  // Export fiche récapitulative utilisateur
  const handleExportUserStats = async (userId: string) => {
    const response = await fetch(`/api/export/user-stats?userId=${userId}`)
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const contentDisposition = response.headers.get('Content-Disposition')
    a.download = contentDisposition?.match(/filename="(.+)"/)?.[1] || `fiche_${userId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Ajout manuel d'un étudiant au registre
  const handleAddStudent = async () => {
    setStudentLoading(true)
    setStudentResult(null)
    const result = await addDesRegistryEntry({
      matricule: studentForm.matricule,
      first_name: studentForm.first_name,
      last_name: studentForm.last_name,
      email: studentForm.email || undefined,
      des_level: studentForm.des_level,
      promotion_year: studentForm.promotion_year,
      university: studentForm.university || undefined,
      specialty: studentForm.specialty || undefined,
    })
    setStudentResult(result)
    setStudentLoading(false)
    if (result.success) {
      setStudentForm({
        matricule: '', first_name: '', last_name: '', email: '',
        des_level: 'DES1', promotion_year: new Date().getFullYear(), university: 'Université d\'Abomey-Calavi', specialty: '',
      })
    }
  }

  // Import CSV
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) {
        setImportResult({ error: t('admin.emptyFile') })
        setImportLoading(false)
        return
      }

      // Détecter le séparateur (virgule, point-virgule, tabulation)
      const header = lines[0]
      const separator = header.includes(';') ? ';' : header.includes('\t') ? '\t' : ','
      const headers = header.split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

      // Mapper les colonnes (flexible : accepte matricule/mat, nom/last_name, prénom/first_name, etc.)
      const colMap = {
        matricule: headers.findIndex(h => ['matricule', 'mat', 'id_etudiant'].includes(h)),
        last_name: headers.findIndex(h => ['nom', 'last_name', 'nom_famille'].includes(h)),
        first_name: headers.findIndex(h => ['prenom', 'prénom', 'first_name', 'prénoms'].includes(h)),
        email: headers.findIndex(h => ['email', 'e-mail', 'mail', 'courriel'].includes(h)),
        des_level: headers.findIndex(h => ['niveau', 'des_level', 'niveau_des', 'annee'].includes(h)),
        promotion_year: headers.findIndex(h => ['promo', 'promotion', 'promotion_year', 'année_promo', 'annee_promo'].includes(h)),
        university: headers.findIndex(h => ['universite', 'université', 'university', 'fac'].includes(h)),
        specialty: headers.findIndex(h => ['specialite', 'spécialité', 'specialty', 'spec'].includes(h)),
      }

      if (colMap.matricule === -1 || colMap.last_name === -1 || colMap.first_name === -1) {
        setImportResult({
          error: `Colonnes obligatoires manquantes. En-têtes détectés : ${headers.join(', ')}. Requis : matricule, nom, prenom (ou prénom)`
        })
        setImportLoading(false)
        return
      }

      const entries = lines.slice(1).map(line => {
        const cols = line.split(separator).map(c => c.trim().replace(/^['"]|['"]$/g, ''))
        const desLevel = colMap.des_level >= 0 ? cols[colMap.des_level] : 'DES1'
        // Normaliser le niveau DES (accepte "DES1", "1", "1ère année", etc.)
        const normalizedLevel = desLevel.startsWith('DES') ? desLevel : `DES${desLevel.replace(/[^\d]/g, '') || '1'}`
        const promoYear = colMap.promotion_year >= 0 ? parseInt(cols[colMap.promotion_year]) || new Date().getFullYear() : new Date().getFullYear()

        return {
          matricule: cols[colMap.matricule] || '',
          last_name: cols[colMap.last_name] || '',
          first_name: cols[colMap.first_name] || '',
          email: colMap.email >= 0 ? cols[colMap.email] : undefined,
          des_level: normalizedLevel,
          promotion_year: promoYear,
          university: colMap.university >= 0 ? cols[colMap.university] : undefined,
          specialty: colMap.specialty >= 0 ? cols[colMap.specialty] : undefined,
        }
      }).filter(e => e.matricule && e.last_name && e.first_name)

      if (entries.length === 0) {
        setImportResult({ error: t('admin.noValidEntries') })
        setImportLoading(false)
        return
      }

      const result = await importDesRegistryBatch(entries)
      setImportResult({ imported: result.imported, errors: result.errors })
    } catch {
      setImportResult({ error: t('admin.fileReadError') })
    }
    setImportLoading(false)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const tabs = [
    { key: 'registry' as const, label: `${t('admin.registryTab')} (${registryCount})`, icon: BookCheck },
    { key: 'users' as const, label: `${t('admin.usersTab')} (${usersCount})`, icon: Users },
    { key: 'supervisors' as const, label: `${t('admin.supervisorsTab')} (${supervisorsCount})`, icon: Stethoscope },
    { key: 'seats' as const, label: `${t('admin.seatsTab')} (${institutionalSeats.length})`, icon: Building2 },
    { key: 'adhesions' as const, label: `Adhésions (${adhesions.filter(a => a.status === 'pending').length})`, icon: ClipboardList },
    { key: 'config' as const, label: t('admin.configTab'), icon: Settings2 },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); setSearch('') }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === tb.key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <tb.icon className="h-4 w-4" /> {tb.label}
          </button>
        ))}
      </div>

      {/* Barre de recherche + Export */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.search')}
            className="w-full rounded-lg border border-input py-2 pl-9 pr-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        <button
          onClick={() => handleExport(tab === 'registry' ? 'registry' : tab === 'users' ? 'students' : 'supervisors')}
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Download className="h-4 w-4" /> Excel
        </button>
        {tab === 'registry' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleCsvImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className="flex items-center gap-1 rounded-lg bg-muted-foreground px-3 py-2 text-sm font-medium text-white hover:bg-muted-foreground disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> {importLoading ? 'Import...' : 'CSV'}
            </button>
            <button
              onClick={() => { setShowAddStudent(!showAddStudent); setStudentResult(null) }}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" /> {t('admin.add')}
            </button>
          </>
        )}
        {tab === 'supervisors' && (
          <button
            onClick={() => setShowAddSupervisor(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t('admin.add')}
          </button>
        )}
      </div>

      {/* Modal Ajout Superviseur */}
      {showAddSupervisor && (
        <div className="mb-4 rounded-xl bg-card p-4 border border-border/60 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t('admin.newSupervisor')}</h3>
            <button onClick={() => { setShowAddSupervisor(false); setAddResult(null) }} className="text-muted-foreground hover:text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {addResult?.error && (
            <div className="mb-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{t(addResult.error)}</div>
          )}
          {addResult?.success && (
            <div className="mb-3 rounded-lg bg-accent/10 p-3 text-sm text-accent">
              <p className="font-medium">{t('admin.supervisorCreated')}</p>
              <p className="mt-1">{t('admin.tempPassword')} : <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-xs">{addResult.tempPassword}</code></p>
              <p className="mt-1 text-xs">{t('admin.tempPasswordHint')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.titleLabel')}</label>
              <select
                value={addForm.title}
                onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {(Object.entries(SUPERVISOR_TITLE_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v} ({k})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.hospital')}</label>
              <select
                value={addForm.hospital_id}
                onChange={e => setAddForm(p => ({ ...p, hospital_id: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">{t('common.select')}</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.lastName')}</label>
              <input
                value={addForm.last_name}
                onChange={e => setAddForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.firstName')}</label>
              <input
                value={addForm.first_name}
                onChange={e => setAddForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.email')}</label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.phone')}</label>
              <input
                value={addForm.phone}
                onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddSupervisor}
            disabled={addLoading || !addForm.email || !addForm.last_name || !addForm.first_name || !addForm.hospital_id}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {addLoading ? t('admin.creating') : t('admin.createSupervisor')}
          </button>
        </div>
      )}

      {/* Résultat import CSV */}
      {tab === 'registry' && importResult && (
        <div className={`mb-3 rounded-xl p-3 text-sm ${
          importResult.error ? 'bg-destructive/10 text-destructive' :
          (importResult.errors?.length ?? 0) > 0 ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20' : 'bg-accent/10 text-accent'
        }`}>
          <div className="flex items-start gap-2">
            {importResult.error ? (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            ) : (
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
            )}
            <div>
              {importResult.error ? (
                <p>{importResult.error}</p>
              ) : (
                <>
                  <p className="font-medium">{t('admin.imported', { count: importResult.imported ?? 0 })}</p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-amber-400">{t('admin.importErrors', { count: importResult.errors.length })}</summary>
                      <ul className="mt-1 list-disc pl-4 text-xs">
                        {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="ml-auto text-muted-foreground hover:text-muted-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
          {!importResult.error && (
            <p className="mt-1 text-xs text-muted-foreground">{t('admin.reloadToSee')}</p>
          )}
        </div>
      )}

      {/* Formulaire ajout manuel étudiant */}
      {tab === 'registry' && showAddStudent && (
        <div className="mb-4 rounded-xl bg-card p-4 border border-border/60 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t('admin.addStudent')}</h3>
            <button onClick={() => { setShowAddStudent(false); setStudentResult(null) }} className="text-muted-foreground hover:text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {studentResult?.error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {t(studentResult.error)}
            </div>
          )}
          {studentResult?.success && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-accent/10 p-2 text-sm text-accent">
              <CheckCircle className="h-4 w-4" /> {t('admin.studentAdded')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.matricule')} *</label>
              <input
                value={studentForm.matricule}
                onChange={e => setStudentForm(p => ({ ...p, matricule: e.target.value }))}
                placeholder="Ex: DES-2024-001"
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.desLevel')} *</label>
              <select
                value={studentForm.des_level}
                onChange={e => setStudentForm(p => ({ ...p, des_level: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {(['DES1', 'DES2', 'DES3', 'DES4', 'DES5'] as DesLevel[]).map(k => (
                  <option key={k} value={k}>{t(`des.${k}`)} ({k})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.lastName')} *</label>
              <input
                value={studentForm.last_name}
                onChange={e => setStudentForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.firstName')} *</label>
              <input
                value={studentForm.first_name}
                onChange={e => setStudentForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.email')}</label>
              <input
                type="email"
                value={studentForm.email}
                onChange={e => setStudentForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.promotion')}</label>
              <input
                type="number"
                value={studentForm.promotion_year}
                onChange={e => setStudentForm(p => ({ ...p, promotion_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.university')}</label>
              <input
                value={studentForm.university}
                onChange={e => setStudentForm(p => ({ ...p, university: e.target.value }))}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('admin.specialty')}</label>
              <input
                value={studentForm.specialty}
                onChange={e => setStudentForm(p => ({ ...p, specialty: e.target.value }))}
                placeholder="Ex: Chirurgie Générale"
                className="w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddStudent}
            disabled={studentLoading || !studentForm.matricule || !studentForm.last_name || !studentForm.first_name}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {studentLoading ? t('admin.adding') : t('admin.addStudentBtn')}
          </button>

          {/* Aide format CSV */}
          <div className="mt-3 rounded-lg bg-secondary/50 p-2 text-[10px] text-muted-foreground">
            <p className="font-medium text-muted-foreground">{t('admin.csvFormat')}</p>
            <code className="block mt-1">matricule;nom;prenom;email;niveau;promo;universite;specialite</code>
            <p className="mt-0.5">{t('admin.csvSeparators')}</p>
          </div>
        </div>
      )}

      {/* Registre DES */}
      {tab === 'registry' && (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-secondary/50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.matricule')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Réf. interne</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.lastName')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.firstName')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.level')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.promo')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRegistry.map((entry) => (
                <tr key={entry.id} className="hover:bg-secondary/50">
                  <td className="px-3 py-2 font-mono text-xs font-medium">{entry.matricule}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{(entry as DesRegistry & { matricule_long?: string }).matricule_long || '—'}</td>
                  <td className="px-3 py-2 font-medium">{entry.last_name}</td>
                  <td className="px-3 py-2">{entry.first_name}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t(`des.${entry.des_level}`)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{entry.promotion_year}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.is_active ? 'bg-accent/10 text-accent' : 'bg-destructive/15 text-destructive'
                    }`}>
                      {entry.is_active ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRegistry.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">{t('admin.noResults')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Utilisateurs */}
      {tab === 'users' && roleResult && (
        <div className={`mb-2 flex items-center gap-2 rounded-lg p-2 text-sm ${
          roleResult.success ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
        }`}>
          {roleResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {roleResult.success ? t('admin.roleUpdated') : t(roleResult.error!)}
        </div>
      )}
      {tab === 'users' && deleteResult && (
        <div className={`mb-2 flex items-center gap-2 rounded-lg p-2 text-sm ${
          deleteResult.success ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
        }`}>
          {deleteResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {deleteResult.success
            ? t('admin.deleteSuccess')
            : (deleteResult.error?.startsWith('admin.error.deleteBlocked::')
                ? `${t('admin.error.deleteBlocked')} ${deleteResult.error.split('::')[1]}`
                : (deleteResult.error?.startsWith('admin.') || deleteResult.error?.startsWith('error.')
                    ? t(deleteResult.error)
                    : (deleteResult.error ?? '')))}
        </div>
      )}
      {tab === 'users' && (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-secondary/50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.lastName')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.email')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.role')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.level')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.hospital')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-secondary/50">
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 inline-block rounded-full flex-shrink-0 ${u.is_active ? 'bg-accent/100' : 'bg-destructive/100'}`} />
                      {u.last_name} {u.first_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2">
                    {editingRoleId === u.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value)}
                          className="rounded border border-input px-1 py-0.5 text-[10px]"
                        >
                          {(['student', 'supervisor', 'admin', 'superadmin'] as UserRole[])
                            .filter(r => currentUserRole === 'developer' || r !== 'superadmin')
                            .map(r => (
                              <option key={r} value={r}>{t(`userRole.${r}`)}</option>
                            ))}
                          {currentUserRole === 'developer' && (
                            <option value="developer">{t('userRole.developer')}</option>
                          )}
                        </select>
                        <button
                          onClick={() => handleRoleChange(u.id)}
                          disabled={roleLoading}
                          className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-white"
                        >
                          {roleLoading ? t('admin.saving') : t('admin.confirm')}
                        </button>
                        <button onClick={() => setEditingRoleId(null)} className="text-xs text-muted-foreground">{t('admin.cancel')}</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (canManageRoles && u.role !== 'developer') {
                            setEditingRoleId(u.id)
                            setSelectedRole(u.role)
                          }
                        }}
                        disabled={!canManageRoles || u.role === 'developer'}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === 'developer' ? 'bg-primary/10 text-primary' :
                          u.role === 'superadmin' ? 'bg-destructive/15 text-destructive' :
                          u.role === 'admin' ? 'bg-purple-500/15 text-purple-400' :
                          u.role === 'supervisor' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-primary/10 text-primary'
                        } ${canManageRoles && u.role !== 'developer' ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary/30' : ''}`}
                        title={canManageRoles && u.role !== 'developer' ? t('admin.changeRole') : ''}
                      >
                        {u.role === 'developer' ? '🔒 ' : ''}{t(`userRole.${u.role}`)}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{u.des_level || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.hospital?.name || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportUserStats(u.id)}
                        className="rounded bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary"
                        title={t('admin.exportStats')}
                      >
                        <Download className="inline h-3 w-3 mr-0.5" />
                        {t('admin.exportStats')}
                      </button>
                      {canDeleteUsers && u.role !== 'developer' && (
                        <button
                          onClick={() => setDeleteTarget({
                            id: u.id,
                            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.id,
                            email: u.email || '',
                          })}
                          className="rounded bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20"
                          title={t('admin.confirmDelete.title')}
                        >
                          <Trash2 className="inline h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">{t('admin.noResults')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Superviseurs */}
      {tab === 'supervisors' && (
        <div className="overflow-x-auto rounded-xl bg-card shadow-sm border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-secondary/50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.titleLabel')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.lastName')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.email')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.hospital')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.phone')}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('admin.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSupervisors.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/50">
                  <td className="px-3 py-2">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="rounded border border-input px-1 py-0.5 text-xs"
                        >
                          {(Object.keys(SUPERVISOR_TITLE_LABELS) as SupervisorTitle[]).map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                        <button onClick={() => handleUpdateTitle(s.id)} className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-white">OK</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">x</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(s.id); setEditTitle(s.title || 'Dr') }}
                        className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-500/25"
                      >
                        {s.title || '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{s.last_name} {s.first_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.email}</td>
                  <td className="px-3 py-2 text-xs">{s.hospital?.name || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.phone || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`h-2 w-2 inline-block rounded-full ${s.is_active ? 'bg-accent/100' : 'bg-destructive/100'}`} />
                  </td>
                </tr>
              ))}
              {filteredSupervisors.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">{t('admin.noResults')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sièges institutionnels */}
      {tab === 'seats' && (
        <SeatsTab initialSeats={institutionalSeats as Parameters<typeof SeatsTab>[0]['initialSeats']} />
      )}

      {/* Adhésions */}
      {tab === 'adhesions' && (
        <div className="space-y-3">
          {adhesions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune demande d&apos;adhésion</p>
          ) : (
            adhesions.map(req => (
              <div key={req.id} className={`rounded-lg border p-4 ${req.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : req.status === 'approved' ? 'border-accent/30 bg-accent/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{req.last_name} {req.first_name}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{req.des_level}</span>
                      {req.status === 'pending' && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">En attente</span>}
                      {req.status === 'approved' && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Approuvée</span>}
                      {req.status === 'rejected' && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">Rejetée</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{req.email}</p>
                    {req.phone && <p className="text-sm text-muted-foreground">{req.phone}</p>}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {req.hospital_other && <span>Hôpital : {req.hospital_other}</span>}
                      {req.hospital_id && !req.hospital_other && <span>Hôpital : {hospitals.find(h => h.id === req.hospital_id)?.name || req.hospital_id}</span>}
                      {req.promotion_year && <span>Promo {req.promotion_year}</span>}
                      <span>{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {req.motivation && <p className="mt-2 text-xs text-muted-foreground italic">&quot;{req.motivation}&quot;</p>}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setAdhesionLoading(req.id)
                          const res = await fetch('/api/adhesion/review', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: req.id, action: 'approve' }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            setAdhesions(prev => prev.map(a => a.id === req.id ? { ...a, status: 'approved' } : a))
                          }
                          setAdhesionLoading(null)
                        }}
                        disabled={adhesionLoading === req.id}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                      >
                        {adhesionLoading === req.id ? '...' : 'Approuver'}
                      </button>
                      <button
                        onClick={async () => {
                          setAdhesionLoading(req.id)
                          const res = await fetch('/api/adhesion/review', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: req.id, action: 'reject' }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            setAdhesions(prev => prev.map(a => a.id === req.id ? { ...a, status: 'rejected' } : a))
                          }
                          setAdhesionLoading(null)
                        }}
                        disabled={adhesionLoading === req.id}
                        className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Configuration */}
      {tab === 'config' && (
        <ConfigTab
          hospitals={hospitals}
          specialties={specialties}
          procedures={procedures}
          desObjectives={desObjectives}
          currentUserRole={currentUserRole}
        />
      )}

      {/* Modal de confirmation suppression utilisateur */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border/60">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  {t('admin.confirmDelete.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('admin.confirmDelete.message')}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {deleteTarget.name}
                  {deleteTarget.email && (
                    <span className="ml-1 text-xs text-muted-foreground">({deleteTarget.email})</span>
                  )}
                </p>
              </div>
            </div>
            {deleteResult?.error && (
              <div className="mb-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                {deleteResult.error.startsWith('admin.error.deleteBlocked::')
                  ? `${t('admin.error.deleteBlocked')} ${deleteResult.error.split('::')[1]}`
                  : (deleteResult.error.startsWith('admin.') || deleteResult.error.startsWith('error.')
                      ? t(deleteResult.error)
                      : deleteResult.error)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteResult(null) }}
                disabled={deleteLoading}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
              >
                {t('admin.confirmDelete.cancel')}
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteLoading ? t('admin.saving') : t('admin.confirmDelete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
