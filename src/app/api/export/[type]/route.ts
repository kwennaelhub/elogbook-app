import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { OPERATOR_ROLE_LABELS, DES_LEVEL_LABELS, GARDE_TYPE_LABELS, SUPERVISOR_TITLE_LABELS } from '@/types/database'
import type { OperatorRole, DesLevel, GardeType, SupervisorTitle } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''

  // Auth + admin check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'error.unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    return Response.json({ error: 'error.forbidden' }, { status: 403 })
  }

  let data: Record<string, unknown>[] = []
  let sheetName = 'Export'

  switch (type) {
    case 'entries': {
      sheetName = 'Interventions'
      const { data: entries } = await supabase
        .from('entries')
        .select(`
          *,
          hospital:hospitals(name),
          specialty:specialties!entries_specialty_id_fkey(name),
          procedure:procedures(name),
          supervisor:profiles!entries_supervisor_id_fkey(first_name, last_name)
        `)
        .order('intervention_date', { ascending: false })
        .limit(5000)

      data = (entries ?? []).map(e => ({
        'Date': e.intervention_date,
        'Mode': e.entry_mode === 'prospective' ? 'Prospectif' : 'Rétrospectif',
        'Contexte': e.context === 'programmed' ? 'Programmé' : 'Urgence',
        'Type patient': e.patient_type === 'real' ? 'Réel' : 'Simulation',
        'Rôle': OPERATOR_ROLE_LABELS[e.operator_role as OperatorRole] || e.operator_role,
        'Hôpital': (e.hospital as { name: string } | null)?.name || e.other_hospital || '',
        'Spécialité': (e.specialty as { name: string } | null)?.name || e.other_specialty || '',
        'Geste': (e.procedure as { name: string } | null)?.name || e.other_procedure || '',
        'Superviseur': e.supervisor ? `${(e.supervisor as { last_name: string }).last_name} ${(e.supervisor as { first_name: string }).first_name}` : '',
        'Validé': e.is_validated ? 'Oui' : 'Non',
        'Notes': e.notes || '',
      }))
      break
    }

    case 'gardes': {
      sheetName = 'Gardes'
      const { data: gardes } = await supabase
        .from('gardes')
        .select('*, hospital:hospitals(name), user:profiles!gardes_user_id_fkey(first_name, last_name)')
        .order('date', { ascending: false })
        .limit(5000)

      data = (gardes ?? []).map(g => ({
        'Date': g.date,
        'Type': GARDE_TYPE_LABELS[g.type as GardeType] || g.type,
        'Étudiant': g.user ? `${(g.user as { last_name: string }).last_name} ${(g.user as { first_name: string }).first_name}` : '',
        'Hôpital': (g.hospital as { name: string } | null)?.name || '',
        'Service': g.service || '',
        'Senior': g.senior_name || '',
        'Source': g.source === 'admin' ? 'Admin' : 'Étudiant',
        'Notes': g.notes || '',
      }))
      break
    }

    case 'supervisors': {
      sheetName = 'Superviseurs'
      const { data: supervisors } = await supabase
        .from('profiles')
        .select('*, hospital:hospitals(name)')
        .eq('role', 'supervisor')
        .order('last_name')

      data = (supervisors ?? []).map(s => ({
        'Titre': s.title ? (SUPERVISOR_TITLE_LABELS[s.title as SupervisorTitle] || s.title) : '',
        'Nom': s.last_name,
        'Prénom': s.first_name,
        'Email': s.email,
        'Hôpital': (s.hospital as { name: string } | null)?.name || '',
        'Téléphone': s.phone || '',
        'Statut': s.is_active ? 'Actif' : 'Inactif',
      }))
      break
    }

    case 'students': {
      sheetName = 'Utilisateurs'
      const { data: students } = await supabase
        .from('profiles')
        .select('*, hospital:hospitals(name)')
        .order('last_name')
        .limit(5000)

      data = (students ?? []).map(s => ({
        'Nom': s.last_name,
        'Prénom': s.first_name,
        'Email': s.email,
        'Rôle': s.role,
        'Niveau': s.des_level ? DES_LEVEL_LABELS[s.des_level as DesLevel] : '',
        'Matricule': s.matricule || '',
        'Hôpital': (s.hospital as { name: string } | null)?.name || '',
        'Téléphone': s.phone || '',
        'Statut': s.is_active ? 'Actif' : 'Inactif',
      }))
      break
    }

    case 'registry': {
      sheetName = 'Registre DES'
      const { data: registry } = await supabase
        .from('des_registry')
        .select('*')
        .order('last_name')
        .limit(5000)

      data = (registry ?? []).map(r => ({
        'Matricule': r.matricule,
        'Nom': r.last_name,
        'Prénom': r.first_name,
        'Email': r.email || '',
        'Niveau': DES_LEVEL_LABELS[r.des_level as DesLevel] || r.des_level,
        'Promotion': r.promotion_year,
        'Université': r.university,
        'Spécialité': r.specialty || '',
        'Statut': r.is_active ? 'Actif' : 'Inactif',
      }))
      break
    }

    case 'user-stats': {
      // Export fiche récapitulative d'un utilisateur
      const userId = searchParams.get('userId')
      if (!userId) {
        return Response.json({ error: 'userId requis' }, { status: 400 })
      }

      // Profil
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*, hospital:hospitals(name)')
        .eq('id', userId)
        .single()

      if (!targetProfile) {
        return Response.json({ error: 'error.userNotFound' }, { status: 404 })
      }

      // Entrées
      const { data: userEntries } = await supabase
        .from('entries')
        .select(`
          *,
          hospital:hospitals!entries_hospital_id_fkey(name),
          specialty:specialties!entries_specialty_id_fkey(name),
          procedure:procedures!entries_procedure_id_fkey(name),
          supervisor:profiles!entries_supervisor_id_fkey(first_name, last_name, title)
        `)
        .eq('user_id', userId)
        .order('intervention_date', { ascending: false })
        .limit(5000)

      // Gardes
      const { data: userGardes } = await supabase
        .from('gardes')
        .select('*, hospital:hospitals(name)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5000)

      // Sheet 1 — Profil
      const profileData = [{
        'Nom': targetProfile.last_name,
        'Prénom': targetProfile.first_name,
        'Email': targetProfile.email,
        'Rôle': targetProfile.role,
        'Niveau DES': targetProfile.des_level ? DES_LEVEL_LABELS[targetProfile.des_level as DesLevel] : '',
        'Hôpital': (targetProfile.hospital as { name: string } | null)?.name || '',
        'Matricule': targetProfile.matricule || '',
        'Total interventions': userEntries?.length ?? 0,
        'Total gardes': userGardes?.length ?? 0,
      }]

      // Sheet 2 — Statistiques
      const roleCounts: Record<string, number> = {}
      const hospitalCounts: Record<string, number> = {}
      const specCounts: Record<string, number> = {}
      userEntries?.forEach(e => {
        const role = OPERATOR_ROLE_LABELS[e.operator_role as OperatorRole] || e.operator_role
        roleCounts[role] = (roleCounts[role] || 0) + 1
        const hName = (e.hospital as { name: string } | null)?.name || 'Autre'
        hospitalCounts[hName] = (hospitalCounts[hName] || 0) + 1
        const sName = (e.specialty as { name: string } | null)?.name || 'Autre'
        specCounts[sName] = (specCounts[sName] || 0) + 1
      })

      const statsData = [
        ...Object.entries(roleCounts).map(([k, v]) => ({ 'Catégorie': 'Rôle', 'Élément': k, 'Nombre': v })),
        ...Object.entries(hospitalCounts).map(([k, v]) => ({ 'Catégorie': 'Hôpital', 'Élément': k, 'Nombre': v })),
        ...Object.entries(specCounts).map(([k, v]) => ({ 'Catégorie': 'Spécialité', 'Élément': k, 'Nombre': v })),
      ]

      // Sheet 3 — Interventions
      const entriesData = (userEntries ?? []).map(e => ({
        'Date': e.intervention_date,
        'Contexte': e.context === 'programmed' ? 'Programmé' : 'Urgence',
        'Rôle': OPERATOR_ROLE_LABELS[e.operator_role as OperatorRole] || e.operator_role,
        'Hôpital': (e.hospital as { name: string } | null)?.name || '',
        'Spécialité': (e.specialty as { name: string } | null)?.name || '',
        'Geste': (e.procedure as { name: string } | null)?.name || '',
        'Superviseur': e.supervisor ? `${(e.supervisor as { last_name: string }).last_name} ${(e.supervisor as { first_name: string }).first_name}` : '',
        'Validé': e.is_validated ? 'Oui' : 'Non',
        'Notes': e.notes || '',
      }))

      // Sheet 4 — Gardes
      const gardesData = (userGardes ?? []).map(g => ({
        'Date': g.date,
        'Type': GARDE_TYPE_LABELS[g.type as GardeType] || g.type,
        'Hôpital': (g.hospital as { name: string } | null)?.name || '',
        'Service': g.service || '',
        'Senior': g.senior_name || '',
        'Notes': g.notes || '',
      }))

      // Générer le workbook multi-onglets
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileData), 'Profil')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsData.length > 0 ? statsData : [{ 'Info': 'Aucune donnée' }]), 'Statistiques')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entriesData.length > 0 ? entriesData : [{ 'Info': 'Aucune intervention' }]), 'Interventions')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gardesData.length > 0 ? gardesData : [{ 'Info': 'Aucune garde' }]), 'Gardes')

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const fileName = `fiche_${targetProfile.last_name}_${targetProfile.first_name}_${new Date().toISOString().split('T')[0]}.xlsx`

      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'export_user_stats',
        table_name: 'profiles',
        record_id: userId,
        new_data: { entries: userEntries?.length, gardes: userGardes?.length },
      })

      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.document',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    }

    default:
      return Response.json({ error: 'Type invalide' }, { status: 400 })
  }

  // Filtrage par recherche textuelle
  if (search) {
    const q = search.toLowerCase()
    data = data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    )
  }

  // Génération Excel
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'export',
    table_name: type,
    new_data: { search, count: data.length },
  })

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.document',
      'Content-Disposition': `attachment; filename="${type}_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
