/**
 * Calcul des dates d'échéances réglementaires
 * CT, Tachygraphe, ATP selon le type de véhicule
 */

import { addYears, addMonths, format, parseISO } from 'date-fns';

export type VehicleType =
  | 'VOITURE'
  | 'FOURGON'
  | 'POIDS_LOURD'
  | 'POIDS_LOURD_FRIGO'
  | 'TRACTEUR_ROUTIER'
  | 'REMORQUE'
  | 'REMORQUE_FRIGO';

export interface VehicleDates {
  technicalControlDate: Date;
  technicalControlExpiry: Date;
  tachyControlDate?: Date;
  tachyControlExpiry?: Date;
  atpDate?: Date;
  atpExpiry?: Date;
}

export interface VehicleDateStrings {
  technical_control_date: string;
  technical_control_expiry: string;
  tachy_control_date?: string;
  tachy_control_expiry?: string;
  atp_date?: string;
  atp_expiry?: string;
}

/**
 * Calcule les dates d'échéances selon le type de véhicule
 * 
 * VOITURE/FOURGON: CT +2 ans
 * POIDS_LOURD: CT +1 an, Tachy +2 ans
 * POIDS_LOURD_FRIGO: CT +1 an, Tachy +2 ans, ATP +5 ans
 * TRACTEUR_ROUTIER: CT +1 an, Tachy +2 ans
 * REMORQUE: CT +1 an
 * REMORQUE_FRIGO: CT +1 an, ATP +5 ans
 */
export function calculateRegulatoryDates(
  vehicleType: VehicleType,
  technicalControlDate: Date | string = new Date()
): VehicleDates {
  const baseDate = typeof technicalControlDate === 'string' 
    ? parseISO(technicalControlDate) 
    : technicalControlDate;
  
  // S'assurer qu'on a une date valide
  if (isNaN(baseDate.getTime())) {
    throw new Error('Date de contrôle technique invalide');
  }

  switch (vehicleType) {
    case 'VOITURE':
    case 'FOURGON':
      return {
        technicalControlDate: baseDate,
        technicalControlExpiry: addYears(baseDate, 2),
      };
      
    case 'POIDS_LOURD':
      return {
        technicalControlDate: baseDate,
        technicalControlExpiry: addYears(baseDate, 1),
        tachyControlDate: baseDate, // Par défaut même date que CT
        tachyControlExpiry: addYears(baseDate, 2),
      };
      
    case 'POIDS_LOURD_FRIGO':
      return {
        technicalControlDate: baseDate,
        technicalControlExpiry: addYears(baseDate, 1),
        tachyControlDate: baseDate,
        tachyControlExpiry: addYears(baseDate, 2),
        atpDate: baseDate,
        atpExpiry: addYears(baseDate, 5),
      };

    case 'TRACTEUR_ROUTIER':
      return {
        technicalControlDate: baseDate,
        technicalControlExpiry: addYears(baseDate, 1),
        tachyControlDate: baseDate,
        tachyControlExpiry: addYears(baseDate, 2),
      };

    case 'REMORQUE':
      return {
        technicalControlDate: baseDate,
        technicalControlExpiry: addYears(baseDate, 1),
      };

    case 'REMORQUE_FRIGO':
      return {
        technicalControlDate: baseDate,
        technicalControlExpiry: addYears(baseDate, 1),
        atpDate: baseDate,
        atpExpiry: addYears(baseDate, 5),
      };

    default:
      throw new Error(`Type de véhicule inconnu: ${vehicleType}`);
  }
}

/**
 * Recalcule uniquement la date d'expiration du CT
 * Utile quand on change la date du dernier CT
 */
export function recalculateCTExpiry(
  vehicleType: VehicleType,
  technicalControlDate: Date | string
): Date {
  const baseDate = typeof technicalControlDate === 'string' 
    ? parseISO(technicalControlDate) 
    : technicalControlDate;
    
  if (isNaN(baseDate.getTime())) {
    throw new Error('Date de contrôle technique invalide');
  }

  // PL, Tracteur, Remorque = 1 an  |  Voiture, Fourgon = 2 ans
  const yearsToAdd = (
    vehicleType === 'POIDS_LOURD' ||
    vehicleType === 'POIDS_LOURD_FRIGO' ||
    vehicleType === 'TRACTEUR_ROUTIER' ||
    vehicleType === 'REMORQUE' ||
    vehicleType === 'REMORQUE_FRIGO'
  ) ? 1 : 2;
  return addYears(baseDate, yearsToAdd);
}

/**
 * Recalcule la date d'expiration du tachygraphe
 */
export function recalculateTachyExpiry(
  tachyControlDate: Date | string
): Date {
  const baseDate = typeof tachyControlDate === 'string' 
    ? parseISO(tachyControlDate) 
    : tachyControlDate;
    
  if (isNaN(baseDate.getTime())) {
    throw new Error('Date de contrôle tachygraphe invalide');
  }

  return addYears(baseDate, 2);
}

/**
 * Recalcule la date d'expiration ATP
 */
export function recalculateATPExpiry(
  atpDate: Date | string
): Date {
  const baseDate = typeof atpDate === 'string' 
    ? parseISO(atpDate) 
    : atpDate;
    
  if (isNaN(baseDate.getTime())) {
    throw new Error('Date ATP invalide');
  }

  return addYears(baseDate, 5);
}

/**
 * Vérifie si un type de véhicule nécessite un tachygraphe
 */
export function requiresTachy(vehicleType: VehicleType): boolean {
  return (
    vehicleType === 'POIDS_LOURD' ||
    vehicleType === 'POIDS_LOURD_FRIGO' ||
    vehicleType === 'TRACTEUR_ROUTIER'
  );
}

/**
 * Vérifie si un type de véhicule nécessite ATP
 */
export function requiresATP(vehicleType: VehicleType): boolean {
  return vehicleType === 'POIDS_LOURD_FRIGO' || vehicleType === 'REMORQUE_FRIGO';
}

/**
 * Convertit les dates en format string pour la DB (YYYY-MM-DD)
 */
export function datesToStrings(dates: VehicleDates): VehicleDateStrings {
  return {
    technical_control_date: format(dates.technicalControlDate, 'yyyy-MM-dd'),
    technical_control_expiry: format(dates.technicalControlExpiry, 'yyyy-MM-dd'),
    ...(dates.tachyControlDate && {
      tachy_control_date: format(dates.tachyControlDate, 'yyyy-MM-dd'),
      tachy_control_expiry: format(dates.tachyControlExpiry!, 'yyyy-MM-dd'),
    }),
    ...(dates.atpDate && {
      atp_date: format(dates.atpDate, 'yyyy-MM-dd'),
      atp_expiry: format(dates.atpExpiry!, 'yyyy-MM-dd'),
    }),
  };
}

/**
 * Détermine la périodicité du CT en texte
 */
export function getCTPeriodicity(vehicleType: VehicleType): string {
  switch (vehicleType) {
    case 'VOITURE':
    case 'FOURGON':
      return 'Tous les 2 ans';
    case 'POIDS_LOURD':
    case 'POIDS_LOURD_FRIGO':
    case 'TRACTEUR_ROUTIER':
    case 'REMORQUE':
    case 'REMORQUE_FRIGO':
      return 'Tous les ans';
    default:
      return 'Inconnue';
  }
}

/**
 * Configuration des types de véhicule pour l'UI
 */
export const vehicleTypeConfig: Record<VehicleType, {
  label: string;
  emoji: string;
  description: string;
  ctPeriodicity: string;
  requiresTachy: boolean;
  requiresATP: boolean;
}> = {
  VOITURE: {
    label: 'Voiture',
    emoji: '🚗',
    description: 'Véhicule léger (VL)',
    ctPeriodicity: '2 ans',
    requiresTachy: false,
    requiresATP: false,
  },
  FOURGON: {
    label: 'Fourgon',
    emoji: '🚐',
    description: 'Utilitaire léger (< 3.5t)',
    ctPeriodicity: '2 ans',
    requiresTachy: false,
    requiresATP: false,
  },
  POIDS_LOURD: {
    label: 'Poids Lourd',
    emoji: '🚛',
    description: 'Camion, tracteur, porteur (≥ 3.5t)',
    ctPeriodicity: '1 an',
    requiresTachy: true,
    requiresATP: false,
  },
  POIDS_LOURD_FRIGO: {
    label: 'PL Frigorifique',
    emoji: '🚛❄️',
    description: 'Poids lourd avec groupe frigorifique',
    ctPeriodicity: '1 an',
    requiresTachy: true,
    requiresATP: true,
  },
  TRACTEUR_ROUTIER: {
    label: 'Tracteur Routier',
    emoji: '🚜',
    description: 'Ensemble routier — moteur tracteur (≥ 3.5t)',
    ctPeriodicity: '1 an',
    requiresTachy: true,
    requiresATP: false,
  },
  REMORQUE: {
    label: 'Remorque',
    emoji: '🚛',
    description: 'Ensemble routier — remorque / semi-remorque',
    ctPeriodicity: '1 an',
    requiresTachy: false,
    requiresATP: false,
  },
  REMORQUE_FRIGO: {
    label: 'Remorque Frigorifique',
    emoji: '🚛❄️',
    description: 'Ensemble routier — remorque frigorifique',
    ctPeriodicity: '1 an',
    requiresTachy: false,
    requiresATP: true,
  },
};
