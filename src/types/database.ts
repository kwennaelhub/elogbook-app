// Types TypeScript — E-Logbook Chirurgical CNHU-HKM
// Générés depuis schema.sql v2 (avril 2026)

// ========== ENUMS ==========

export type UserRole = 'student' | 'supervisor' | 'admin' | 'superadmin'
export type DesLevel = 'DES1' | 'DES2' | 'DES3' | 'DES4' | 'DES5'
export type SurgeryContext = 'programmed' | 'emergency'
export type PatientType = 'real' | 'simulation'
export type OperatorRole = 'observer' | 'assistant' | 'supervised_operator' | 'autonomous_operator'
export type GardeType = 'day' | 'night' | '24h' | 'weekend'
export type GardeSource = 'user' | 'admin'
export type EntryMode = 'prospective' | 'retrospective'
export type SubscriptionPlan = 'free' | 'premium' | 'institutional'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

// ========== TABLES ==========

export interface Hospital {
  id: string
  name: string
  city: string
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
  phone: string | null
  title: string | null // titre académique : Pr, Pr Ag, Dr, MC, CC
  matricule: string | null
  registry_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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

// ========== TYPES FORMULAIRES (INSERT/UPDATE) ==========

export type EntryInsert = Omit<Entry, 'id' | 'submitted_at' | 'entry_mode' | 'is_validated' | 'validated_at' | 'validated_by' | 'created_at' | 'updated_at'>

export type GardeInsert = Omit<Garde, 'id' | 'created_at' | 'updated_at'>

export type ProfileUpdate = Partial<Pick<Profile, 'first_name' | 'last_name' | 'phone' | 'hospital_id' | 'des_level' | 'title'>>

// ========== TYPES ENRICHIS (avec jointures) ==========

export interface EntryWithDetails extends Entry {
  hospital?: Hospital
  specialty?: Specialty
  segment?: Specialty
  procedure?: Procedure
  supervisor?: Pick<Profile, 'id' | 'first_name' | 'last_name'>
}

export interface GardeWithDetails extends Garde {
  hospital?: Hospital
  senior?: Pick<Profile, 'id' | 'first_name' | 'last_name'>
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

export const SUBSCRIPTION_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    'Saisie d\'interventions (max 50/mois)',
    'Historique basique',
    'Calendrier de gardes',
  ],
  premium: [
    'Saisie illimitée',
    'Export PDF certifié',
    'Dashboard avancé + graphiques',
    'Templates CRO complets',
    'Ordonnances type',
    'Bilans pré-opératoires',
    'Atlas instruments',
    'Mode hors-ligne complet',
  ],
  institutional: [
    'Tout le plan Premium',
    'Dashboard coordinateur',
    'Gestion des DES',
    'Statistiques par promotion',
    'Support prioritaire',
  ],
}
