/**
 * Module de conformité réglementaire
 * Gestion des échéances ADR, Frigo, et autres activités spéciales
 * 
 * Usage:
 * ```typescript
 * import { getVehicleComplianceDeadlines } from '@/lib/compliance';
 * 
 * const deadlines = await getVehicleComplianceDeadlines(vehicle, companyId, supabase);
 * ```
 */

export {
  // Fonctions principales
  getVehicleComplianceDeadlines,
  getVehicleCurrentActivity,
  getComplianceRulesByActivity,
  calculateDeadlinesByActivity,
  
  // Fonctions de calcul direct (sans DB)
  calculateADRDeadlines,
  calculateFrigoDeadlines,
  
  // Utilitaires
  getDeadlineStatus,
  
  // Types
  type TransportActivity,
  type VehicleType,
  type ComplianceDeadline,
  type VehicleComplianceData,
} from './calculate-deadlines';
