/**
 * Optimiseur de tournées avancé V2
 * Algorithme avec contraintes métier, vitesses par véhicule et RSE
 */

import { RouteConstraints, StopConstraint, validateRouteConstraints, calculateOptimizationScore } from './constraints';
import { DEFAULT_CONSTRAINTS } from './constraints';
import { calculateAverageSpeed, estimateTravelTime, isHeavyVehicle, VehicleCategory } from './vehicle-speeds';
import { calculateRSECompliance, estimateBreakLocation, formatDuration, RSE_LIMITS, RSEResult } from './rse-regulations';

export interface Stop {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  serviceDuration: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  constraints?: StopConstraint;
}

export interface OptimizedRoute {
  stops: Stop[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  startTime: string;
  endTime: string;
  score: number;
  feasible: boolean;
  violations: string[];
  estimatedArrivals: Array<{
    stopId: string;
    arrivalTime: string;
    departureTime: string;
  }>;
  vehicleCategory?: string;
  averageSpeed: number;
  rseCompliance?: RSEResult;  // Informations RSE
  isHeavyVehicle: boolean;
}

interface Point {
  latitude: number;
  longitude: number;
}

// Calcul distance Haversine (km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Vérifier si un stop a des coordonnées valides
function hasValidCoords(stop: Stop): boolean {
  return typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && 
         !isNaN(stop.latitude) && !isNaN(stop.longitude);
}

// Convertir "HH:MM" en minutes depuis minuit
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

// Convertir minutes en "HH:MM"
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculer la distance totale
function calculateTotalDistance(stops: Stop[], depot: Point): number {
  if (stops.length === 0) return 0;
  
  let total = haversine(depot.latitude, depot.longitude, stops[0].latitude, stops[0].longitude);
  
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversine(
      stops[i].latitude, stops[i].longitude,
      stops[i + 1].latitude, stops[i + 1].longitude
    );
  }
  
  // Retour au dépôt
  total += haversine(
    stops[stops.length - 1].latitude, stops[stops.length - 1].longitude,
    depot.latitude, depot.longitude
  );
  
  return total;
}

// Algorithme principal avec RSE
export function optimizeRouteV2(
  stops: Stop[],
  depot: Point,
  constraints: Partial<RouteConstraints> = {},
  vehicleCategory: VehicleCategory | string = 'UTILITAIRE_MOYEN'
): OptimizedRoute {
  const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const heavy = isHeavyVehicle(vehicleCategory);
  
  // Filtrer les stops valides
  const validStops = stops.filter(hasValidCoords);
  
  if (validStops.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      startTime: mergedConstraints.startTime,
      endTime: mergedConstraints.startTime,
      score: 0,
      feasible: true,
      violations: [],
      estimatedArrivals: [],
      vehicleCategory,
      averageSpeed: calculateAverageSpeed(vehicleCategory),
      isHeavyVehicle: heavy,
    };
  }
  
  // Calculer les segments de conduite
  const drivingSegments: Array<{
    from: string;
    to: string;
    drivingMinutes: number;
    stopDuration: number;
  }> = [];
  
  // Dépot -> Premier arrêt
  const firstDistance = haversine(depot.latitude, depot.longitude, validStops[0].latitude, validStops[0].longitude);
  drivingSegments.push({
    from: 'Dépôt',
    to: validStops[0].address,
    drivingMinutes: estimateTravelTime(firstDistance, vehicleCategory),
    stopDuration: validStops[0].serviceDuration,
  });
  
  // Entre les arrêts
  for (let i = 0; i < validStops.length - 1; i++) {
    const distance = haversine(
      validStops[i].latitude, validStops[i].longitude,
      validStops[i + 1].latitude, validStops[i + 1].longitude
    );
    drivingSegments.push({
      from: validStops[i].address,
      to: validStops[i + 1].address,
      drivingMinutes: estimateTravelTime(distance, vehicleCategory),
      stopDuration: validStops[i + 1].serviceDuration,
    });
  }
  
  // Dernier arrêt -> Dépôt
  const lastDistance = haversine(
    validStops[validStops.length - 1].latitude, validStops[validStops.length - 1].longitude,
    depot.latitude, depot.longitude
  );
  drivingSegments.push({
    from: validStops[validStops.length - 1].address,
    to: 'Dépôt',
    drivingMinutes: estimateTravelTime(lastDistance, vehicleCategory),
    stopDuration: 0,
  });
  
  // Calculer la conformité RSE
  const rseResult = calculateRSECompliance(
    drivingSegments,
    mergedConstraints.startTime,
    vehicleCategory,
    heavy
  );
  
  // Calculer les statistiques finales
  const totalDistance = calculateTotalDistance(validStops, depot);
  const totalDuration = rseResult.periods.reduce((sum, p) => sum + p.durationMinutes, 0);
  
  // Extraire les arrivées estimées
  const estimatedArrivals: Array<{ stopId: string; arrivalTime: string; departureTime: string }> = [];
  let stopIndex = 0;
  
  for (const period of rseResult.periods) {
    if (period.type === 'SERVICE' || period.type === 'BREAK') {
      const stop = validStops[stopIndex];
      if (stop) {
        estimatedArrivals.push({
          stopId: stop.id,
          arrivalTime: period.startTime,
          departureTime: period.endTime,
        });
        if (period.type === 'SERVICE') {
          stopIndex++;
        }
      }
    }
  }
  
  // Calculer l'heure de fin
  const lastPeriod = rseResult.periods[rseResult.periods.length - 1];
  const endTime = lastPeriod ? lastPeriod.endTime : mergedConstraints.startTime;
  
  // Validation des contraintes
  const validation = validateRouteConstraints(
    totalDistance,
    totalDuration,
    validStops.length,
    mergedConstraints
  );
  
  // Ajouter les violations RSE
  const allViolations = [...validation.violations, ...rseResult.violations];
  
  // Calculer le score
  const score = calculateOptimizationScore(
    validStops.map((s, i) => ({
      orderIndex: i,
      priority: s.priority,
      timeWindowStart: s.timeWindowStart,
      timeWindowEnd: s.timeWindowEnd,
      estimatedArrival: estimatedArrivals[i]?.arrivalTime,
    })),
    totalDistance,
    mergedConstraints
  );
  
  return {
    stops: validStops,
    totalDistanceKm: Math.round(totalDistance * 10) / 10,
    totalDurationMinutes: totalDuration,
    startTime: mergedConstraints.startTime,
    endTime,
    score,
    feasible: validation.valid && rseResult.isCompliant,
    violations: allViolations,
    estimatedArrivals,
    vehicleCategory,
    averageSpeed: calculateAverageSpeed(vehicleCategory),
    rseCompliance: rseResult,
    isHeavyVehicle: heavy,
  };
}

// Fonction legacy
export function optimizeRoute(
  stops: Stop[],
  depot: Point,
  vehicleCategory?: VehicleCategory | string
): Stop[] {
  const result = optimizeRouteV2(stops, depot, {}, vehicleCategory);
  return result.stops;
}

// Calculer les stats
export function calculateRouteStats(
  stops: Stop[],
  depot: Point,
  startTime: string = "08:00",
  vehicleCategory: VehicleCategory | string = 'UTILITAIRE_MOYEN'
): { totalDistance: number; totalDuration: number; fuelCost: number; endTime: string; averageSpeed: number } {
  const result = optimizeRouteV2(stops, depot, { startTime }, vehicleCategory);
  
  return {
    totalDistance: result.totalDistanceKm,
    totalDuration: result.totalDurationMinutes,
    fuelCost: Math.round(result.totalDistanceKm * 0.15 * 100) / 100,
    endTime: result.endTime,
    averageSpeed: result.averageSpeed,
  };
}

// Suggérer la meilleure heure de départ
export function suggestOptimalStartTime(
  stops: Stop[],
  depot: Point,
  constraints: RouteConstraints,
  vehicleCategory: VehicleCategory | string = 'UTILITAIRE_MOYEN'
): { startTime: string; score: number; violations: string[] } {
  const possibleStartTimes = ["06:00", "07:00", "08:00", "09:00"];
  let bestStartTime = constraints.startTime;
  let bestScore = -1;
  let bestViolations: string[] = [];
  
  for (const startTime of possibleStartTimes) {
    const result = optimizeRouteV2(stops, depot, { ...constraints, startTime }, vehicleCategory);
    
    if (result.score > bestScore) {
      bestScore = result.score;
      bestStartTime = startTime;
      bestViolations = result.violations;
    }
  }
  
  return {
    startTime: bestStartTime,
    score: bestScore,
    violations: bestViolations,
  };
}

export { formatDuration, RSE_LIMITS };
