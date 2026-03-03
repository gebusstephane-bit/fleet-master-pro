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

// Helper interne : "" → null pour les champs DATE PostgreSQL
const nullableDate = z.string().optional().nullable().transform((val) => val === '' ? null : val ?? null);

// Schéma chauffeur complet avec documents réglementaires
export const driverSchema = z.object({
  id: z.string().uuid().optional(),

  // Informations personnelles
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  address: z.string().optional(),
  city: z.string().optional(),
  nationality: z.string().optional(),
  birth_date: nullableDate,
  social_security_number: z.string().optional(),

  // Permis de conduire
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration du permis requise"),
  license_type: z.string().default('B'),

  // Carte conducteur numérique (tachographe)
  driver_card_number: z.string().optional(),
  driver_card_expiry: nullableDate,

  // Formations obligatoires
  fimo_date: nullableDate,
  fcos_expiry: nullableDate,
  qi_date: nullableDate,

  // Aptitude médicale
  medical_certificate_expiry: nullableDate,

  // Certificat ADR (transport matières dangereuses)
  adr_certificate_expiry: nullableDate,
  adr_classes: z.array(z.string()).optional().default([]),

  // CQC
  cqc_card_number: z.string().optional(),
  cqc_expiry: nullableDate,
  cqc_category: z.enum(["PASSENGER", "GOODS", "BOTH"]).optional(),

  // Informations contractuelles
  hire_date: nullableDate,
  contract_type: z.enum(["CDI", "CDD", "Intérim", "Gérant", "Autre"]).optional(),
  is_active: z.boolean().default(true),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
});

export const createDriverSchema = driverSchema.omit({ id: true });

// ============================================================
// SCHÉMAS SINISTRES
// ============================================================

export const incidentTypeEnum = z.enum([
  'accident_matériel',
  'accident_corporel',
  'vol',
  'vandalisme',
  'incendie',
  'panne_grave',
  'autre',
]);

export const incidentSeverityEnum = z.enum(['mineur', 'moyen', 'grave', 'très_grave']);

export const incidentStatusEnum = z.enum(['ouvert', 'en_cours', 'clôturé']);

export const claimStatusEnum = z.enum([
  'non_declaré',
  'déclaré',
  'en_instruction',
  'accepté',
  'refusé',
  'réglé',
]);

export const incidentSchema = z.object({
  id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid('Véhicule requis'),
  driver_id: z.string().uuid().optional().nullable(),
  incident_date: z.string().min(1, 'Date requise'),
  location_description: z.string().optional().nullable(),
  incident_type: incidentTypeEnum,
  severity: incidentSeverityEnum.optional().nullable(),
  circumstances: z.string().optional().nullable(),
  third_party_involved: z.boolean().default(false),
  third_party_info: z.record(z.unknown()).optional().nullable(),
  injuries_description: z.string().optional().nullable(),
  witnesses: z.array(z.unknown()).optional().nullable(),
  insurance_company: z.string().optional().nullable(),
  insurance_policy_number: z.string().optional().nullable(),
  claim_number: z.string().optional().nullable(),
  claim_date: z.string().optional().nullable(),
  claim_status: claimStatusEnum.default('non_declaré'),
  estimated_damage: z.number().min(0).optional().nullable(),
  final_settlement: z.number().min(0).optional().nullable(),
  status: incidentStatusEnum.default('ouvert'),
  notes: z.string().optional().nullable(),
});

export const createIncidentSchema = incidentSchema.omit({ id: true });
export const updateIncidentSchema = incidentSchema.partial();

export type IncidentFormData = z.infer<typeof incidentSchema>;
export type CreateIncidentData = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentData = z.infer<typeof updateIncidentSchema> & { id: string };
