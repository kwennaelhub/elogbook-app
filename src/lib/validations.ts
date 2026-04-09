import { z } from 'zod'

// ========== AUTH ==========

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

export const registerSchema = z.object({
  matricule: z.string().min(1, 'Le matricule est obligatoire'),
  email: z.string().email('Adresse email invalide'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
  confirm_password: z.string(),
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

// ========== ENTRIES ==========

// Transforme les chaînes vides en undefined pour les champs UUID optionnels
const optionalUuid = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().uuid().optional()
)

export const entrySchema = z.object({
  intervention_date: z.string().min(1, 'La date est obligatoire'),
  context: z.enum(['programmed', 'emergency']),
  patient_type: z.enum(['real', 'simulation']),
  operator_role: z.enum(['observer', 'assistant', 'supervised_operator', 'autonomous_operator']),
  hospital_id: z.string().uuid('Hôpital invalide'),
  other_hospital: z.string().optional(),
  specialty_id: optionalUuid,
  segment_id: optionalUuid,
  procedure_id: optionalUuid,
  other_specialty: z.string().optional(),
  other_procedure: z.string().optional(),
  notes: z.string().max(5000).optional(),
  supervisor_id: optionalUuid,
  // Géolocalisation (optionnelle)
  geo_latitude: z.number().optional(),
  geo_longitude: z.number().optional(),
  geo_accuracy: z.number().optional(),
  // Attestation (obligatoire si rétrospectif — validé côté serveur)
  attestation_checked: z.boolean().default(false),
  // Suivi post-opératoire (Premium)
  enable_followup: z.boolean().default(false),
})

// ========== GARDES ==========

export const gardeSchema = z.object({
  date: z.string().min(1, 'La date est obligatoire'),
  type: z.enum(['day', 'night', '24h', 'weekend']),
  service: z.string().optional(),
  senior_name: z.string().optional(),
  senior_id: optionalUuid,
  hospital_id: optionalUuid,
  notes: z.string().max(5000).optional(),
})

// ========== PROFILE ==========

export const profileUpdateSchema = z.object({
  first_name: z.string().min(2).optional(),
  last_name: z.string().min(2).optional(),
  phone: z.string().optional(),
  hospital_id: z.string().uuid().optional(),
  des_level: z.enum(['DES1', 'DES2', 'DES3', 'DES4', 'DES5']).optional(),
})

// ========== SUPERVISEUR (admin) ==========

export const supervisorSchema = z.object({
  first_name: z.string().min(2, 'Le prénom est obligatoire'),
  last_name: z.string().min(2, 'Le nom est obligatoire'),
  email: z.string().email('Adresse email invalide'),
  title: z.enum(['Pr', 'Pr Ag', 'Dr', 'MC', 'CC']),
  hospital_id: z.string().uuid('Hôpital invalide'),
  phone: z.string().optional(),
})

export const supervisorAssignmentSchema = z.object({
  supervisor_id: z.string().uuid(),
  student_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  start_date: z.string().min(1, 'La date de début est obligatoire'),
  end_date: z.string().optional(),
})

// ========== DES REGISTRY (admin) ==========

export const desRegistrySchema = z.object({
  matricule: z.string().min(1, 'Le matricule est obligatoire'),
  first_name: z.string().min(2, 'Le prénom est obligatoire'),
  last_name: z.string().min(2, 'Le nom est obligatoire'),
  email: z.string().email().optional(),
  des_level: z.enum(['DES1', 'DES2', 'DES3', 'DES4', 'DES5']),
  promotion_year: z.number().min(2000).max(2050),
  university: z.string().default('Université d\'Abomey-Calavi'),
  specialty: z.string().optional(),
})

export const desRegistryCsvSchema = z.array(desRegistrySchema)

// ========== TYPES INFÉRÉS ==========

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type EntryInput = z.infer<typeof entrySchema>
export type GardeInput = z.infer<typeof gardeSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type DesRegistryInput = z.infer<typeof desRegistrySchema>
