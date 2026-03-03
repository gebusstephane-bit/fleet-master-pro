/**
 * Réglementation RSE (Règlement Social Européen) pour les conducteurs
 * Gestion des temps de conduite et pauses obligatoires
 */

import { addMinutes, format } from 'date-fns';

export interface DrivingPeriod {
  type: 'DRIVING' | 'BREAK' | 'REST' | 'SERVICE';
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  durationMinutes: number;
  description: string;
}

export interface RSEResult {
  isCompliant: boolean;
  periods: DrivingPeriod[];
  totalDrivingTime: number;      // minutes
  totalBreakTime: number;        // minutes
  breakRequired: boolean;        // pause nécessaire ?
  breakLocation?: {              // où faire la pause
    afterStopIndex: number;
    estimatedTime: string;
    location: string;
  };
  warnings: string[];
  violations: string[];
}

// Constantes RSE
const RSE_LIMITS = {
  MAX_CONTINUOUS_DRIVING: 270,     // 4h30 = 270 minutes
  MIN_BREAK_DURATION: 45,          // 45 minutes
  DAILY_DRIVING_LIMIT: 540,        // 9h par jour (peut être étendu à 10h)
  WEEKLY_DRIVING_LIMIT: 3240,      // 56h par semaine
};

/**
 * Calcule les périodes de conduite avec pauses RSE
 */
export function calculateRSECompliance(
  drivingSegments: Array<{
    from: string;           // nom du point de départ
    to: string;             // nom du point d'arrivée
    drivingMinutes: number; // temps de conduite pur
    stopDuration?: number;  // durée de l'arrêt (si applicable)
  }>,
  startTime: string,        // "08:00"
  vehicleCategory: string,
  isHeavyVehicle: boolean   // true pour PL
): RSEResult {
  const periods: DrivingPeriod[] = [];
  let currentTime = timeToMinutes(startTime);
  let accumulatedDriving = 0;
  let totalDriving = 0;
  let totalBreak = 0;
  const warnings: string[] = [];
  const violations: string[] = [];
  let breakLocation: RSEResult['breakLocation'] | undefined;
  let breakRequired = false;

  // Pour les véhicules légers, pas de contrainte RSE stricte
  if (!isHeavyVehicle) {
    for (const segment of drivingSegments) {
      const segmentStart = currentTime;
      currentTime += segment.drivingMinutes;
      if (segment.stopDuration) {
        currentTime += segment.stopDuration;
      }
      
      periods.push({
        type: 'DRIVING',
        startTime: minutesToTime(segmentStart),
        endTime: minutesToTime(currentTime - (segment.stopDuration || 0)),
        durationMinutes: segment.drivingMinutes,
        description: `${segment.from} → ${segment.to}`,
      });

      if (segment.stopDuration) {
        periods.push({
          type: 'SERVICE',
          startTime: minutesToTime(currentTime - segment.stopDuration),
          endTime: minutesToTime(currentTime),
          durationMinutes: segment.stopDuration,
          description: `Arrêt: ${segment.to}`,
        });
      }
    }

    return {
      isCompliant: true,
      periods,
      totalDrivingTime: totalDriving,
      totalBreakTime: totalBreak,
      breakRequired: false,
      warnings: [],
      violations: [],
    };
  }

  // Pour les PL : respecter RSE 4h30 + 45min
  for (let i = 0; i < drivingSegments.length; i++) {
    const segment = drivingSegments[i];
    const segmentDrivingTime = segment.drivingMinutes;
    
    // Vérifier si on dépasse les 4h30 avec ce segment
    if (accumulatedDriving + segmentDrivingTime > RSE_LIMITS.MAX_CONTINUOUS_DRIVING) {
      // Calculer le temps de conduite restant avant la pause
      const remainingBeforeBreak = RSE_LIMITS.MAX_CONTINUOUS_DRIVING - accumulatedDriving;
      
      if (remainingBeforeBreak > 0) {
        // Ajouter la portion de conduite avant pause
        const drivingStart = currentTime;
        currentTime += remainingBeforeBreak;
        accumulatedDriving += remainingBeforeBreak;
        totalDriving += remainingBeforeBreak;
        
        periods.push({
          type: 'DRIVING',
          startTime: minutesToTime(drivingStart),
          endTime: minutesToTime(currentTime),
          durationMinutes: remainingBeforeBreak,
          description: `${segment.from} → ${segment.to} (avant pause)`,
        });
      }
      
      // Déterminer où faire la pause
      // Si l'arrêt suivant dure assez longtemps, on peut le faire là
      if (segment.stopDuration && segment.stopDuration >= RSE_LIMITS.MIN_BREAK_DURATION) {
        // La pause peut être effectuée à cet arrêt
        const breakStart = currentTime;
        currentTime += segment.stopDuration;
        totalBreak += segment.stopDuration;
        accumulatedDriving = 0;
        
        periods.push({
          type: 'BREAK',
          startTime: minutesToTime(breakStart),
          endTime: minutesToTime(currentTime),
          durationMinutes: segment.stopDuration,
          description: `PAUSE RSE obligatoire à ${segment.to} (${Math.floor(segment.stopDuration/60)}h${segment.stopDuration%60}min)`,
        });
        
        // Ajouter le reste du trajet si nécessaire
        const remainingDriving = segmentDrivingTime - remainingBeforeBreak;
        if (remainingDriving > 0) {
          const continueStart = currentTime;
          currentTime += remainingDriving;
          accumulatedDriving = remainingDriving;
          totalDriving += remainingDriving;
          
          periods.push({
            type: 'DRIVING',
            startTime: minutesToTime(continueStart),
            endTime: minutesToTime(currentTime),
            durationMinutes: remainingDriving,
            description: `${segment.from} → ${segment.to} (reprise)`,
          });
        }
      } else {
        // Il faut ajouter une pause obligatoire
        breakRequired = true;
        breakLocation = {
          afterStopIndex: i,
          estimatedTime: minutesToTime(currentTime),
          location: segment.to,
        };
        
        warnings.push(`⚠️ PAUSE RSE OBLIGATOIRE: 45 min à ${segment.to} après ${formatDuration(RSE_LIMITS.MAX_CONTINUOUS_DRIVING)} de conduite`);
        
        // Ajouter la pause
        const breakStart = currentTime;
        currentTime += RSE_LIMITS.MIN_BREAK_DURATION;
        totalBreak += RSE_LIMITS.MIN_BREAK_DURATION;
        accumulatedDriving = 0;
        
        periods.push({
          type: 'BREAK',
          startTime: minutesToTime(breakStart),
          endTime: minutesToTime(currentTime),
          durationMinutes: RSE_LIMITS.MIN_BREAK_DURATION,
          description: `PAUSE RSE obligatoire (${RSE_LIMITS.MIN_BREAK_DURATION}min)`,
        });
        
        // Continuer le trajet après pause
        const remainingDriving = segmentDrivingTime - remainingBeforeBreak;
        if (remainingDriving > 0) {
          const continueStart = currentTime;
          currentTime += remainingDriving;
          accumulatedDriving = remainingDriving;
          totalDriving += remainingDriving;
          
          periods.push({
            type: 'DRIVING',
            startTime: minutesToTime(continueStart),
            endTime: minutesToTime(currentTime),
            durationMinutes: remainingDriving,
            description: `${segment.from} → ${segment.to} (reprise après pause)`,
          });
        }
        
        // Ajouter l'arrêt de livraison s'il existe
        if (segment.stopDuration) {
          const serviceStart = currentTime;
          currentTime += segment.stopDuration;
          
          periods.push({
            type: 'SERVICE',
            startTime: minutesToTime(serviceStart),
            endTime: minutesToTime(currentTime),
            durationMinutes: segment.stopDuration,
            description: `Livraison: ${segment.to}`,
          });
        }
      }
    } else {
      // Pas de dépassement des 4h30, conduite normale
      const drivingStart = currentTime;
      currentTime += segmentDrivingTime;
      accumulatedDriving += segmentDrivingTime;
      totalDriving += segmentDrivingTime;
      
      periods.push({
        type: 'DRIVING',
        startTime: minutesToTime(drivingStart),
        endTime: minutesToTime(currentTime),
        durationMinutes: segmentDrivingTime,
        description: `${segment.from} → ${segment.to}`,
      });
      
      // Ajouter l'arrêt de livraison
      if (segment.stopDuration) {
        // Si l'arrêt dure plus de 45min, ça compte comme une pause
        if (segment.stopDuration >= RSE_LIMITS.MIN_BREAK_DURATION && accumulatedDriving > 180) {
          periods.push({
            type: 'BREAK',
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(currentTime + segment.stopDuration),
            durationMinutes: segment.stopDuration,
            description: `Livraison + PAUSE RSE: ${segment.to}`,
          });
          accumulatedDriving = 0;
        } else {
          periods.push({
            type: 'SERVICE',
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(currentTime + segment.stopDuration),
            durationMinutes: segment.stopDuration,
            description: `Livraison: ${segment.to}`,
          });
        }
        currentTime += segment.stopDuration;
      }
    }
    
    // Vérifier limite journalière 9h
    if (totalDriving > RSE_LIMITS.DAILY_DRIVING_LIMIT) {
      violations.push(`⚠️ DÉPASSEMENT: ${formatDuration(totalDriving)} de conduite > limite 9h journalière`);
    }
  }
  
  // Vérifier si une pause est encore nécessaire à la fin
  if (accumulatedDriving >= RSE_LIMITS.MAX_CONTINUOUS_DRIVING) {
    warnings.push(`⚠️ Le chauffeur doit faire une pause de 45 min avant de reprendre`);
    breakRequired = true;
  }
  
  return {
    isCompliant: violations.length === 0,
    periods,
    totalDrivingTime: totalDriving,
    totalBreakTime: totalBreak,
    breakRequired,
    breakLocation,
    warnings,
    violations,
  };
}

/**
 * Estime où le chauffeur devrait faire sa pause RSE
 */
export function estimateBreakLocation(
  stops: Array<{
    address: string;
    serviceDuration: number;
    arrivalTime?: string;
  }>,
  drivingSegments: Array<{ drivingMinutes: number }>,
  startTime: string
): { stopIndex: number; address: string; time: string } | null {
  let accumulatedDriving = 0;
  let currentTime = timeToMinutes(startTime);
  
  for (let i = 0; i < drivingSegments.length; i++) {
    accumulatedDriving += drivingSegments[i].drivingMinutes;
    
    if (stops[i]) {
      currentTime += drivingSegments[i].drivingMinutes;
      
      // Si on approche des 4h30 et que l'arrêt dure assez longtemps
      if (accumulatedDriving >= 240 && stops[i].serviceDuration >= 45) {
        return {
          stopIndex: i,
          address: stops[i].address,
          time: minutesToTime(currentTime),
        };
      }
      
      // Si on dépasse les 4h30
      if (accumulatedDriving >= RSE_LIMITS.MAX_CONTINUOUS_DRIVING) {
        return {
          stopIndex: i,
          address: stops[i].address,
          time: minutesToTime(currentTime),
        };
      }
      
      currentTime += stops[i].serviceDuration;
    }
  }
  
  return null;
}

// Helpers
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/**
 * Vérifie si le temps de conduite respecte les limites RSE
 */
export function validateRSE(
  totalDrivingMinutes: number,
  continuousDrivingMinutes: number,
  breaksTaken: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 4h30 de conduite continue max
  if (continuousDrivingMinutes > RSE_LIMITS.MAX_CONTINUOUS_DRIVING) {
    errors.push(`Conduite continue: ${formatDuration(continuousDrivingMinutes)} > limite ${formatDuration(RSE_LIMITS.MAX_CONTINUOUS_DRIVING)}`);
  }
  
  // 9h journalière
  if (totalDrivingMinutes > RSE_LIMITS.DAILY_DRIVING_LIMIT) {
    errors.push(`Temps de conduite journalier: ${formatDuration(totalDrivingMinutes)} > limite 9h`);
  }
  
  // Pause de 45min après 4h30
  if (continuousDrivingMinutes >= RSE_LIMITS.MAX_CONTINUOUS_DRIVING && breaksTaken < RSE_LIMITS.MIN_BREAK_DURATION) {
    errors.push(`Pause obligatoire de 45 min non respectée`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export { RSE_LIMITS, formatDuration };
