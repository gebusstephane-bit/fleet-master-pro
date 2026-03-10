/**
 * Calcul des échéances de conformité réglementaire
 * Gère les activités spéciales (ADR, Frigo) avec fallback legacy
 * ZERO RÉGRESSION - Compatible véhicules existants
 */

import { addMonths, addYears, differenceInDays, format, isValid, parseISO } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ============================================
// TYPES
// ============================================

export type TransportActivity =
  | 'MARCHANDISES_GENERALES'
  | 'FRIGORIFIQUE'
  | 'ADR_COLIS'
  | 'ADR_CITERNE'
  | 'CONVOI_EXCEPTIONNEL'
  | 'BENNE_TRAVAUX_PUBLICS'
  | 'ANIMAUX_VIVANTS';

export type VehicleType =
  | 'VOITURE'
  | 'FOURGON'
  | 'POIDS_LOURD'
  | 'POIDS_LOURD_FRIGO'
  | 'TRACTEUR_ROUTIER'
  | 'REMORQUE'
  | 'REMORQUE_FRIGO';

/**
 * Échéance de conformité calculée
 */
export interface ComplianceDeadline {
  documentCode: string;
  documentName: string;
  expiryDate: string; // ISO format YYYY-MM-DD
  daysLeft: number;
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
  isMandatory: boolean;
  equipmentList: string[] | null;
  lastDate: string | null; // Dernière date connue (inspection ou saisie)
  frequencyMonths: number;
}

/**
 * Règle de conformité depuis la DB
 */
interface ComplianceRule {
  id: string;
  activity: TransportActivity;
  document_code: string;
  document_name: string;
  frequency_months: number;
  is_mandatory: boolean;
  requires_equipment: boolean;
  equipment_list: string[] | null;
  applicable_vehicle_types: VehicleType[] | null;
  reminder_days: number;
}

/**
 * Données véhicule simplifiées (compatibilité avec DB vehicles)
 */
export interface VehicleComplianceData {
  id: string;
  company_id: string;
  type: VehicleType;
  technical_control_date: string | null;
  technical_control_expiry: string | null;
  tachy_control_date: string | null;
  tachy_control_expiry: string | null;
  atp_date: string | null;
  atp_expiry: string | null;
  // Champs optionnels pour activités spécifiques
  adr_certificate_expiry?: string | null;
  adr_equipment_check_date?: string | null;
  frigo_calibration_date?: string | null;
  compatible_activities?: TransportActivity[] | null;
}

// ============================================
// FONCTIONS PUBLIQUES
// ============================================

/**
 * Récupère l'activité actuelle assignée à un véhicule
 * Retourne null si aucune activité active (end_date IS NULL)
 */
export async function getVehicleCurrentActivity(
  vehicleId: string,
  supabase: SupabaseClient<Database>
): Promise<TransportActivity | null> {
  const { data, error } = await supabase
    .from('vehicle_activity_assignments')
    .select('activity')
    .eq('vehicle_id', vehicleId)
    .is('end_date', null)
    .maybeSingle();

  if (error) {
    console.error('Error fetching vehicle activity:', error);
    return null;
  }

  if (!data?.activity) return null;
  return data.activity as TransportActivity;
}

/**
 * Récupère toutes les règles de conformité pour une activité
 */
export async function getComplianceRulesByActivity(
  activity: TransportActivity,
  vehicleType: VehicleType,
  supabase: SupabaseClient<Database>
): Promise<ComplianceRule[]> {
  const { data, error } = await supabase
    .from('compliance_rules')
    .select('*')
    .eq('activity', activity)
    .or(`applicable_vehicle_types.is.null,applicable_vehicle_types.cs.{${vehicleType}}`);

  if (error) {
    console.error('Error fetching compliance rules:', error);
    return [];
  }

  return (data || []) as ComplianceRule[];
}

/**
 * Détermine le statut d'une échéance selon les jours restants
 */
export function getDeadlineStatus(daysLeft: number, reminderDays: number = 30): ComplianceDeadline['status'] {
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= 7) return 'CRITICAL';
  if (daysLeft <= reminderDays) return 'WARNING';
  return 'OK';
}

/**
 * Calcule la prochaine échéance pour un document selon la règle
 */
function calculateDeadlineFromRule(
  rule: ComplianceRule,
  vehicle: VehicleComplianceData
): ComplianceDeadline {
  // Déterminer la dernière date connue selon le type de document
  let lastDate: Date | null = null;
  let lastDateString: string | null = null;

  switch (rule.document_code) {
    case 'CT':
    case 'CT_PL':
    case 'CT_VL':
      lastDate = parseDateSafe(vehicle.technical_control_date);
      lastDateString = vehicle.technical_control_date;
      break;

    case 'TACHY':
      lastDate = parseDateSafe(vehicle.tachy_control_date);
      lastDateString = vehicle.tachy_control_date;
      break;

    case 'ATP':
      lastDate = parseDateSafe(vehicle.atp_date);
      lastDateString = vehicle.atp_date;
      break;

    case 'ADR_CERT':
      // Pour ADR: on calcule à partir de l'expiration si disponible, sinon null
      if (vehicle.adr_certificate_expiry) {
        // On prend la date d'expiration comme référence pour recalculer
        lastDate = parseDateSafe(vehicle.adr_certificate_expiry);
        lastDateString = vehicle.adr_certificate_expiry ?? null;
      } else {
        lastDate = null;
        lastDateString = null;
      }
      break;

    case 'ADR_EQUIPEMENT':
      lastDate = parseDateSafe(vehicle.adr_equipment_check_date);
      lastDateString = vehicle.adr_equipment_check_date ?? null;
      break;

    case 'ETALONNAGE':
      lastDate = parseDateSafe(vehicle.frigo_calibration_date);
      lastDateString = vehicle.frigo_calibration_date ?? null;
      break;

    default:
      // Pour les autres documents, on essaie de trouver une date générique
      lastDate = null;
  }

  // Calculer la prochaine date d'échéance
  const today = new Date();
  let nextDate: Date;

  if (lastDate && isValid(lastDate)) {
    // Si on a une date, on ajoute la fréquence
    nextDate = addMonths(lastDate, rule.frequency_months);
    
    // Si la date calculée est dans le passé, on recalcule à partir d'aujourd'hui
    // (cas où le document est expiré depuis longtemps)
    if (nextDate < today) {
      nextDate = addMonths(today, rule.frequency_months);
    }
  } else {
    // Jamais fait = dans X mois à partir d'aujourd'hui
    nextDate = addMonths(today, rule.frequency_months);
  }

  const daysLeft = differenceInDays(nextDate, today);
  const status = getDeadlineStatus(daysLeft, rule.reminder_days);

  return {
    documentCode: rule.document_code,
    documentName: rule.document_name,
    expiryDate: format(nextDate, 'yyyy-MM-dd'),
    daysLeft,
    status,
    isMandatory: rule.is_mandatory,
    equipmentList: rule.equipment_list,
    lastDate: lastDateString,
    frequencyMonths: rule.frequency_months,
  };
}

/**
 * Calcule toutes les échéances pour un véhicule avec une activité donnée
 * NOUVEAU SYSTÈME - Basé sur les règles de compliance_rules
 */
export async function calculateDeadlinesByActivity(
  vehicle: VehicleComplianceData,
  activity: TransportActivity,
  supabase: SupabaseClient<Database>
): Promise<ComplianceDeadline[]> {
  // Récupérer les règles applicables
  const rules = await getComplianceRulesByActivity(activity, vehicle.type, supabase);

  if (!rules.length) {
    // Si pas de règles spécifiques, fallback sur legacy
    return mapLegacyToComplianceDeadlines(vehicle);
  }

  // Calculer chaque échéance
  const deadlines = rules.map(rule => calculateDeadlineFromRule(rule, vehicle));

  // Trier par priorité: CRITICAL/EXPIRED d'abord, puis WARNING, puis OK
  return sortDeadlinesByPriority(deadlines);
}

/**
 * Fonction hybride principale: Legacy + Nouveau système
 * ZERO RÉGRESSION: Les véhicules sans activité gardent leur comportement exact
 */
export async function getVehicleComplianceDeadlines(
  vehicle: VehicleComplianceData,
  companyId: string,
  supabase: SupabaseClient<Database>
): Promise<ComplianceDeadline[]> {
  // Vérifier d'abord s'il y a une activité assignée active
  const assignedActivity = await getVehicleCurrentActivity(vehicle.id, supabase);

  if (assignedActivity) {
    // NOUVEAU SYSTÈME: Calcul basé sur l'activité assignée
    return calculateDeadlinesByActivity(vehicle, assignedActivity, supabase);
  }

  // LEGACY: Vérifier si des activités sont compatibles (colonne compatible_activities)
  if (vehicle.compatible_activities && vehicle.compatible_activities.length > 0) {
    // Prendre la première activité compatible (généralement MARCHANDISES_GENERALES)
    const primaryActivity = vehicle.compatible_activities[0];
    return calculateDeadlinesByActivity(vehicle, primaryActivity, supabase);
  }

  // LEGACY PUR: Fallback sur l'ancien calcul basé uniquement sur le type
  return mapLegacyToComplianceDeadlines(vehicle);
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Parse une date de façon sécurisée
 */
function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return isValid(date) ? date : null;
}

/**
 * Trie les échéances par priorité (EXPIRED > CRITICAL > WARNING > OK)
 */
function sortDeadlinesByPriority(deadlines: ComplianceDeadline[]): ComplianceDeadline[] {
  const priorityOrder: Record<ComplianceDeadline['status'], number> = {
    EXPIRED: 0,
    CRITICAL: 1,
    WARNING: 2,
    OK: 3,
  };

  return deadlines.sort((a, b) => {
    const priorityDiff = priorityOrder[a.status] - priorityOrder[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    // Si même priorité, trier par jours restants
    return a.daysLeft - b.daysLeft;
  });
}

/**
 * Convertit le calcul legacy vers le format ComplianceDeadline
 * GARANTIE ZERO RÉGRESSION
 */
function mapLegacyToComplianceDeadlines(
  vehicle: VehicleComplianceData
): ComplianceDeadline[] {
  const today = new Date();
  const deadlines: ComplianceDeadline[] = [];
  const vehicleType = vehicle.type;

  // CT - Toujours présent
  const ctDate = parseDateSafe(vehicle.technical_control_date) || today;
  const ctExpiry = parseDateSafe(vehicle.technical_control_expiry) || calculateCTLegacy(vehicleType, ctDate);
  const ctDaysLeft = differenceInDays(ctExpiry, today);

  deadlines.push({
    documentCode: getCTLegacyCode(vehicleType),
    documentName: 'Contrôle Technique',
    expiryDate: format(ctExpiry, 'yyyy-MM-dd'),
    daysLeft: ctDaysLeft,
    status: getDeadlineStatus(ctDaysLeft),
    isMandatory: true,
    equipmentList: null,
    lastDate: vehicle.technical_control_date,
    frequencyMonths: vehicleType === 'VOITURE' || vehicleType === 'FOURGON' ? 24 : 12,
  });

  // Tachygraphe - Uniquement PL, PL Frigo, Tracteur
  if (requiresTachyLegacy(vehicleType)) {
    const tachyDate = parseDateSafe(vehicle.tachy_control_date) || ctDate;
    const tachyExpiry = parseDateSafe(vehicle.tachy_control_expiry) || addYears(tachyDate, 2);
    const tachyDaysLeft = differenceInDays(tachyExpiry, today);

    deadlines.push({
      documentCode: 'TACHY',
      documentName: 'Chronotachygraphe',
      expiryDate: format(tachyExpiry, 'yyyy-MM-dd'),
      daysLeft: tachyDaysLeft,
      status: getDeadlineStatus(tachyDaysLeft),
      isMandatory: true,
      equipmentList: null,
      lastDate: vehicle.tachy_control_date,
      frequencyMonths: 24,
    });
  }

  // ATP - Uniquement PL Frigo, Remorque Frigo
  if (requiresATPLegacy(vehicleType)) {
    const atpDate = parseDateSafe(vehicle.atp_date) || ctDate;
    const atpExpiry = parseDateSafe(vehicle.atp_expiry) || addYears(atpDate, 5);
    const atpDaysLeft = differenceInDays(atpExpiry, today);

    deadlines.push({
      documentCode: 'ATP',
      documentName: 'Certificat ATP',
      expiryDate: format(atpExpiry, 'yyyy-MM-dd'),
      daysLeft: atpDaysLeft,
      status: getDeadlineStatus(atpDaysLeft),
      isMandatory: true,
      equipmentList: null,
      lastDate: vehicle.atp_date,
      frequencyMonths: 60, // 5 ans = 60 mois en legacy
    });
  }

  return sortDeadlinesByPriority(deadlines);
}

/**
 * Calcule la date de CT selon l'ancienne logique legacy
 */
function calculateCTLegacy(vehicleType: VehicleType, baseDate: Date): Date {
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
 * Retourne le code CT legacy selon le type
 */
function getCTLegacyCode(vehicleType: VehicleType): string {
  if (vehicleType === 'VOITURE' || vehicleType === 'FOURGON') {
    return 'CT_VL';
  }
  return 'CT_PL';
}

/**
 * Vérifie si le véhicule nécessite un tachygraphe (logique legacy)
 */
function requiresTachyLegacy(vehicleType: VehicleType): boolean {
  return (
    vehicleType === 'POIDS_LOURD' ||
    vehicleType === 'POIDS_LOURD_FRIGO' ||
    vehicleType === 'TRACTEUR_ROUTIER'
  );
}

/**
 * Vérifie si le véhicule nécessite ATP (logique legacy)
 */
function requiresATPLegacy(vehicleType: VehicleType): boolean {
  return vehicleType === 'POIDS_LOURD_FRIGO' || vehicleType === 'REMORQUE_FRIGO';
}

// ============================================
// FONCTIONS DE CALCUL DIRECT (sans DB)
// ============================================

/**
 * Calcule les échéances ADR pour un véhicule
 * Utilisable sans appel DB si les règles sont connues
 */
export function calculateADRDeadlines(
  vehicle: VehicleComplianceData,
  lastCertDate?: string,
  lastEquipmentCheck?: string
): ComplianceDeadline[] {
  const today = new Date();
  const deadlines: ComplianceDeadline[] = [];

  // CT (12 mois pour PL)
  const ctDate = parseDateSafe(vehicle.technical_control_date) || today;
  const ctExpiry = parseDateSafe(vehicle.technical_control_expiry) || addYears(ctDate, 1);
  const ctDaysLeft = differenceInDays(ctExpiry, today);

  deadlines.push({
    documentCode: 'CT',
    documentName: 'Contrôle Technique',
    expiryDate: format(ctExpiry, 'yyyy-MM-dd'),
    daysLeft: ctDaysLeft,
    status: getDeadlineStatus(ctDaysLeft),
    isMandatory: true,
    equipmentList: null,
    lastDate: vehicle.technical_control_date,
    frequencyMonths: 12,
  });

  // Tachygraphe (24 mois)
  if (requiresTachyLegacy(vehicle.type)) {
    const tachyDate = parseDateSafe(vehicle.tachy_control_date) || ctDate;
    const tachyExpiry = addYears(tachyDate, 2);
    const tachyDaysLeft = differenceInDays(tachyExpiry, today);

    deadlines.push({
      documentCode: 'TACHY',
      documentName: 'Chronotachygraphe',
      expiryDate: format(tachyExpiry, 'yyyy-MM-dd'),
      daysLeft: tachyDaysLeft,
      status: getDeadlineStatus(tachyDaysLeft),
      isMandatory: true,
      equipmentList: null,
      lastDate: vehicle.tachy_control_date,
      frequencyMonths: 24,
    });
  }

  // Certificat ADR (12 mois)
  const adrBaseDate = parseDateSafe(lastCertDate) || today;
  const adrExpiry = addYears(adrBaseDate, 1);
  const adrDaysLeft = differenceInDays(adrExpiry, today);

  deadlines.push({
    documentCode: 'ADR_CERT',
    documentName: "Agrément ADR Véhicule",
    expiryDate: format(adrExpiry, 'yyyy-MM-dd'),
    daysLeft: adrDaysLeft,
    status: getDeadlineStatus(adrDaysLeft),
    isMandatory: true,
    equipmentList: null,
    lastDate: lastCertDate || null,
    frequencyMonths: 12,
  });

  // Équipement ADR (12 mois)
  const equipBaseDate = parseDateSafe(lastEquipmentCheck) || today;
  const equipExpiry = addYears(equipBaseDate, 1);
  const equipDaysLeft = differenceInDays(equipExpiry, today);

  deadlines.push({
    documentCode: 'ADR_EQUIPEMENT',
    documentName: "Contrôle Équipement ADR",
    expiryDate: format(equipExpiry, 'yyyy-MM-dd'),
    daysLeft: equipDaysLeft,
    status: getDeadlineStatus(equipDaysLeft),
    isMandatory: true,
    equipmentList: [
      'Valise ADR complète',
      'Panneaux orange (2)',
      'Gilets jaunes (1 par personne)',
      'Cônes de signalisation (2)',
      'Lampes torches antidéflagrantes',
      'Protection oculaire',
      'Gants de protection',
      'Bottes de protection',
    ],
    lastDate: lastEquipmentCheck || null,
    frequencyMonths: 12,
  });

  return sortDeadlinesByPriority(deadlines);
}

/**
 * Calcule les échéances Frigorifique pour un véhicule
 */
export function calculateFrigoDeadlines(
  vehicle: VehicleComplianceData,
  lastCalibrationDate?: string
): ComplianceDeadline[] {
  const today = new Date();
  const deadlines: ComplianceDeadline[] = [];

  // CT (12 mois)
  const ctDate = parseDateSafe(vehicle.technical_control_date) || today;
  const ctExpiry = parseDateSafe(vehicle.technical_control_expiry) || addYears(ctDate, 1);
  const ctDaysLeft = differenceInDays(ctExpiry, today);

  deadlines.push({
    documentCode: 'CT',
    documentName: 'Contrôle Technique',
    expiryDate: format(ctExpiry, 'yyyy-MM-dd'),
    daysLeft: ctDaysLeft,
    status: getDeadlineStatus(ctDaysLeft),
    isMandatory: true,
    equipmentList: null,
    lastDate: vehicle.technical_control_date,
    frequencyMonths: 12,
  });

  // Tachygraphe (24 mois) - Uniquement PL Frigo
  if (vehicle.type === 'POIDS_LOURD_FRIGO') {
    const tachyDate = parseDateSafe(vehicle.tachy_control_date) || ctDate;
    const tachyExpiry = addYears(tachyDate, 2);
    const tachyDaysLeft = differenceInDays(tachyExpiry, today);

    deadlines.push({
      documentCode: 'TACHY',
      documentName: 'Chronotachygraphe',
      expiryDate: format(tachyExpiry, 'yyyy-MM-dd'),
      daysLeft: tachyDaysLeft,
      status: getDeadlineStatus(tachyDaysLeft),
      isMandatory: true,
      equipmentList: null,
      lastDate: vehicle.tachy_control_date,
      frequencyMonths: 24,
    });
  }

  // ATP (36 mois = 3 ans)
  const atpDate = parseDateSafe(vehicle.atp_date) || ctDate;
  const atpExpiry = parseDateSafe(vehicle.atp_expiry) || addMonths(atpDate, 36);
  const atpDaysLeft = differenceInDays(atpExpiry, today);

  deadlines.push({
    documentCode: 'ATP',
    documentName: 'Certificat ATP',
    expiryDate: format(atpExpiry, 'yyyy-MM-dd'),
    daysLeft: atpDaysLeft,
    status: getDeadlineStatus(atpDaysLeft),
    isMandatory: true,
    equipmentList: null,
    lastDate: vehicle.atp_date,
    frequencyMonths: 36,
  });

  // Étalonnage température (12 mois)
  const calibDate = parseDateSafe(lastCalibrationDate) || parseDateSafe(vehicle.frigo_calibration_date) || today;
  const calibExpiry = addYears(calibDate, 1);
  const calibDaysLeft = differenceInDays(calibExpiry, today);

  deadlines.push({
    documentCode: 'ETALONNAGE',
    documentName: 'Étalonnage température',
    expiryDate: format(calibExpiry, 'yyyy-MM-dd'),
    daysLeft: calibDaysLeft,
    status: getDeadlineStatus(calibDaysLeft),
    isMandatory: true,
    equipmentList: [
      'Sondes de température',
      'Enregistreur',
      'Groupe frigorifique',
    ],
    lastDate: lastCalibrationDate || vehicle.frigo_calibration_date || null,
    frequencyMonths: 12,
  });

  return sortDeadlinesByPriority(deadlines);
}

// ============================================
// EXPORTS POUR TESTS
// ============================================

export const _testExports = {
  parseDateSafe,
  sortDeadlinesByPriority,
  mapLegacyToComplianceDeadlines,
  calculateCTLegacy,
  requiresTachyLegacy,
  requiresATPLegacy,
};
