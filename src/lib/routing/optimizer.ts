/**
 * Algorithme d'optimisation d'itinéraire
 * Nearest Neighbor + 2-opt improvement
 */

export interface Stop {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  serviceDuration: number;
  priority: "LOW" | "NORMAL" | "HIGH";
}

interface Point {
  latitude: number;
  longitude: number;
}

// Calcul distance Haversine (km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Calcul matrice de distances
function calculateDistanceMatrix(points: Point[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = haversine(
          points[i].latitude, points[i].longitude,
          points[j].latitude, points[j].longitude
        );
      }
    }
  }
  return matrix;
}

// Vérifier si un stop a des coordonnées valides
function hasValidCoords(stop: Stop): boolean {
  return typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && 
         !isNaN(stop.latitude) && !isNaN(stop.longitude);
}

// Algorithme Nearest Neighbor
function nearestNeighbor(
  stops: Stop[], 
  startPoint: Point, 
  distances: number[][]
): Stop[] {
  const n = stops.length;
  if (n === 0) return [];
  if (n === 1) return [{ ...stops[0], orderIndex: 0 }];
  
  const visited = new Array(n).fill(false);
  const route: Stop[] = [];
  
  // Calculer distances depuis le point de départ
  const startDistances = stops.map(stop => 
    hasValidCoords(stop) ? haversine(startPoint.latitude, startPoint.longitude, stop.latitude, stop.longitude) : Infinity
  );
  
  // Trouver le point le plus proche du départ
  let currentIdx = startDistances.indexOf(Math.min(...startDistances));
  if (currentIdx === -1 || !hasValidCoords(stops[currentIdx])) {
    // Si pas de point valide, retourner l'ordre original
    return stops.map((s, i) => ({ ...s, orderIndex: i }));
  }
  
  visited[currentIdx] = true;
  route.push({ ...stops[currentIdx], orderIndex: 0 });
  
  // Construire le reste de la route
  for (let i = 1; i < n; i++) {
    let nearestIdx = -1;
    let nearestDist = Infinity;
    
    for (let j = 0; j < n; j++) {
      if (!visited[j] && distances[currentIdx] && distances[currentIdx][j] !== undefined) {
        if (distances[currentIdx][j] < nearestDist) {
          nearestDist = distances[currentIdx][j];
          nearestIdx = j;
        }
      }
    }
    
    if (nearestIdx !== -1) {
      visited[nearestIdx] = true;
      route.push({ ...stops[nearestIdx], orderIndex: i });
      currentIdx = nearestIdx;
    } else {
      // Plus de points atteignables, ajouter les restants dans l'ordre
      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          visited[j] = true;
          route.push({ ...stops[j], orderIndex: i });
        }
      }
      break;
    }
  }
  
  return route;
}

// Algorithme 2-opt pour amélioration locale
function twoOptImprovement(stops: Stop[], distances: number[][]): Stop[] {
  const n = stops.length;
  if (n <= 2) return stops;
  
  let improved = true;
  let route = [...stops];
  
  while (improved) {
    improved = false;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        // Vérifier que les indices existent dans la matrice
        if (!distances[i] || !distances[i+1] || !distances[j-1] || !distances[j]) continue;
        
        // Calculer gain potentiel
        const currentDist = distances[i][i+1] + distances[j-1][j];
        const newDist = distances[i][j-1] + distances[i+1][j];
        
        if (newDist < currentDist) {
          // Inverser le segment entre i+1 et j-1
          const segment = route.slice(i + 1, j).reverse();
          route = [...route.slice(0, i + 1), ...segment, ...route.slice(j)];
          improved = true;
        }
      }
    }
  }
  
  // Mettre à jour les indices
  return route.map((stop, idx) => ({ ...stop, orderIndex: idx }));
}

// Vérifier les contraintes de time windows (simplifié)
function checkTimeWindows(stops: Stop[]): boolean {
  let currentTime = 8 * 60; // 8h00 en minutes
  
  for (const stop of stops) {
    if (stop.timeWindowStart) {
      const [hours, mins] = stop.timeWindowStart.split(':').map(Number);
      const windowStart = hours * 60 + mins;
      
      if (currentTime < windowStart) {
        currentTime = windowStart; // Attendre l'ouverture
      }
    }
    
    currentTime += stop.serviceDuration;
    
    if (stop.timeWindowEnd) {
      const [hours, mins] = stop.timeWindowEnd.split(':').map(Number);
      const windowEnd = hours * 60 + mins;
      
      if (currentTime > windowEnd) {
        return false; // Contrainte violée
      }
    }
    
    // Ajouter temps de trajet estimé (simplifié: 5 min entre arrêts)
    currentTime += 5;
  }
  
  return true;
}

// Fonction principale d'optimisation
export function optimizeRoute(stops: Stop[], startPoint: Point): Stop[] {
  // Filtrer les stops sans coordonnées valides
  const validStops = stops.filter(hasValidCoords);
  
  if (validStops.length <= 1) return validStops.map((s, i) => ({ ...s, orderIndex: i }));
  
  const points = [startPoint, ...validStops];
  const distances = calculateDistanceMatrix(points);
  
  // 1. Solution initiale avec Nearest Neighbor
  // On passe la sous-matrice sans la première ligne/colonne (point de départ)
  const stopDistances = distances.slice(1).map(row => row.slice(1));
  let optimized = nearestNeighbor(validStops, startPoint, stopDistances);
  
  // 2. Amélioration avec 2-opt
  const distMatrix = calculateDistanceMatrix(optimized);
  optimized = twoOptImprovement(optimized, distMatrix);
  
  // 3. Vérifier les contraintes
  if (!checkTimeWindows(optimized)) {
    console.warn("Contraintes horaires trop strictes, optimisation partielle appliquée");
  }
  
  return optimized;
}

// Calculer les stats de la tournée
export function calculateRouteStats(stops: Stop[], startPoint: Point) {
  let totalDistance = 0;
  let totalDuration = 0;
  
  // Filtrer les stops valides
  const validStops = stops.filter(hasValidCoords);
  
  if (validStops.length === 0) {
    return { totalDistance: 0, totalDuration: 0, fuelCost: 0 };
  }
  
  // Distance départ -> premier arrêt
  totalDistance += haversine(startPoint.latitude, startPoint.longitude, validStops[0].latitude, validStops[0].longitude);
  totalDuration += 5; // 5 min trajet estimé
  
  for (let i = 0; i < validStops.length; i++) {
    // Durée de service
    totalDuration += validStops[i].serviceDuration;
    
    // Distance vers prochain arrêt
    if (i < validStops.length - 1) {
      totalDistance += haversine(
        validStops[i].latitude, validStops[i].longitude,
        validStops[i + 1].latitude, validStops[i + 1].longitude
      );
      totalDuration += 5; // Trajet
    }
  }
  
  // Retour au dépôt (optionnel)
  totalDistance += haversine(
    validStops[validStops.length - 1].latitude, validStops[validStops.length - 1].longitude,
    startPoint.latitude, startPoint.longitude
  );
  totalDuration += 5;
  
  // Estimation coût carburant (0.15€/km)
  const fuelCost = Math.round(totalDistance * 0.15 * 100) / 100;
  
  return {
    totalDistance: Math.round(totalDistance * 10) / 10, // km
    totalDuration, // minutes
    fuelCost // €
  };
}
