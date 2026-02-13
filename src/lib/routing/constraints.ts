/**
 * Système de contraintes pour l'optimisation des tournées
 * Gère les contraintes métier : distance max, capacités, compétences...
 */

import { Vehicle } from '@/lib/schemas/vehicles';
import { Driver } from '@/lib/schemas/drivers';

export interface RouteConstraints {
  maxDistanceKm: number;           // Distance max par tournée (défaut: 90km)
  maxDurationMinutes: number;      // Durée max par tournée
  startTime: string;               // Heure de départ (format "08:00")
  endTime: string;                 // Heure de retour max (format "18:00")
  maxStops: number;                // Nombre max d'arrêts
  requireRefrigeration: boolean;   // Nécessite véhicule frigorifique
  requireLiftgate: boolean;        // Nécessite hayon élévateur
  requiredCertifications: string[]; // Certifications requises (CQC, ADR, etc.)
  vehicleType?: string;            // Type de véhicule spécifique
  priorityWeight: number;          // Pondération priorité (0-1)
  timeWindowWeight: number;        // Pondération créneaux horaires (0-1)
  distanceWeight: number;          // Pondération distance (0-1)
}

export interface StopConstraint {
  stopId: string;
  requiredSkills?: string[];       // Compétences spécifiques (ex: "frigorifique")
  requiredVehicleType?: string;    // Type de véhicule spécifique pour cet arrêt
  minDriverExperience?: number;    // Années d'expérience minimum
  maxParcelWeight?: number;        // Poids max du colis (kg)
  maxParcelVolume?: number;        // Volume max (m³)
  specialInstructions?: string;    // Instructions spéciales
  mandatoryDriverId?: string;      // Chauffeur obligatoire pour cet arrêt
  prohibitedDriverIds?: string[];  // Chauffeurs interdits pour cet arrêt
}

export interface VehicleCompatibility {
  vehicle: Vehicle;
  score: number;                   // Score de compatibilité 0-100
  reasons: string[];               // Raisons du score
  totalCapacity: {
    weight: number;                // Capacité de charge (kg)
    volume: number;                // Volume (m³)
  };
  suitableForRefrigeration: boolean;
  suitableForLiftgate: boolean;
  autonomyKm: number;              // Autonomie en km
}

export interface DriverCompatibility {
  driver: Driver;
  score: number;                   // Score de compatibilité 0-100
  reasons: string[];               // Raisons du score
  certifications: string[];        // Certifications du chauffeur
  experience: number;              // Années d'expérience
  remainingHours: number;          // Heures de conduite restantes
  preferredZones: string[];        // Zones préférées
}

export interface RouteAssignment {
  vehicle: Vehicle;
  driver: Driver;
  vehicleScore: number;
  driverScore: number;
  totalScore: number;
  warnings: string[];              // Avertissements (ex: "Véhicule bientôt en révision")
}

// Contraintes par défaut
export const DEFAULT_CONSTRAINTS: RouteConstraints = {
  maxDistanceKm: 1000,             // 1000km - très grande distance autorisée
  maxDurationMinutes: 600,         // 10 heures (temps de conduite réglementaire)
  startTime: "08:00",
  endTime: "18:00",
  maxStops: 50,                    // Plus d'arrêts possibles
  requireRefrigeration: false,
  requireLiftgate: false,
  requiredCertifications: [],
  priorityWeight: 0.3,
  timeWindowWeight: 0.4,
  distanceWeight: 0.3,
};

/**
 * Calcule la compatibilité d'un véhicule avec les contraintes
 */
export function calculateVehicleCompatibility(
  vehicle: Vehicle,
  constraints: RouteConstraints,
  stopConstraints: StopConstraint[]
): VehicleCompatibility {
  let score = 100;
  const reasons: string[] = [];
  
  // Vérifier si le véhicule est disponible
  if (vehicle.status !== 'ACTIVE') {
    score -= 50;
    reasons.push('Véhicule non disponible');
  }
  
  // Vérifier réfrigération si nécessaire
  const needsRefrigeration = constraints.requireRefrigeration || 
    stopConstraints.some(s => s.requiredSkills?.includes('refrigerated'));
  
  const hasRefrigeration = vehicle.category === 'FRIGORIFIQUE' || 
    (vehicle as any).has_refrigeration;
  
  if (needsRefrigeration && !hasRefrigeration) {
    score -= 100;
    reasons.push('Véhicule non réfrigéré');
  } else if (hasRefrigeration) {
    reasons.push('✓ Réfrigération disponible');
  }
  
  // Vérifier hayon élévateur
  const needsLiftgate = constraints.requireLiftgate ||
    stopConstraints.some(s => s.requiredSkills?.includes('liftgate'));
  
  const hasLiftgate = (vehicle as any).has_liftgate;
  
  if (needsLiftgate && !hasLiftgate) {
    score -= 30;
    reasons.push('Pas de hayon élévateur');
  } else if (hasLiftgate) {
    reasons.push('✓ Hayon élévateur');
  }
  
  // Vérifier type de véhicule spécifique
  if (constraints.vehicleType && vehicle.category !== constraints.vehicleType) {
    score -= 40;
    reasons.push(`Type ${constraints.vehicleType} requis`);
  }
  
  // Capacité estimée basée sur la catégorie
  const capacityMap: Record<string, { weight: number; volume: number }> = {
    'UTILITAIRE_LEGER': { weight: 1000, volume: 8 },
    'UTILITAIRE_MOYEN': { weight: 3500, volume: 20 },
    'PORTEUR': { weight: 12000, volume: 50 },
    'TRACTEUR': { weight: 25000, volume: 90 },
    'FRIGORIFIQUE': { weight: 3500, volume: 18 },
    'BENNE': { weight: 12000, volume: 15 },
  };
  
  const totalCapacity = capacityMap[vehicle.category] || { weight: 3500, volume: 20 };
  
  // Vérifier capacité vs besoins
  const maxWeightNeeded = Math.max(...stopConstraints.map(s => s.maxParcelWeight || 0), 0);
  const maxVolumeNeeded = Math.max(...stopConstraints.map(s => s.maxParcelVolume || 0), 0);
  
  if (maxWeightNeeded > totalCapacity.weight) {
    score -= 100;
    reasons.push('Capacité de charge insuffisante');
  }
  
  if (maxVolumeNeeded > totalCapacity.volume) {
    score -= 100;
    reasons.push('Volume insuffisant');
  }
  
  // Autonomie estimée
  const autonomyKm = vehicle.fuel_type === 'ELECTRIC' ? 200 : 800;
  
  if (autonomyKm < constraints.maxDistanceKm * 1.5) {
    score -= 10;
    reasons.push('Autonomie limitée');
  }
  
  // Alertes maintenance/assurance
  const today = new Date();
  const maintenanceDate = vehicle.next_maintenance ? new Date(vehicle.next_maintenance) : null;
  const insuranceDate = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null;
  
  if (maintenanceDate && maintenanceDate < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    score -= 15;
    reasons.push('⚠ Maintenance proche');
  }
  
  if (insuranceDate && insuranceDate < new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)) {
    score -= 15;
    reasons.push('⚠ Assurance expire bientôt');
  }
  
  return {
    vehicle,
    score: Math.max(0, score),
    reasons,
    totalCapacity,
    suitableForRefrigeration: !needsRefrigeration || hasRefrigeration,
    suitableForLiftgate: !needsLiftgate || hasLiftgate,
    autonomyKm,
  };
}

/**
 * Calcule la compatibilité d'un chauffeur avec les contraintes
 */
export function calculateDriverCompatibility(
  driver: Driver,
  constraints: RouteConstraints,
  stopConstraints: StopConstraint[],
  totalDistanceKm: number
): DriverCompatibility {
  let score = 100;
  const reasons: string[] = [];
  const certifications: string[] = [];
  
  // Vérifier si le chauffeur est disponible
  if (driver.status !== 'ACTIVE') {
    score -= 50;
    reasons.push('Chauffeur non disponible');
  }
  
  // Calculer l'expérience
  const experience = driver.hire_date 
    ? Math.floor((new Date().getTime() - new Date(driver.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : 0;
  
  if (experience > 2) {
    reasons.push(`✓ ${experience} ans d'expérience`);
  }
  
  // Vérifier certifications requises
  if (driver.cqc_card) {
    certifications.push('CQC');
    
    const cqcExpiry = driver.cqc_card_expiry ? new Date(driver.cqc_card_expiry) : null;
    if (cqcExpiry && cqcExpiry < new Date()) {
      score -= 100;
      reasons.push('CQC expiré');
    } else if (cqcExpiry && cqcExpiry < new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)) {
      score -= 20;
      reasons.push('⚠ CQC expire bientôt');
    }
  } else if (constraints.requiredCertifications.includes('CQC')) {
    score -= 100;
    reasons.push('CQC requis');
  }
  
  // Vérifier permis
  if (driver.license_expiry) {
    const licenseExpiry = new Date(driver.license_expiry);
    if (licenseExpiry < new Date()) {
      score -= 100;
      reasons.push('Permis expiré');
    } else if (licenseExpiry < new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)) {
      score -= 20;
      reasons.push('⚠ Permis expire bientôt');
    }
  }
  
  // Vérifier expérience minimum requise par arrêt
  const maxExperienceRequired = Math.max(...stopConstraints.map(s => s.minDriverExperience || 0), 0);
  if (experience < maxExperienceRequired) {
    score -= 30;
    reasons.push(`Expérience insuffisante (${experience}/${maxExperienceRequired} ans)`);
  } else if (maxExperienceRequired > 0) {
    reasons.push('✓ Expérience suffisante');
  }
  
  // Vérifier si chauffeur interdit sur certains arrêts
  const prohibitedStops = stopConstraints.filter(s => 
    s.prohibitedDriverIds?.includes(driver.id)
  );
  if (prohibitedStops.length > 0) {
    score -= 100;
    reasons.push('Chauffeur interdit sur certains arrêts');
  }
  
  // Estimer heures restantes (simplifié)
  const estimatedHours = totalDistanceKm / 50 + stopConstraints.length * 0.5; // 50km/h moyenne + arrêts
  const remainingHours = 9 - estimatedHours; // Supposons 9h max par jour
  
  if (remainingHours < 0) {
    score -= 30;
    reasons.push('Temps de conduite élevé');
  }
  
  return {
    driver,
    score: Math.max(0, score),
    reasons,
    certifications,
    experience,
    remainingHours,
    preferredZones: [], // À récupérer depuis la DB si besoin
  };
}

/**
 * Trouve le meilleur couple véhicule/chauffeur
 */
export function findBestAssignment(
  vehicles: Vehicle[],
  drivers: Driver[],
  constraints: RouteConstraints,
  stopConstraints: StopConstraint[],
  estimatedDistanceKm: number = 50
): RouteAssignment | null {
  const vehicleCompatibilities = vehicles.map(v => 
    calculateVehicleCompatibility(v, constraints, stopConstraints)
  );
  
  const driverCompatibilities = drivers.map(d => 
    calculateDriverCompatibility(d, constraints, stopConstraints, estimatedDistanceKm)
  );
  
  let bestAssignment: RouteAssignment | null = null;
  let bestScore = -1;
  
  // Tester toutes les combinaisons
  for (const vComp of vehicleCompatibilities) {
    for (const dComp of driverCompatibilities) {
      // Calculer score combiné
      const totalScore = (vComp.score + dComp.score) / 2;
      
      const warnings: string[] = [];
      
      // Avertissements combinés
      if (vComp.score < 80) {
        warnings.push(`Véhicule: ${vComp.reasons.filter(r => r.includes('⚠')).join(', ')}`);
      }
      if (dComp.score < 80) {
        warnings.push(`Chauffeur: ${dComp.reasons.filter(r => r.includes('⚠')).join(', ')}`);
      }
      
      if (totalScore > bestScore && vComp.score > 0 && dComp.score > 0) {
        bestScore = totalScore;
        bestAssignment = {
          vehicle: vComp.vehicle,
          driver: dComp.driver,
          vehicleScore: vComp.score,
          driverScore: dComp.score,
          totalScore,
          warnings,
        };
      }
    }
  }
  
  return bestAssignment;
}

/**
 * Vérifie si une tournée respecte toutes les contraintes
 */
export function validateRouteConstraints(
  totalDistanceKm: number,
  totalDurationMinutes: number,
  stopsCount: number,
  constraints: RouteConstraints
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (totalDistanceKm > constraints.maxDistanceKm) {
    violations.push(`Distance ${totalDistanceKm.toFixed(1)}km > max ${constraints.maxDistanceKm}km`);
  }
  
  if (totalDurationMinutes > constraints.maxDurationMinutes) {
    violations.push(`Durée ${Math.floor(totalDurationMinutes/60)}h${totalDurationMinutes%60}min > max ${Math.floor(constraints.maxDurationMinutes/60)}h`);
  }
  
  if (stopsCount > constraints.maxStops) {
    violations.push(`${stopsCount} arrêts > max ${constraints.maxStops}`);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Calcule le score d'optimisation d'une séquence d'arrêts
 * Plus le score est élevé, mieux c'est
 */
export function calculateOptimizationScore(
  stops: Array<{
    orderIndex: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
    timeWindowStart?: string;
    timeWindowEnd?: string;
    estimatedArrival?: string;
  }>,
  totalDistanceKm: number,
  constraints: RouteConstraints
): number {
  let score = 100;
  
  // Pénalité distance (0-40 points)
  const distanceRatio = totalDistanceKm / constraints.maxDistanceKm;
  score -= distanceRatio * 40 * constraints.distanceWeight;
  
  // Bonus/Malus priorité (0-30 points)
  stops.forEach((stop, index) => {
    const priorityBonus = {
      'HIGH': 10,
      'NORMAL': 5,
      'LOW': 0,
    }[stop.priority || 'NORMAL'];
    
    // Plus l'arrêt prioritaire est tôt, mieux c'est
    score += priorityBonus * (1 - index / stops.length) * constraints.priorityWeight;
  });
  
  // Respect créneaux horaires (0-30 points)
  let timeWindowViolations = 0;
  stops.forEach(stop => {
    if (stop.timeWindowStart && stop.estimatedArrival) {
      const [startHour, startMin] = stop.timeWindowStart.split(':').map(Number);
      const [arrivalHour, arrivalMin] = stop.estimatedArrival.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const arrivalMinutes = arrivalHour * 60 + arrivalMin;
      
      if (arrivalMinutes < startMinutes - 15) { // Arrivée trop tôt (attente > 15min)
        timeWindowViolations++;
      } else if (arrivalMinutes > startMinutes + 30) { // Arrivée en retard (> 30min)
        timeWindowViolations += 2;
      }
    }
  });
  
  score -= timeWindowViolations * 10 * constraints.timeWindowWeight;
  
  return Math.max(0, Math.round(score));
}
