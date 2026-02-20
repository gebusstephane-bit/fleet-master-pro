/**
 * Optimiseur de tournées V3
 * Gestion avancée des contraintes horaires par destination
 */

import { 
  calculateAverageSpeed, 
  estimateTravelTime, 
  isHeavyVehicle, 
  VehicleCategory,
  estimateFuelCost 
} from './vehicle-speeds';
import { 
  calculateRSECompliance, 
  formatDuration, 
  RSE_LIMITS, 
  RSEResult 
} from './rse-regulations';
import { RouteConstraints, DEFAULT_CONSTRAINTS } from './constraints';

export interface Stop {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  timeWindowStart?: string;  // "09:00" - Créneau obligatoire
  timeWindowEnd?: string;    // "12:00"
  serviceDuration: number;   // minutes sur place
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  mandatoryOrder?: number;   // Position fixe (optionnel)
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
    isOnTime: boolean;
    waitTime: number;  // minutes d'attente avant créneau
  }>;
  vehicleCategory?: string;
  averageSpeed: number;
  rseCompliance?: RSEResult;
  isHeavyVehicle: boolean;
  depot: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

interface Point {
  latitude: number;
  longitude: number;
}

// Distance Haversine (km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Convertir "HH:MM" en minutes
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

// Vérifier coordonnées valides
function hasValidCoords(stop: Stop): boolean {
  return typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && 
         !isNaN(stop.latitude) && !isNaN(stop.longitude);
}

// Calculer score de compatibilité d'un créneau
function calculateTimeWindowScore(
  arrivalMinutes: number,
  timeWindowStart?: string,
  timeWindowEnd?: string
): { score: number; isOnTime: boolean; waitTime: number } {
  if (!timeWindowStart && !timeWindowEnd) {
    return { score: 100, isOnTime: true, waitTime: 0 };
  }

  const start = timeWindowStart ? timeToMinutes(timeWindowStart) : 0;
  const end = timeWindowEnd ? timeToMinutes(timeWindowEnd) : 24 * 60;

  // Arrivée avant le créneau = attente
  if (arrivalMinutes < start) {
    const waitTime = start - arrivalMinutes;
    // Pénalité proportionnelle à l'attente (max 60min)
    const penalty = Math.min(waitTime, 60);
    return { 
      score: Math.max(0, 100 - penalty), 
      isOnTime: true, 
      waitTime 
    };
  }

  // Arrivée dans le créneau = parfait
  if (arrivalMinutes >= start && arrivalMinutes <= end) {
    return { score: 100, isOnTime: true, waitTime: 0 };
  }

  // Arrivée après le créneau = retard
  const delay = arrivalMinutes - end;
  const penalty = Math.min(delay * 2, 100); // Pénalité plus forte pour le retard
  return { 
    score: Math.max(0, 100 - penalty), 
    isOnTime: false, 
    waitTime: 0 
  };
}

// Algorithme d'optimisation avec contraintes horaires prioritaires
function optimizeWithTimeWindows(
  stops: Stop[],
  depot: Point,
  startTimeMinutes: number,
  vehicleCategory: VehicleCategory | string
): { order: Stop[]; arrivals: Array<{ stopId: string; arrivalTime: string; departureTime: string; isOnTime: boolean; waitTime: number }> } {
  
  const unassigned = [...stops];
  const order: Stop[] = [];
  const arrivals: Array<{ stopId: string; arrivalTime: string; departureTime: string; isOnTime: boolean; waitTime: number }> = [];
  let currentTime = startTimeMinutes;
  let currentLocation: Point = depot;
  
  while (unassigned.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = 0;
    let bestArrivalTime = currentTime;
    let bestWaitTime = 0;

    // Évaluer chaque arrêt restant
    for (let i = 0; i < unassigned.length; i++) {
      const stop = unassigned[i];
      
      // Calculer temps de trajet
      const distance = haversine(
        currentLocation.latitude, currentLocation.longitude,
        stop.latitude, stop.longitude
      );
      const travelTime = estimateTravelTime(distance, vehicleCategory);
      const arrivalTime = currentTime + travelTime;
      
      // Score basé sur les contraintes horaires
      const timeScore = calculateTimeWindowScore(
        arrivalTime,
        stop.timeWindowStart,
        stop.timeWindowEnd
      );
      
      // Score basé sur la priorité
      const priorityScore = stop.priority === 'HIGH' ? 50 : stop.priority === 'NORMAL' ? 25 : 0;
      
      // Score basé sur la distance (plus proche = mieux)
      const distanceScore = 100 - Math.min(distance * 10, 100);
      
      // Pénalité si créneau passé (urgent!)
      const urgencyPenalty = !timeScore.isOnTime && stop.timeWindowEnd ? -200 : 0;
      
      // Score total
      const totalScore = timeScore.score + priorityScore + distanceScore * 0.3 + urgencyPenalty;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestIndex = i;
        bestArrivalTime = arrivalTime;
        bestWaitTime = timeScore.waitTime;
      }
    }

    // Sélectionner le meilleur arrêt
    const selected = unassigned.splice(bestIndex, 1)[0];
    
    // Ajuster l'heure d'arrivée avec l'attente
    const actualArrival = bestArrivalTime + bestWaitTime;
    const departure = actualArrival + selected.serviceDuration;
    
    order.push(selected);
    arrivals.push({
      stopId: selected.id,
      arrivalTime: minutesToTime(actualArrival),
      departureTime: minutesToTime(departure),
      isOnTime: calculateTimeWindowScore(bestArrivalTime, selected.timeWindowStart, selected.timeWindowEnd).isOnTime,
      waitTime: bestWaitTime,
    });
    
    currentTime = departure;
    currentLocation = { latitude: selected.latitude, longitude: selected.longitude };
  }

  return { order, arrivals };
}

// Fonction principale d'optimisation V3
export function optimizeRouteV3(
  stops: Stop[],
  depot: { name: string; address: string; latitude: number; longitude: number },
  constraints: Partial<RouteConstraints> = {},
  vehicleCategory: VehicleCategory | string = 'UTILITAIRE_MOYEN'
): OptimizedRoute {
  const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const heavy = isHeavyVehicle(vehicleCategory);
  const depotPoint: Point = { latitude: depot.latitude, longitude: depot.longitude };
  
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
      depot,
    };
  }

  // Optimiser l'ordre avec les contraintes horaires
  const startTimeMinutes = timeToMinutes(mergedConstraints.startTime);
  const { order, arrivals } = optimizeWithTimeWindows(
    validStops,
    depotPoint,
    startTimeMinutes,
    vehicleCategory
  );

  // Calculer la distance totale
  let totalDistance = haversine(depotPoint.latitude, depotPoint.longitude, order[0].latitude, order[0].longitude);
  for (let i = 0; i < order.length - 1; i++) {
    totalDistance += haversine(
      order[i].latitude, order[i].longitude,
      order[i + 1].latitude, order[i + 1].longitude
    );
  }
  totalDistance += haversine(
    order[order.length - 1].latitude, order[order.length - 1].longitude,
    depotPoint.latitude, depotPoint.longitude
  );

  // Calculer segments pour RSE
  const drivingSegments = [];
  let currentTime = startTimeMinutes;
  
  // Dépot -> Premier
  const firstDist = haversine(depotPoint.latitude, depotPoint.longitude, order[0].latitude, order[0].longitude);
  drivingSegments.push({
    from: depot.name,
    to: order[0].address,
    drivingMinutes: estimateTravelTime(firstDist, vehicleCategory),
    stopDuration: order[0].serviceDuration,
  });
  
  // Entre arrêts
  for (let i = 0; i < order.length - 1; i++) {
    const dist = haversine(order[i].latitude, order[i].longitude, order[i + 1].latitude, order[i + 1].longitude);
    drivingSegments.push({
      from: order[i].address,
      to: order[i + 1].address,
      drivingMinutes: estimateTravelTime(dist, vehicleCategory),
      stopDuration: order[i + 1].serviceDuration,
    });
  }
  
  // Dernier -> Dépot
  const lastDist = haversine(order[order.length - 1].latitude, order[order.length - 1].longitude, depotPoint.latitude, depotPoint.longitude);
  drivingSegments.push({
    from: order[order.length - 1].address,
    to: depot.name,
    drivingMinutes: estimateTravelTime(lastDist, vehicleCategory),
    stopDuration: 0,
  });

  // Calcul RSE
  const rseResult = calculateRSECompliance(drivingSegments, mergedConstraints.startTime, vehicleCategory, heavy);
  
  // Calculer l'heure de fin
  const lastArrival = arrivals[arrivals.length - 1];
  const returnTime = estimateTravelTime(
    haversine(order[order.length - 1].latitude, order[order.length - 1].longitude, depotPoint.latitude, depotPoint.longitude),
    vehicleCategory
  );
  const endTimeMinutes = timeToMinutes(lastArrival.departureTime) + returnTime;
  
  // Vérifier les violations
  const violations: string[] = [];
  
  // Vérifier créneaux manqués
  arrivals.forEach((arr, idx) => {
    if (!arr.isOnTime) {
      const stop = order[idx];
      violations.push(`Retard à ${stop.address} (arrivée ${arr.arrivalTime}, créneau ${stop.timeWindowStart}-${stop.timeWindowEnd})`);
    }
  });
  
  // Vérifier distance max
  if (totalDistance > mergedConstraints.maxDistanceKm) {
    violations.push(`Distance ${totalDistance.toFixed(1)}km > max ${mergedConstraints.maxDistanceKm}km`);
  }
  
  // Ajouter violations RSE
  violations.push(...rseResult.violations);

  // Calculer le score global
  const onTimeCount = arrivals.filter(a => a.isOnTime).length;
  const timeWindowScore = (onTimeCount / arrivals.length) * 50;
  const distanceScore = Math.max(0, 50 - (totalDistance / mergedConstraints.maxDistanceKm) * 20);
  const score = Math.round(timeWindowScore + distanceScore);

  return {
    stops: order,
    totalDistanceKm: Math.round(totalDistance * 10) / 10,
    totalDurationMinutes: rseResult.periods.reduce((sum, p) => sum + p.durationMinutes, 0),
    startTime: mergedConstraints.startTime,
    endTime: minutesToTime(endTimeMinutes),
    score,
    feasible: violations.length === 0,
    violations,
    estimatedArrivals: arrivals,
    vehicleCategory,
    averageSpeed: calculateAverageSpeed(vehicleCategory),
    rseCompliance: rseResult,
    isHeavyVehicle: heavy,
    depot,
  };
}

// Export pour compatibilité
export { formatDuration, estimateFuelCost, isHeavyVehicle, calculateAverageSpeed };
