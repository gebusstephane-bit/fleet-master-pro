/**
 * Schémas Zod partagés (pas de "use server")
 */

import { z } from 'zod';

// Types de véhicule avec gestion des échéances réglementaires
export const vehicleTypeEnum = z.enum([
  'VOITURE',           // CT 2 ans
  'FOURGON',           // CT 2 ans  
  'POIDS_LOURD',       // CT 1 an + Tachy 2 ans
  'POIDS_LOURD_FRIGO'  // CT 1 an + Tachy 2 ans + ATP 5 ans
]);

// Schéma véhicule complet avec échéances réglementaires
export const vehicleSchema = z.object({
  id: z.string().uuid().optional(),
  registration_number: z.string().min(1, "Immatriculation requise"),
  brand: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  
  // Nouveau type de véhicule pour échéances réglementaires
  type: vehicleTypeEnum,
  
  // Type legacy pour compatibilité (à migrer vers type)
  category: z.enum(["truck", "van", "car", "motorcycle", "trailer"]).optional(),
  
  fuel_type: z.enum(["diesel", "gasoline", "electric", "hybrid", "lpg"]),
  color: z.string().min(1, "Couleur requise"),
  mileage: z.number().min(0),
  vin: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).default("active"),
  
  // === ÉCHÉANCES RÉGLEMENTAIRES ===
  
  // Date du dernier CT (saisie manuelle)
  technical_control_date: z.string().optional(),
  // Date d'expiration CT (calculée automatiquement)
  technical_control_expiry: z.string().optional(),
  
  // Tachygraphe (PL et PL Frigo uniquement)
  tachy_control_date: z.string().optional(),
  tachy_control_expiry: z.string().optional(),
  
  // ATP (PL Frigo uniquement)
  atp_date: z.string().optional(),
  atp_expiry: z.string().optional(),
  
  // Flag pour savoir si dates ont été calculées auto
  dates_auto_calculated: z.boolean().default(true),
  
  // Anciens champs à migrer
  insurance_expiry: z.string().optional(),
  next_maintenance_date: z.string().optional(),
  next_service_due: z.string().optional(),
  next_service_mileage: z.number().optional(),
});

export const createVehicleSchema = vehicleSchema.omit({ id: true });

// Schéma chauffeur
export const driverSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration requise"),
  address: z.string().optional(),
  city: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
});

export const createDriverSchema = driverSchema.omit({ id: true });
