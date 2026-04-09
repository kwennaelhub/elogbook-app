'use client'

import { useState, useRef } from 'react'
import { Users, BookCheck, Upload, Stethoscope, Search, Download, Plus, X, FileSpreadsheet, UserPlus, AlertCircle, CheckCircle, Settings2, Shield, Building2 } from 'lucide-react'
import type { DesRegistry, Profile, Hospital, DesLevel } from '@/types/database'
import { DES_LEVEL_LABELS, SUPERVISOR_TITLE_LABELS, ROLE_LABELS } from '@/types/database'
import type { SupervisorTitle, UserRole } from '@/types/database'
import { createSupervisor, updateSupervisor, addDesRegistryEntry, importDesRegistryBatch } from '@/lib/actions/data'
import { updateUserRole } from '@/lib/actions/admin'
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
  currentUserRole: string
}

export function AdminPanel({
  registryEntries, registryCount,
  users, usersCount,
  supervisors, supervisorsCount,
  hospitals, specialties, procedures, desObjectives,
  institutionalSeats,
  currentUserRole,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'registry' | 'users' | 'supervisors' | 'seats' | 'config'>('registry')
  const [search, setSearch] = useState('')
  // Gestion des rôles (Users tab)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleResult, setRoleResult] = useState<{ error?: string; success?: boolean } | null>(null)

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
        setImportResult({ error: 'Le fichier est vide ou ne contient que l\'en-tête.' })
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
        setImportResult({ error: 'Aucune entrée valide trouvée dans le fichier.' })
        setImportLoading(false)
        return
      }

      const result = await importDesRegistryBatch(entries)
      setImportResult({ imported: result.imported, errors: result.errors })
    } catch {
      setImportResult({ error: 'Erreur lors de la lecture du fichier.' })
    }
    setImportLoading(false)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const tabs = [
    { key: 'registry' as const, label: `Registre DES (${registryCount})`, icon: BookCheck },
    { key: 'users' as const, label: `Utilisateurs (${usersCount})`, icon: Users },
    { key: 'supervisors' as const, label: `Superviseurs (${supervisorsCount})`, icon: Stethoscope },
    { key: 'seats' as const, label: `Sièges (${institutionalSeats.length})`, icon: Building2 },
    { key: 'config' as const, label: 'Configuration', icon: Settings2 },
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
              tab === t.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
        <button
          onClick={() => handleExport(tab === 'registry' ? 'registry' : tab === 'users' ? 'students' : 'supervisors')}
          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
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
              className="flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> {importLoading ? 'Import...' : 'CSV'}
            </button>
            <button
              onClick={() => { setShowAddStudent(!showAddStudent); setStudentResult(null) }}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <UserPlus className="h-4 w-4" /> Ajouter
            </button>
          </>
        )}
        {tab === 'supervisors' && (
          <button
            onClick={() => setShowAddSupervisor(true)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Prénom</label>
              <input
                value={addForm.first_name}
                onChange={e => setAddForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Téléphone</label>
              <input
                value={addForm.phone}
                onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddSupervisor}
            disabled={addLoading || !addForm.email || !addForm.last_name || !addForm.first_name || !addForm.hospital_id}
            className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {addLoading ? 'Création...' : 'Créer le superviseur'}
          </button>
        </div>
      )}

      {/* Résultat import CSV */}
      {tab === 'registry' && importResult && (
        <div className={`mb-3 rounded-xl p-3 text-sm ${
          importResult.error ? 'bg-red-50 text-red-700' :
          (importResult.errors?.length ?? 0) > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'
        }`}>
          <div className="flex items-start gap-2">
            {importResult.error ? (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            ) : (
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            )}
            <div>
              {importResult.error ? (
                <p>{importResult.error}</p>
              ) : (
                <>
                  <p className="font-medium">{importResult.imported} étudiant(s) importé(s) avec succès</p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-amber-600">{importResult.errors.length} erreur(s)</summary>
                      <ul className="mt-1 list-disc pl-4 text-xs">
                        {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          </div>
          {!importResult.error && (
            <p className="mt-1 text-xs text-slate-500">Rechargez la page pour voir les nouvelles entrées.</p>
          )}
        </div>
      )}

      {/* Formulaire ajout manuel étudiant */}
      {tab === 'registry' && showAddStudent && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Ajouter un étudiant au registre</h3>
            <button onClick={() => { setShowAddStudent(false); setStudentResult(null) }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {studentResult?.error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {studentResult.error}
            </div>
          )}
          {studentResult?.success && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" /> Étudiant ajouté avec succès ! Rechargez pour voir.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Matricule *</label>
              <input
                value={studentForm.matricule}
                onChange={e => setStudentForm(p => ({ ...p, matricule: e.target.value }))}
                placeholder="Ex: DES-2024-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Niveau DES *</label>
              <select
                value={studentForm.des_level}
                onChange={e => setStudentForm(p => ({ ...p, des_level: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {(Object.entries(DES_LEVEL_LABELS) as [DesLevel, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v} ({k})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nom *</label>
              <input
                value={studentForm.last_name}
                onChange={e => setStudentForm(p => ({ ...p, last_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Prénom *</label>
              <input
                value={studentForm.first_name}
                onChange={e => setStudentForm(p => ({ ...p, first_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={studentForm.email}
                onChange={e => setStudentForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Promotion</label>
              <input
                type="number"
                value={studentForm.promotion_year}
                onChange={e => setStudentForm(p => ({ ...p, promotion_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Université</label>
              <input
                value={studentForm.university}
                onChange={e => setStudentForm(p => ({ ...p, university: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Spécialité</label>
              <input
                value={studentForm.specialty}
                onChange={e => setStudentForm(p => ({ ...p, specialty: e.target.value }))}
                placeholder="Ex: Chirurgie Générale"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAddStudent}
            disabled={studentLoading || !studentForm.matricule || !studentForm.last_name || !studentForm.first_name}
            className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {studentLoading ? 'Ajout en cours...' : 'Ajouter l\'étudiant'}
          </button>

          {/* Aide format CSV */}
          <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">
            <p className="font-medium text-slate-600">Format CSV attendu :</p>
            <code className="block mt-1">matricule;nom;prenom;email;niveau;promo;universite;specialite</code>
            <p className="mt-0.5">Séparateurs acceptés : <code>;</code> <code>,</code> <code>tab</code> — Colonnes obligatoires : matricule, nom, prénom</p>
          </div>
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
      {tab === 'users' && roleResult && (
        <div className={`mb-2 flex items-center gap-2 rounded-lg p-2 text-sm ${
          roleResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {roleResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {roleResult.success ? 'Rôle mis à jour. Rechargez pour voir.' : roleResult.error}
        </div>
      )}
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
                <th className="px-3 py-2 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 inline-block rounded-full flex-shrink-0 ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {u.last_name} {u.first_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{u.email}</td>
                  <td className="px-3 py-2">
                    {editingRoleId === u.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value)}
                          className="rounded border border-slate-300 px-1 py-0.5 text-[10px]"
                        >
                          {(['student', 'supervisor', 'admin', 'superadmin'] as UserRole[])
                            .filter(r => currentUserRole === 'developer' || r !== 'superadmin')
                            .map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          {currentUserRole === 'developer' && (
                            <option value="developer">{ROLE_LABELS.developer}</option>
                          )}
                        </select>
                        <button
                          onClick={() => handleRoleChange(u.id)}
                          disabled={roleLoading}
                          className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white"
                        >
                          OK
                        </button>
                        <button onClick={() => setEditingRoleId(null)} className="text-xs text-slate-400">✕</button>
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
                          u.role === 'developer' ? 'bg-emerald-100 text-emerald-800' :
                          u.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'supervisor' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        } ${canManageRoles && u.role !== 'developer' ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-slate-300' : ''}`}
                        title={canManageRoles && u.role !== 'developer' ? 'Cliquer pour modifier le rôle' : u.role === 'developer' ? 'Rôle irrevocable' : ''}
                      >
                        {u.role === 'developer' ? '🔒 ' : ''}{ROLE_LABELS[u.role as UserRole] || u.role}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{u.des_level || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{u.hospital?.name || '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleExportUserStats(u.id)}
                      className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
                      title="Exporter la fiche récapitulative"
                    >
                      <Download className="inline h-3 w-3 mr-0.5" />
                      Fiche
                    </button>
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
                        <button onClick={() => handleUpdateTitle(s.id)} className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">OK</button>
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

      {/* Sièges institutionnels */}
      {tab === 'seats' && (
        <SeatsTab initialSeats={institutionalSeats as Parameters<typeof SeatsTab>[0]['initialSeats']} />
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
    </div>
  )
}
