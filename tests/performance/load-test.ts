/**
 * Tests de charge avec k6 pour vérifier les performances
 * Objectif: <200ms sur 1000+ items
 * 
 * Installation: npm install -g k6
 * Exécution: k6 run load-test.ts
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métriques personnalisées
const vehiclesListLatency = new Trend('vehicles_list_latency');
const vehicleDetailLatency = new Trend('vehicle_detail_latency');
const errorRate = new Rate('errors');

// Configuration du test
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Montée progressive: 10 users
    { duration: '3m', target: 50 },   // Charge normale: 50 users
    { duration: '2m', target: 100 },  // Pic de charge: 100 users
    { duration: '1m', target: 0 },    // Descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% des requêtes < 200ms
    http_req_failed: ['rate<0.01'],   // Erreurs < 1%
    vehicles_list_latency: ['p(95)<200'],
    vehicle_detail_latency: ['p(95)<150'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Simulation d'un utilisateur
export default function () {
  group('Vehicles List (Paginated)', () => {
    const start = Date.now();
    
    // Requête liste paginée (page 1)
    const res = http.get(`${API_URL}/vehicles?page=1&pageSize=20`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const duration = Date.now() - start;
    vehiclesListLatency.add(duration);
    
    const success = check(res, {
      'list status is 200': (r) => r.status === 200,
      'list response time < 200ms': (r) => r.timings.duration < 200,
      'list has data': (r) => {
        try {
          const body = JSON.parse(r.body as string);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
    sleep(1);
  });

  group('Vehicle Detail', () => {
    const start = Date.now();
    
    // Détails d'un véhicule (avec prefetching)
    const res = http.get(`${API_URL}/vehicles/test-vehicle-id`);
    
    const duration = Date.now() - start;
    vehicleDetailLatency.add(duration);
    
    const success = check(res, {
      'detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'detail response time < 150ms': (r) => r.timings.duration < 150,
    });
    
    errorRate.add(!success);
    sleep(2);
  });
}
