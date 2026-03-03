/**
 * Vitesses moyennes par type de véhicule
 * Utilisé pour calculer les temps de trajet réalistes
 */

export type VehicleCategory = 
  | 'UTILITAIRE_LEGER' 
  | 'UTILITAIRE_MOYEN' 
  | 'PORTEUR' 
  | 'TRACTEUR' 
  | 'FRIGORIFIQUE' 
  | 'BENNE' 
  | 'PLATEAU';

interface SpeedProfile {
  urban: number;      // Ville (km/h)
  suburban: number;   // Périphérie (km/h)
  highway: number;    // Autoroute (km/h)
  description: string;
}

// Vitesses moyennes réalistes par catégorie
export const VEHICLE_SPEED_PROFILES: Record<VehicleCategory, SpeedProfile> = {
  UTILITAIRE_LEGER: {
    urban: 35,
    suburban: 60,
    highway: 110,
    description: 'VL - Pas de limitation spéciale',
  },
  UTILITAIRE_MOYEN: {
    urban: 30,
    suburban: 55,
    highway: 100,
    description: 'VUL - Limité à 100-110 sur autoroute',
  },
  PORTEUR: {
    urban: 25,
    suburban: 50,
    highway: 90,
    description: 'PL - Limité à 90 km/h sur autoroute',
  },
  TRACTEUR: {
    urban: 22,
    suburban: 45,
    highway: 90,
    description: 'Semi-remorque - Limité à 80-90 km/h',
  },
  FRIGORIFIQUE: {
    urban: 28,
    suburban: 52,
    highway: 90,
    description: 'Frigo - Limité à 90 km/h (souvent PL)',
  },
  BENNE: {
    urban: 24,
    suburban: 48,
    highway: 90,
    description: 'Benne - Limité à 90 km/h',
  },
  PLATEAU: {
    urban: 25,
    suburban: 50,
    highway: 90,
    description: 'Plateau - Limité à 90 km/h',
  },
};

// Vitesses par défaut si catégorie inconnue
const DEFAULT_SPEEDS = {
  urban: 30,
  suburban: 55,
  highway: 100,
};

/**
 * Calcule une vitesse moyenne pondérée selon le contexte
 * Urban: 30%, Suburban: 30%, Highway: 40%
 */
export function calculateAverageSpeed(category: VehicleCategory | string): number {
  const profile = VEHICLE_SPEED_PROFILES[category as VehicleCategory] || DEFAULT_SPEEDS;
  
  // Moyenne pondérée : plus de temps en ville/périphérie qu'en autoroute pour une tournée
  return Math.round(
    profile.urban * 0.35 +      // 35% en ville
    profile.suburban * 0.35 +   // 35% en périphérie  
    profile.highway * 0.30      // 30% sur autoroute
  );
}

/**
 * Estime le temps de trajet en minutes selon le véhicule
 */
export function estimateTravelTime(
  distanceKm: number, 
  vehicleCategory: VehicleCategory | string
): number {
  const avgSpeed = calculateAverageSpeed(vehicleCategory);
  // temps (h) = distance / vitesse, converti en minutes
  return Math.round((distanceKm / avgSpeed) * 60);
}

/**
 * Compare le temps de trajet entre deux types de véhicules
 */
export function compareTravelTimes(
  distanceKm: number,
  category1: VehicleCategory | string,
  category2: VehicleCategory | string
): { 
  vehicle1: { category: string; timeMinutes: number };
  vehicle2: { category: string; timeMinutes: number };
  differenceMinutes: number;
  percentageSlower: number;
} {
  const time1 = estimateTravelTime(distanceKm, category1);
  const time2 = estimateTravelTime(distanceKm, category2);
  
  return {
    vehicle1: {
      category: category1 as string,
      timeMinutes: time1,
    },
    vehicle2: {
      category: category2 as string,
      timeMinutes: time2,
    },
    differenceMinutes: Math.abs(time2 - time1),
    percentageSlower: Math.round(((Math.max(time1, time2) - Math.min(time1, time2)) / Math.min(time1, time2)) * 100),
  };
}

/**
 * Retourne les détails de vitesse pour affichage
 */
export function getSpeedDetails(category: VehicleCategory | string): {
  average: number;
  highway: number;
  urban: number;
  description: string;
} {
  const profile = VEHICLE_SPEED_PROFILES[category as VehicleCategory] || DEFAULT_SPEEDS;
  
  return {
    average: calculateAverageSpeed(category),
    highway: profile.highway,
    urban: profile.urban,
    description: profile.description,
  };
}

/**
 * Détermine si un véhicule est un poids lourd (> 3.5t)
 */
export function isHeavyVehicle(category: VehicleCategory | string): boolean {
  const heavyCategories = ['PORTEUR', 'TRACTEUR', 'FRIGORIFIQUE', 'BENNE', 'PLATEAU'];
  return heavyCategories.includes(category as string);
}

/**
 * Estime la consommation de carburant selon le type de véhicule
 * en L/100km
 */
export function estimateFuelConsumption(category: VehicleCategory | string): number {
  const consumption: Record<VehicleCategory, number> = {
    UTILITAIRE_LEGER: 8,
    UTILITAIRE_MOYEN: 12,
    PORTEUR: 25,
    TRACTEUR: 32,
    FRIGORIFIQUE: 28,
    BENNE: 30,
    PLATEAU: 26,
  };
  
  return consumption[category as VehicleCategory] || 20;
}

/**
 * Calcule le coût carburant estimé
 */
export function estimateFuelCost(
  distanceKm: number,
  category: VehicleCategory | string,
  fuelPricePerLiter: number = 1.80
): number {
  const consumption = estimateFuelConsumption(category);
  const litersNeeded = (distanceKm * consumption) / 100;
  return Math.round(litersNeeded * fuelPricePerLiter * 100) / 100;
}
