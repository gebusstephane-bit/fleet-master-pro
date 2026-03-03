/**
 * Schémas Zod pour les tournées
 */

import { z } from 'zod';

export const routeStopSchema = z.object({
  id: z.string().optional(),
  address: z.string().min(1, "Adresse requise"),
  latitude: z.number(),
  longitude: z.number(),
  orderIndex: z.number(),
  timeWindowStart: z.string().optional(), // "09:00"
  timeWindowEnd: z.string().optional(),   // "12:00"
  serviceDuration: z.number().default(15), // minutes
  notes: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL")
});

export const routeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nom de tournée requis"),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  routeDate: z.string(), // ISO date string (route_date en DB)
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("PLANNED"),
  stops: z.array(routeStopSchema).min(1, "Au moins un arrêt requis"),
  totalDistance: z.number().optional().default(0), // km
  estimatedDuration: z.number().optional().default(0), // minutes
  fuelCost: z.number().optional().default(0),
  notes: z.string().optional().default('')
});

export type RouteStop = z.infer<typeof routeStopSchema>;

// Type pour la création (sans id)
export type CreateRouteStopInput = Omit<RouteStop, 'id'>;
export type Route = z.infer<typeof routeSchema>;
