// Types TypeScript — InternLog — Logbook Médical DES
// Générés depuis schema.sql v2 (avril 2026)

// ========== ENUMS ==========

export type UserRole =
  | 'student'
  | 'supervisor'
  | 'service_chief'      // Phase B — chef de service (admin scopé à un service)
  | 'institution_admin'  // Phase B — recteur/directeur (admin scopé à un hôpital)
  | 'admin'
  | 'superadmin'
  | 'developer'

export type InstitutionalPlanTier = 'starter' | 'pro' | 'enterprise'
export type InstitutionalIdType = 'ordre_medical' | 'rccm' | 'agrement' | 'autre'
export type InstitutionRegistrationStatus = 'pending_verification' | 'verified' | 'rejected'
export type DesLevel = 'DES1' | 'DES2' | 'DES3' | 'DES4' | 'DES5'
export type SurgeryContext = 'programmed' | 'emergency'
export type PatientType = 'real' | 'simulation'
export type OperatorRole = 'observer' | 'assistant' | 'supervised_operator' | 'autonomous_operator'
export type GardeType = 'day' | 'night' | '24h' | 'weekend'
export type GardeSource = 'user' | 'admin'
export type EntryMode = 'prospective' | 'retrospective'
export type SubscriptionPlan = 'free' | 'premium' | 'institutional'
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled'

// ========== TABLES ==========

export interface Hospital {
  id: string
  name: string
  city: string
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export interface DesRegistry {
  id: string
  matricule: string
  first_name: string
  last_name: string
  email: string | null
  des_level: DesLevel
  promotion_year: number
  university: string
  specialty: string | null
  is_active: boolean
  added_by: string | null
  created_at: string
  updated_at: string
}

export type SupervisorTitle = 'Pr' | 'Pr Ag' | 'Dr' | 'MC' | 'CC'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  des_level: DesLevel | null
  hospital_id: string | null
  /** Phase B — hôpital de RÉFÉRENCE permanent ; contrôle la suppression/modification du profil. */
  home_hospital_id: string | null
  /** Phase B — service actuel (stage ou poste). Null si pas encore affecté. */
  service_id: string | null
  phone: string | null
  title: string | null // titre académique : Pr, Pr Ag, Dr, MC, CC
  matricule: string | null
  registry_id: string | null
  avatar_url: string | null
  date_of_birth: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ========== PHASE B — MODÈLE INSTITUTIONNEL ==========

export interface HospitalService {
  id: string
  hospital_id: string
  name: string
  chief_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HospitalServiceWithDetails extends HospitalService {
  hospital?: Pick<Hospital, 'id' | 'name' | 'city'>
  chief?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'title' | 'email'> | null
  des_count?: number
  supervisor_count?: number
}

export type HospitalServiceInsert = Pick<HospitalService, 'hospital_id' | 'name'> & {
  chief_id?: string | null
  is_active?: boolean
}

export type HospitalServiceUpdate = Partial<
  Pick<HospitalService, 'name' | 'chief_id' | 'is_active'>
>

export interface StageAssignment {
  id: string
  des_id: string
  hospital_id: string
  service_id: string
  start_date: string
  end_date: string | null
  is_current: boolean
  assigned_by: string | null
  notes: string | null
  created_at: string
}

export interface StageAssignmentWithDetails extends StageAssignment {
  hospital?: Pick<Hospital, 'id' | 'name' | 'city'>
  service?: Pick<HospitalService, 'id' | 'name'>
  des?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'matricule' | 'des_level'>
}

export type StageAssignmentInsert = Pick<
  StageAssignment,
  'des_id' | 'hospital_id' | 'service_id' | 'start_date'
> & {
  end_date?: string | null
  notes?: string | null
}

export interface HospitalSettings {
  id: string
  hospital_id: string
  primary_color: string
  secondary_color: string
  accent_color: string
  plan_tier: InstitutionalPlanTier
  max_services: number
  updated_at: string
  updated_by: string | null
}

export type HospitalSettingsUpdate = Partial<
  Pick<
    HospitalSettings,
    'primary_color' | 'secondary_color' | 'accent_color' | 'plan_tier' | 'max_services'
  >
>

export interface InstitutionRegistration {
  id: string
  hospital_name: string
  city: string
  country: string
  institutional_id: string
  institutional_id_type: InstitutionalIdType
  justificatif_url: string | null
  rector_user_id: string | null
  rector_email: string
  rector_full_name: string
  rector_phone: string | null
  status: InstitutionRegistrationStatus
  rejection_reason: string | null
  verified_by: string | null
  verified_at: string | null
  hospital_id: string | null
  created_at: string
}

export type InstitutionRegistrationInsert = Pick<
  InstitutionRegistration,
  | 'hospital_name'
  | 'city'
  | 'institutional_id'
  | 'institutional_id_type'
  | 'rector_email'
  | 'rector_full_name'
> & {
  country?: string
  justificatif_url?: string | null
  rector_phone?: string | null
  rector_user_id?: string | null
}

// Tarifs indicatifs des forfaits institutionnels (à ajuster commercialement)
export const INSTITUTIONAL_PLAN_LIMITS: Record<InstitutionalPlanTier, number> = {
  starter: 3,
  pro: 6,
  enterprise: 999,
}

export const INSTITUTIONAL_PLAN_LABELS: Record<InstitutionalPlanTier, string> = {
  starter: 'Starter — jusqu\'à 3 services',
  pro: 'Pro — jusqu\'à 6 services',
  enterprise: 'Enterprise — services illimités',
}

export const INSTITUTIONAL_ID_TYPE_LABELS: Record<InstitutionalIdType, string> = {
  ordre_medical: 'Numéro d\'ordre médical',
  rccm: 'RCCM',
  agrement: 'Agrément ministériel',
  autre: 'Autre',
}

export interface Specialty {
  id: string
  name: string
  parent_id: string | null
  level: number // 0=spécialité, 1=segment, 2=sous-segment
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Procedure {
  id: string
  name: string
  specialty_id: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Entry {
  id: string
  user_id: string
  intervention_date: string // DATE
  submitted_at: string // TIMESTAMPTZ (non modifiable)
  entry_mode: EntryMode
  context: SurgeryContext
  patient_type: PatientType
  operator_role: OperatorRole
  hospital_id: string
  /** Phase B — service dans lequel l'intervention a eu lieu. Null si hôpital sans services. */
  service_id: string | null
  other_hospital: string | null
  specialty_id: string | null
  segment_id: string | null
  procedure_id: string | null
  other_specialty: string | null
  other_procedure: string | null
  notes: string | null
  // Géolocalisation
  geo_latitude: number | null
  geo_longitude: number | null
  geo_accuracy: number | null
  geo_captured_at: string | null
  // Attestation rétrospective
  attestation_checked: boolean
  attestation_text: string | null
  attestation_at: string | null
  // Supervision
  supervisor_id: string | null
  is_validated: boolean
  validated_at: string | null
  validated_by: string | null
  created_at: string
  updated_at: string
}

export interface SupervisorAssignment {
  id: string
  supervisor_id: string
  student_id: string
  hospital_id: string
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface Garde {
  id: string
  user_id: string
  date: string
  type: GardeType
  source: GardeSource
  service: string | null
  senior_name: string | null
  senior_id: string | null
  hospital_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CroTemplate {
  id: string
  title: string
  specialty_id: string | null
  content: Record<string, unknown>
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PrescriptionTemplate {
  id: string
  title: string
  specialty_id: string | null
  content: Record<string, unknown>
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PreopTemplate {
  id: string
  title: string
  specialty_id: string | null
  items: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface Instrument {
  id: string
  name: string
  category: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string | null
  institution_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  starts_at: string
  expires_at: string | null
  payment_provider: string | null
  payment_reference: string | null
  amount_fcfa: number | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export type FollowupOutcome = 'en_cours' | 'exeat' | 'decede'
export type FollowupEventType = 'complication' | 'reprise_bloc' | 'note' | 'observation' | 'amelioration'
export type AgeRange = '0-5' | '6-15' | '16-25' | '26-40' | '41-60' | '61-75' | '75+'
export type PatientSex = 'M' | 'F'

export interface PatientFollowup {
  id: string
  user_id: string
  entry_id: string | null
  anonymous_id: string
  intervention_date: string
  discharge_date: string | null
  outcome: FollowupOutcome
  cause_of_death: string | null
  complication_type: string | null // Déprécié — utiliser followup_events
  complication_date: string | null // Déprécié — utiliser followup_events
  age_range: AgeRange | null
  sex: PatientSex | null
  asa_score: number | null
  notes: string | null
  follow_up_days: number | null
  created_at: string
  updated_at: string
}

export interface FollowupEvent {
  id: string
  followup_id: string
  user_id: string
  event_type: FollowupEventType
  event_date: string
  description: string
  created_at: string
}

export interface PatientFollowupWithEntry extends PatientFollowup {
  entry?: Pick<Entry, 'id'> & {
    procedure?: { name: string } | null
    specialty?: { name: string } | null
    hospital?: { name: string } | null
  }
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  category: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

// ========== TYPES FORMULAIRES (INSERT/UPDATE) ==========

export type EntryInsert = Omit<Entry, 'id' | 'submitted_at' | 'entry_mode' | 'is_validated' | 'validated_at' | 'validated_by' | 'created_at' | 'updated_at'>

export type GardeInsert = Omit<Garde, 'id' | 'created_at' | 'updated_at'>

export type ProfileUpdate = Partial<Pick<Profile, 'first_name' | 'last_name' | 'phone' | 'hospital_id' | 'des_level' | 'title' | 'avatar_url' | 'date_of_birth'>>

export type NoteInsert = Omit<Note, 'id' | 'created_at' | 'updated_at'>

// ========== TYPES ENRICHIS (avec jointures) ==========

export interface EntryWithDetails extends Entry {
  hospital?: Hospital
  specialty?: Specialty
  segment?: Specialty
  procedure?: Procedure
  supervisor?: Pick<Profile, 'id' | 'first_name' | 'last_name'>
}

export interface SupervisionEntry extends Entry {
  hospital?: Hospital
  specialty?: Specialty
  segment?: Specialty
  procedure?: Procedure
  supervisor?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'title'>
  student?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'des_level' | 'matricule'>
}

export interface GardeWithDetails extends Garde {
  hospital?: Hospital
  senior?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'title'>
  user?: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'phone' | 'title' | 'des_level'>
}

export interface ProfileWithSubscription extends Profile {
  subscription?: Subscription
  hospital?: Hospital
}

// ========== CONSTANTES ==========

export const ENTRY_MODE_THRESHOLD_HOURS = 48

export const OPERATOR_ROLE_LABELS: Record<OperatorRole, string> = {
  observer: 'Observateur',
  assistant: 'Assistant',
  supervised_operator: 'Opérateur supervisé',
  autonomous_operator: 'Opérateur autonome',
}

export const DES_LEVEL_LABELS: Record<DesLevel, string> = {
  DES1: '1ère année',
  DES2: '2ème année',
  DES3: '3ème année',
  DES4: '4ème année',
  DES5: '5ème année',
}

export const GARDE_TYPE_LABELS: Record<GardeType, string> = {
  day: 'Jour',
  night: 'Nuit',
  '24h': '24h',
  weekend: 'Week-end',
}

export const SUPERVISOR_TITLE_LABELS: Record<SupervisorTitle, string> = {
  'Pr': 'Professeur',
  'Pr Ag': 'Professeur Agrégé',
  'Dr': 'Docteur',
  'MC': 'Maître de Conférences',
  'CC': 'Chef de Clinique',
}

// Hiérarchie des rôles (Phase B) :
// developer > superadmin > admin (legacy) > institution_admin > service_chief > supervisor > student
// Les rôles service_chief et institution_admin sont scopés (hôpital/service) —
// ils ont moins de puissance globale que admin mais pleine autorité sur leur périmètre.
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  supervisor: 1,
  service_chief: 2,
  institution_admin: 3,
  admin: 4,
  superadmin: 5,
  developer: 6,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Étudiant',
  supervisor: 'Superviseur',
  service_chief: 'Chef de service',
  institution_admin: 'Recteur / Directeur',
  admin: 'Administrateur',
  superadmin: 'Super Admin',
  developer: 'Développeur',
}

// Rôles ayant un pouvoir administratif (à ≥1 niveau — global ou scopé)
export const ADMIN_ROLES: UserRole[] = [
  'service_chief',
  'institution_admin',
  'admin',
  'superadmin',
  'developer',
]

// Rôles ayant accès admin transverse (non scopé)
export const GLOBAL_ADMIN_ROLES: UserRole[] = ['admin', 'superadmin', 'developer']

export const SUBSCRIPTION_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    'Saisie d\'interventions (max 50/mois)',
    'Historique basique',
    'Calendrier de gardes',
  ],
  premium: [
    'Saisie illimitée d\'interventions',
    'Suivi post-opératoire des patients',
    'Export PDF/Excel certifié',
    'Dashboard avancé + graphiques',
    'Templates CRO complets',
    'Ordonnances type + bilans pré-opératoires',
    'Atlas instruments chirurgicaux',
    'Notes de cours classables',
    'Newsletter scientifique mensuelle',
    'Mode hors-ligne complet',
    'Mode bilingue FR/EN',
  ],
  institutional: [
    'Tout le plan Premium',
    '20 postes inclus (chefs de service)',
    'Dashboard coordinateur hôpital',
    'Gestion complète des DES',
    'Statistiques par promotion et spécialité',
    'Validation des actes par superviseurs',
    'Support prioritaire',
  ],
}

export const SUBSCRIPTION_PRICES = {
  free: { eur: 0, fcfa: 0, label: 'Gratuit' },
  premium: { eur: 7.99, fcfa: 4999, label: '7,99 €/mois' },
  institutional: { eur: 45.99, fcfa: 29999, label: '45,99 €/mois' },
} as const

export interface InstitutionalSeat {
  id: string
  subscription_id: string
  max_seats: number
  used_seats: number
  created_at: string
}

export const FOLLOWUP_OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  en_cours: 'En cours',
  exeat: 'Exéat',
  decede: 'Décès',
}

export const FOLLOWUP_OUTCOME_COLORS: Record<FollowupOutcome, string> = {
  en_cours: 'bg-amber-100 text-amber-700',
  exeat: 'bg-emerald-100 text-emerald-700',
  decede: 'bg-slate-200 text-slate-700',
}

export const FOLLOWUP_EVENT_LABELS: Record<FollowupEventType, string> = {
  complication: 'Complication',
  reprise_bloc: 'Reprise au bloc',
  note: 'Note',
  observation: 'Observation',
  amelioration: 'Amélioration',
}

export const FOLLOWUP_EVENT_COLORS: Record<FollowupEventType, string> = {
  complication: 'bg-orange-100 text-orange-700 border-orange-200',
  reprise_bloc: 'bg-red-100 text-red-700 border-red-200',
  note: 'bg-blue-100 text-blue-700 border-blue-200',
  observation: 'bg-slate-100 text-slate-700 border-slate-200',
  amelioration: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export const CAUSE_OF_DEATH_OPTIONS = [
  'Arrêt cardiaque',
  'Choc septique',
  'Hémorragie',
  'Embolie pulmonaire',
  'Défaillance multi-organes',
  'Complication anesthésique',
  'Complication chirurgicale',
  'Détresse respiratoire',
  'Autre',
] as const

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  '0-5': '0-5 ans',
  '6-15': '6-15 ans',
  '16-25': '16-25 ans',
  '26-40': '26-40 ans',
  '41-60': '41-60 ans',
  '61-75': '61-75 ans',
  '75+': '75+ ans',
}

export const NOTE_CATEGORIES = [
  'Anatomie',
  'Chirurgie',
  'Médecine interne',
  'Pédiatrie',
  'Gynécologie',
  'Urgences',
  'Pharmacologie',
  'Radiologie',
  'Anesthésie',
  'Consignes',
  'Divers',
  'Personnel',
  'Autre',
] as const
