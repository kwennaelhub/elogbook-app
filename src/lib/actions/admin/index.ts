/**
 * Barrel export — admin actions
 *
 * Permet de garder `import { xxx } from '@/lib/actions/admin'`
 * tout en ayant le code découpé en fichiers vertical-slice.
 *
 * Avant : 1 fichier de 549 lignes
 * Après : 5 fichiers spécialisés (~100 lignes chacun)
 */

// Config (hôpitaux, spécialités, procédures, objectifs DES)
export {
  addHospital, updateHospital, deleteHospital, removeHospitalLogo,
  addSpecialty, updateSpecialty, deleteSpecialty,
  addProcedure, deleteProcedure,
  getSpecialtiesWithProcedures,
  getDesObjectives, upsertDesObjective, deleteDesObjective,
} from './config'

// Référentiel (templates, techniques, validation)
export {
  addCroTemplate, addPrescriptionTemplate, addPreopTemplate, addInstrument,
  addTechnique, getTechniques,
  approveReferentialItem, rejectReferentialItem,
} from './referential'

// Utilisateurs (rôles, profil, email, suppression)
export { updateUserRole, updateProfile, sendWelcomeEmail, deleteUser } from './users'

// Sièges institutionnels
export {
  getInstitutionalSeats, getSeatAssignments,
  assignSeat, removeSeatAssignment, searchUsersForSeat,
} from './seats'

// Phase B — Services hospitaliers (CRUD + assignation chef)
export {
  getHospitalServices, getHospitalService,
  createHospitalService, updateHospitalService,
  deactivateHospitalService, deleteHospitalService,
  assignServiceChief, getServiceChiefCandidates,
} from './services'
