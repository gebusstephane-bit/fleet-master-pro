/**
 * Constantes et types pour les statuts des véhicules
 * Standard: MAJUSCULE_UNDERSCORE (ACTIF | INACTIF | EN_MAINTENANCE | ARCHIVE)
 */

/** Statuts de véhicule valides - Standard MAJUSCULE_UNDERSCORE */
export const VEHICLE_STATUS = {
  ACTIF: 'ACTIF',
  INACTIF: 'INACTIF',
  EN_MAINTENANCE: 'EN_MAINTENANCE',
  ARCHIVE: 'ARCHIVE',
} as const;

/** Type TypeScript pour les statuts de véhicule */
export type VehicleStatus = typeof VEHICLE_STATUS[keyof typeof VEHICLE_STATUS];

/** Labels traduits en français pour l'affichage */
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  [VEHICLE_STATUS.ACTIF]: 'Actif',
  [VEHICLE_STATUS.INACTIF]: 'Inactif',
  [VEHICLE_STATUS.EN_MAINTENANCE]: 'En maintenance',
  [VEHICLE_STATUS.ARCHIVE]: 'Archivé',
};

/** Configuration des couleurs pour l'affichage UI */
export interface VehicleStatusStyle {
  label: string;
  color: string;
  bg: string;
  border?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/** Styles complets par statut pour les badges et indicateurs */
export const VEHICLE_STATUS_STYLES: Record<VehicleStatus, VehicleStatusStyle> = {
  [VEHICLE_STATUS.ACTIF]: {
    label: 'Actif',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    variant: 'default',
  },
  [VEHICLE_STATUS.INACTIF]: {
    label: 'Inactif',
    color: 'text-gray-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    variant: 'secondary',
  },
  [VEHICLE_STATUS.EN_MAINTENANCE]: {
    label: 'En maintenance',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    variant: 'outline',
  },
  [VEHICLE_STATUS.ARCHIVE]: {
    label: 'Archivé',
    color: 'text-slate-400',
    bg: 'bg-slate-700/30',
    border: 'border-slate-600/30',
    variant: 'secondary',
  },
};

/** Couleurs legacy pour compatibilité (déprécié - utiliser VEHICLE_STATUS_STYLES) */
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, { color: string; bg: string; label: string }> = {
  [VEHICLE_STATUS.ACTIF]: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Actif' },
  [VEHICLE_STATUS.INACTIF]: { color: 'text-gray-400', bg: 'bg-slate-500/15', label: 'Inactif' },
  [VEHICLE_STATUS.EN_MAINTENANCE]: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'En maintenance' },
  [VEHICLE_STATUS.ARCHIVE]: { color: 'text-slate-400', bg: 'bg-slate-700/30', label: 'Archivé' },
};

/** Options pour les selects/filtres */
export const VEHICLE_STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: VEHICLE_STATUS.ACTIF, label: 'Actif' },
  { value: VEHICLE_STATUS.INACTIF, label: 'Inactif' },
  { value: VEHICLE_STATUS.EN_MAINTENANCE, label: 'En maintenance' },
  { value: VEHICLE_STATUS.ARCHIVE, label: 'Archivé' },
];

/** Statuts considérés comme "actifs" pour les statistiques */
export const ACTIVE_STATUSES: VehicleStatus[] = [VEHICLE_STATUS.ACTIF];

/** Statuts considérés comme "inactifs" pour les statistiques */
export const INACTIVE_STATUSES: VehicleStatus[] = [
  VEHICLE_STATUS.INACTIF,
  VEHICLE_STATUS.ARCHIVE,
];

/**
 * Vérifie si un statut est actif
 */
export function isVehicleActive(status: string): boolean {
  return status === VEHICLE_STATUS.ACTIF;
}

/**
 * Vérifie si un statut est inactif (inactif ou archivé)
 */
export function isVehicleInactive(status: string): boolean {
  return INACTIVE_STATUSES.includes(status as VehicleStatus);
}

/**
 * Retourne le label traduit d'un statut
 */
export function getVehicleStatusLabel(status: string): string {
  return VEHICLE_STATUS_LABELS[status as VehicleStatus] || status;
}

/**
 * Valide qu'un statut est valide
 */
export function isValidVehicleStatus(status: string): status is VehicleStatus {
  return Object.values(VEHICLE_STATUS).includes(status as VehicleStatus);
}

// ============================================
// MAPPING LEGACY (pour migration/transitions)
// ============================================

/** Mapping des anciens statuts vers les nouveaux */
export const LEGACY_TO_STANDARD_STATUS: Record<string, VehicleStatus> = {
  active: VEHICLE_STATUS.ACTIF,
  ACTIF: VEHICLE_STATUS.ACTIF,
  inactive: VEHICLE_STATUS.INACTIF,
  INACTIF: VEHICLE_STATUS.INACTIF,
  maintenance: VEHICLE_STATUS.EN_MAINTENANCE,
  EN_MAINTENANCE: VEHICLE_STATUS.EN_MAINTENANCE,
  retired: VEHICLE_STATUS.ARCHIVE,
  ARCHIVE: VEHICLE_STATUS.ARCHIVE,
  archived: VEHICLE_STATUS.ARCHIVE,
  HORS_SERVICE: VEHICLE_STATUS.INACTIF,
};

/**
 * Convertit un statut legacy vers le standard
 */
export function normalizeVehicleStatus(status: string): VehicleStatus {
  return LEGACY_TO_STANDARD_STATUS[status] || VEHICLE_STATUS.INACTIF;
}
