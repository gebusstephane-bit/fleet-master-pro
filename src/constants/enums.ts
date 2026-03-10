/**
 * Constantes d'énumérations centralisées — source unique de vérité
 *
 * Importer depuis ce fichier plutôt que d'utiliser des magic strings.
 * Les valeurs des strings ne changent PAS — seule la référence change.
 */

// ---------------------------------------------------------------------------
// Statuts véhicules (re-exportés depuis lib/vehicle-status pour compatibilité)
// ---------------------------------------------------------------------------
export {
  VEHICLE_STATUS,
  type VehicleStatus,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_STYLES,
  VEHICLE_STATUS_OPTIONS,
} from '@/lib/vehicle-status';

// ---------------------------------------------------------------------------
// Rôles utilisateurs
// ---------------------------------------------------------------------------
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  DIRECTEUR: 'DIRECTEUR',
  AGENT_DE_PARC: 'AGENT_DE_PARC',
  EXPLOITANT: 'EXPLOITANT',
  CHAUFFEUR: 'CHAUFFEUR',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/** Rôles qui peuvent gérer le parc (créer/modifier véhicules, inspections…) */
export const MANAGER_ROLES: UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.DIRECTEUR,
  USER_ROLE.AGENT_DE_PARC,
];

/** Rôles de direction (accès complet aux données et à la configuration) */
export const DIRECTOR_ROLES: UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.DIRECTEUR,
];
