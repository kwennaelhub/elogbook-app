'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  Plus, X, AlertCircle, CheckCircle, Layers, Crown, Trash2,
  EyeOff, Eye,
} from 'lucide-react'
import type { Hospital, HospitalServiceWithDetails } from '@/types/database'
import {
  getHospitalServices,
  createHospitalService,
  updateHospitalService,
  deactivateHospitalService,
  assignServiceChief,
  getServiceChiefCandidates,
} from '@/lib/actions/admin'

interface ServicesTabProps {
  hospitals: Hospital[]
  /** hospital_id du profil courant — présélectionné si l'utilisateur est rattaché à un hôpital. */
  defaultHospitalId?: string | null
  /** Si true, verrouille le sélecteur sur defaultHospitalId (institution_admin) */
  lockToHospital?: boolean
}

interface ChiefCandidate {
  id: string
  first_name: string
  last_name: string
  title: string | null
  email: string
  role: string
}

export function ServicesTab({ hospitals, defaultHospitalId, lockToHospital = false }: ServicesTabProps) {
  const activeHospitals = useMemo(
    () => hospitals.filter(h => h.is_active),
    [hospitals],
  )

  const [hospitalId, setHospitalId] = useState<string>(
    defaultHospitalId ?? activeHospitals[0]?.id ?? '',
  )
  const [services, setServices] = useState<HospitalServiceWithDetails[]>([])
  const [candidates, setCandidates] = useState<ChiefCandidate[]>([])
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // UI modals
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newChief, setNewChief] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedChief, setSelectedChief] = useState<string>('')

  // Charge services + candidats quand hospitalId change.
  // React 19 : on évite setState synchrone dans le body de useEffect —
  // tout le setState passe par l'async callback (non synchrone donc conforme).
  useEffect(() => {
    if (!hospitalId) return
    let cancelled = false

    const load = async () => {
      const [svcRes, candRes] = await Promise.all([
        getHospitalServices(hospitalId),
        getServiceChiefCandidates(hospitalId),
      ])
      if (cancelled) return
      if (svcRes.data) setServices(svcRes.data)
      else if (svcRes.error) setFlash({ kind: 'err', msg: svcRes.error })
      if ('data' in candRes && Array.isArray(candRes.data)) {
        setCandidates(candRes.data as ChiefCandidate[])
      }
    }

    load()
    return () => { cancelled = true }
  }, [hospitalId])

  const reloadServices = () => {
    startTransition(async () => {
      const res = await getHospitalServices(hospitalId)
      if (res.data) setServices(res.data)
    })
  }

  // État de chargement synthétique : dérivé de isPending et du fait que
  // les services n'ont pas encore été chargés pour l'hôpital courant.
  const loading = isPending

  const autoDismiss = (kind: 'ok' | 'err', msg: string) => {
    setFlash({ kind, msg })
    setTimeout(() => setFlash(null), 3500)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await createHospitalService({
      hospital_id: hospitalId,
      name: newName.trim(),
      chief_id: newChief || null,
    })
    setCreating(false)
    if (res.error) {
      autoDismiss('err', formatError(res.error))
      return
    }
    setNewName('')
    setNewChief('')
    setShowCreate(false)
    autoDismiss('ok', 'Service créé.')
    reloadServices()
  }

  const handleRename = async (serviceId: string) => {
    if (!editName.trim()) return
    const res = await updateHospitalService(serviceId, { name: editName.trim() })
    if (res.error) {
      autoDismiss('err', formatError(res.error))
      return
    }
    setEditingId(null)
    autoDismiss('ok', 'Nom mis à jour.')
    reloadServices()
  }

  const handleToggleActive = async (service: HospitalServiceWithDetails) => {
    if (service.is_active) {
      const res = await deactivateHospitalService(service.id)
      if (res.error) return autoDismiss('err', formatError(res.error))
      autoDismiss('ok', 'Service désactivé.')
    } else {
      const res = await updateHospitalService(service.id, { is_active: true })
      if (res.error) return autoDismiss('err', formatError(res.error))
      autoDismiss('ok', 'Service réactivé.')
    }
    reloadServices()
  }

  const handleAssignChief = async (serviceId: string) => {
    const res = await assignServiceChief(serviceId, selectedChief || null)
    if (res.error) return autoDismiss('err', formatError(res.error))
    setAssigningId(null)
    setSelectedChief('')
    autoDismiss('ok', selectedChief ? 'Chef assigné.' : 'Chef retiré.')
    reloadServices()
  }

  const activeServicesCount = services.filter(s => s.is_active).length

  return (
    <div>
      {/* Flash */}
      {flash && (
        <div
          className={`mb-3 flex items-center gap-2 rounded-lg p-2 text-sm ${
            flash.kind === 'ok'
              ? 'bg-accent/10 text-accent'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {flash.kind === 'ok' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="flex-1">{flash.msg}</span>
          <button onClick={() => setFlash(null)} className="text-xs opacity-70">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Barre hôpital + bouton ajout */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Hôpital :</label>
        <select
          value={hospitalId}
          onChange={e => setHospitalId(e.target.value)}
          disabled={lockToHospital}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-70"
        >
          {activeHospitals.map(h => (
            <option key={h.id} value={h.id}>{h.name} — {h.city}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {activeServicesCount} service{activeServicesCount > 1 ? 's' : ''} actif{activeServicesCount > 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!hospitalId}
          className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nouveau service
        </button>
      </div>

      {/* Modal création */}
      {showCreate && (
        <div className="mb-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Nouveau service</h3>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom du service *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex. Chirurgie viscérale"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Chef de service (optionnel)</label>
              <select
                value={newChief}
                onChange={e => setNewChief(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">— Aucun pour l&apos;instant —</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title ? `${c.title} ` : ''}{c.last_name} {c.first_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Création…' : 'Créer le service'}
          </button>
        </div>
      )}

      {/* Tableau des services */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 bg-secondary/50">
            <tr>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Service</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Chef</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">DES</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Superviseurs</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Statut</th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && services.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucun service pour cet hôpital. Créez-en un avec le bouton ci-dessus.
                </td>
              </tr>
            )}
            {!loading && services.map(s => (
              <tr key={s.id} className="hover:bg-secondary/50">
                <td className="px-3 py-2">
                  {editingId === s.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="rounded border border-input bg-background px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleRename(s.id)}
                        className="rounded bg-primary px-2 py-1 text-xs text-white"
                      >
                        OK
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">
                        annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                      className="flex items-center gap-1.5 font-medium text-foreground hover:underline"
                    >
                      <Layers className="h-3.5 w-3.5 text-primary" /> {s.name}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2">
                  {assigningId === s.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedChief}
                        onChange={e => setSelectedChief(e.target.value)}
                        className="rounded border border-input bg-background px-1.5 py-1 text-xs"
                      >
                        <option value="">— Retirer —</option>
                        {candidates.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title ? `${c.title} ` : ''}{c.last_name} {c.first_name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignChief(s.id)}
                        className="rounded bg-primary px-2 py-1 text-xs text-white"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => { setAssigningId(null); setSelectedChief('') }}
                        className="text-xs text-muted-foreground"
                      >
                        annuler
                      </button>
                    </div>
                  ) : s.chief ? (
                    <button
                      onClick={() => { setAssigningId(s.id); setSelectedChief(s.chief!.id) }}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 hover:bg-amber-500/15"
                    >
                      <Crown className="h-3 w-3" />
                      {s.chief.title ? `${s.chief.title} ` : ''}{s.chief.last_name}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setAssigningId(s.id); setSelectedChief('') }}
                      className="text-xs text-muted-foreground hover:text-foreground italic"
                    >
                      — Aucun — <span className="underline">Assigner</span>
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {s.des_count ?? 0}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {s.supervisor_count ?? 0}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.is_active
                        ? 'bg-accent/10 text-accent'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.is_active ? 'Actif' : 'Archivé'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="rounded bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary/80"
                      title={s.is_active ? 'Désactiver' : 'Réactiver'}
                    >
                      {s.is_active ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    {!s.is_active && (s.des_count ?? 0) === 0 && (s.supervisor_count ?? 0) === 0 && (
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="rounded bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20"
                        title="Suppression définitive (à venir)"
                        disabled
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Aide forfait */}
      <p className="mt-3 text-xs text-muted-foreground">
        <strong>Forfaits institutionnels :</strong> Starter (3 services) · Pro (6 services) · Enterprise (illimité).
        La limite est appliquée automatiquement côté serveur.
      </p>
    </div>
  )
}

function formatError(code: string): string {
  if (code.startsWith('error.plan_limit_reached:')) {
    const [, tier, limit] = code.split(':')
    return `Limite du forfait ${tier} atteinte (${limit} services). Passez au forfait supérieur pour en créer davantage.`
  }
  const map: Record<string, string> = {
    'error.forbidden': 'Action non autorisée.',
    'error.forbidden_hospital_scope': 'Vous ne pouvez agir que sur votre propre hôpital.',
    'error.forbidden_service_scope': 'Vous ne pouvez agir que sur votre propre service.',
    'error.service_not_found': 'Service introuvable.',
    'error.user_not_found': 'Utilisateur introuvable.',
    'error.user_not_in_hospital': 'Cet utilisateur n\'est pas rattaché au même hôpital.',
    'error.unauthorized': 'Connexion requise.',
  }
  return map[code] ?? code
}
