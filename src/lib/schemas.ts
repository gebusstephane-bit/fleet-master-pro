/**
 * Schémas Zod partagés (pas de "use server")
 * 
 * FICHIER CANONIQUE : Tous les schémas de validation sont définis ici.
 * @deprecated Import depuis '@/lib/validation/schemas' est maintenu pour compatibilité
 *             mais sera supprimé dans une future version. Préférez '@/lib/schemas'.
 */

import { z } from 'zod';

// ============================================
// SCHÉMAS COMMUNS
// ============================================

/**
 * Schéma UUID valide
 */
export const uuidSchema = z.string().uuid({ message: 'ID invalide (UUID attendu)' });

/**
 * Schéma pour les emails
 */
export const emailSchema = z
  .string()
  .email({ message: 'Email invalide' })
  .min(5, { message: 'Email trop court' })
  .max(254, { message: 'Email trop long' });

/**
 * Schéma pour les numéros de téléphone (format français)
 */
export const phoneSchema = z
  .string()
  .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, {
    message: 'Numéro de téléphone invalide (format français attendu)',
  });

/**
 * Schéma pour les dates ISO
 */
export const isoDateSchema = z.string().datetime({ message: 'Date invalide (format ISO attendu)' });

/**
 * Schéma pour les dates (format YYYY-MM-DD)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date invalide (format YYYY-MM-DD attendu)' });

// ============================================
// SCHÉMAS VÉHICULES
// ============================================

/**
 * Types de véhicules valides (inclut valeurs legacy pour rétrocompatibilité)
 */
export const VehicleTypeEnum = z.enum([
  'VOITURE',
  'FOURGON',
  'POIDS_LOURD',
  'POIDS_LOURD_FRIGO',
  'truck',
  'van',
  'car',
  'motorcycle',
  'trailer',
]);

/**
 * @deprecated Utilisez VehicleTypeEnum (PascalCase). Cet alias est maintenu pour compatibilité.
 */
export const vehicleTypeEnum = VehicleTypeEnum;

/**
 * Statuts de véhicule valides - Standard MAJUSCULE_UNDERSCORE
 */
export const VehicleStatusEnum = z.enum([
  'ACTIF',
  'INACTIF',
  'EN_MAINTENANCE',
  'ARCHIVE',
]);

/**
 * Types de carburant valides
 */
export const FuelTypeEnum = z.enum([
  'DIESEL',
  'ESSENCE',
  'ELECTRIQUE',
  'HYBRIDE',
  'GPL',
  'diesel',
  'gasoline',
  'electric',
  'hybrid',
]);

/**
 * Schéma de création d'un véhicule (FUSIONNÉ)
 * 
 * Combine :
 * - Validations strictes de l'ancien validation/schemas.ts (regex immatriculation, VIN)
 * - Champs réglementaires de l'ancien schemas.ts (technical_control_date, tachy_control_date)
 * 
 * Les champs réglementaires sont en .optional() pour ne pas casser les API existantes.
 */
export const createVehicleSchema = z.object({
  // === Champs obligatoires avec validations strictes ===
  registration_number: z
    .string()
    .min(1, { message: 'Le numéro d\'immatriculation est requis' })
    .max(20, { message: 'Immatriculation trop longue (max 20 caractères)' })
    .regex(/^[A-Z0-9-]+$/, { message: 'Format d\'immatriculation invalide' }),

  brand: z
    .string()
    .min(1, { message: 'La marque est requise' })
    .max(50, { message: 'Marque trop longue (max 50 caractères)' }),

  model: z
    .string()
    .min(1, { message: 'Le modèle est requis' })
    .max(50, { message: 'Modèle trop long (max 50 caractères)' }),

  type: VehicleTypeEnum,

  // === Champs optionnels ===
  mileage: z
    .number()
    .int({ message: 'Le kilométrage doit être un nombre entier' })
    .min(0, { message: 'Le kilométrage ne peut pas être négatif' })
    .max(9999999, { message: 'Kilométrage trop élevé' })
    .optional()
    .default(0),

  fuel_type: FuelTypeEnum.optional().default('DIESEL'),

  status: VehicleStatusEnum.optional().default('ACTIF'),

  vin: z
    .string()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'VIN invalide (17 caractères alphanumériques attendus)' })
    .optional()
    .nullable(),

  year: z
    .number()
    .int()
    .min(1900, { message: 'Année invalide' })
    .max(new Date().getFullYear() + 1, { message: 'Année future non autorisée' })
    .optional()
    .nullable(),

  color: z
    .string()
    .max(30, { message: 'Couleur trop longue' })
    .optional()
    .nullable(),

  purchase_date: dateSchema.optional().nullable(),

  company_id: uuidSchema.optional(),

  // === Champs réglementaires (optionnels pour compatibilité API) ===
  
  // Type legacy pour compatibilité (à migrer vers type)
  category: z.enum(["truck", "van", "car", "motorcycle", "trailer"]).optional(),

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

/**
 * Schéma de mise à jour d'un véhicule (tous les champs optionnels)
 */
export const updateVehicleSchema = createVehicleSchema.partial().extend({
  id: uuidSchema,
});

/**
 * Type TypeScript pour la création d'un véhicule
 */
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/**
 * Type TypeScript pour la mise à jour d'un véhicule
 */
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

// Schéma véhicule complet avec échéances réglementaires (pour les formulaires riches)
export const vehicleSchema = createVehicleSchema.extend({
  id: z.string().uuid().optional(),
});

// Helper interne : "" → null pour les champs DATE PostgreSQL
const nullableDate = z.string().optional().nullable().transform((val) => val === '' ? null : val ?? null);

// ============================================
// SCHÉMAS CHAUFFEURS
// ============================================

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

// ============================================
// SCHÉMAS SINISTRES
// ============================================

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
  maintenance_record_id: z.string().uuid().optional().nullable(),
  incident_date: z.string().min(1, 'Date requise'),
  location_description: z.string().optional().nullable(),
  incident_type: incidentTypeEnum,
  severity: incidentSeverityEnum.optional().nullable(),
  circumstances: z.string().optional().nullable(),
  third_party_involved: z.boolean().default(false),
  third_party_info: z.record(z.string(), z.unknown()).optional().nullable(),
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

// ============================================
// SCHÉMAS SOS PROVIDERS
// ============================================

/**
 * Spécialités des prestataires SOS valides
 */
export const SosSpecialtyEnum = z.enum([
  'depanneur',
  'garage_agree',
  'remorqueur',
  'depannage_rapide',
  'pneumatique',
  'carrosserie',
  'mecanique_generale',
  'frigorifique',
  'assurance',
]);

/**
 * Schéma de création d'un prestataire SOS
 */
export const createSosProviderSchema = z.object({
  // Champs obligatoires
  name: z
    .string()
    .min(1, { message: 'Le nom est requis' })
    .max(100, { message: 'Nom trop long (max 100 caractères)' }),

  specialty: SosSpecialtyEnum,

  phone_standard: z
    .string()
    .min(8, { message: 'Numéro de téléphone trop court' })
    .max(20, { message: 'Numéro de téléphone trop long' }),

  // Champs optionnels
  phone_24h: z
    .string()
    .max(20, { message: 'Numéro de téléphone trop long' })
    .optional()
    .nullable(),

  max_distance_km: z
    .number()
    .int()
    .min(1, { message: 'La distance minimum est de 1 km' })
    .max(1000, { message: 'La distance maximum est de 1000 km' })
    .optional()
    .default(50),

  city: z
    .string()
    .max(100, { message: 'Nom de ville trop long' })
    .optional()
    .nullable(),

  address: z
    .string()
    .max(255, { message: 'Adresse trop longue (max 255 caractères)' })
    .optional()
    .nullable(),

  is_active: z.boolean().optional().default(true),

  // Coordonnées géographiques (optionnelles)
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .nullable(),

  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .nullable(),
});

/**
 * Schéma de mise à jour d'un prestataire SOS
 */
export const updateSosProviderSchema = createSosProviderSchema.partial().extend({
  id: uuidSchema,
});

/**
 * Type TypeScript pour la création d'un prestataire SOS
 */
export type CreateSosProviderInput = z.infer<typeof createSosProviderSchema>;

/**
 * Type TypeScript pour la mise à jour d'un prestataire SOS
 */
export type UpdateSosProviderInput = z.infer<typeof updateSosProviderSchema>;

// ============================================
// SCHÉMAS UTILISATEURS
// ============================================

/**
 * Schéma de création d'un utilisateur
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
    .max(128, { message: 'Mot de passe trop long' })
    .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
    .regex(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une minuscule' })
    .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' }),

  first_name: z
    .string()
    .min(1, { message: 'Le prénom est requis' })
    .max(50, { message: 'Prénom trop long' }),

  last_name: z
    .string()
    .min(1, { message: 'Le nom est requis' })
    .max(50, { message: 'Nom trop long' }),

  role: z.enum(['ADMIN', 'DIRECTEUR', 'RESPONSABLE', 'CHAUFFEUR', 'SUPERADMIN']).optional().default('CHAUFFEUR'),

  phone: z
    .string()
    .max(20, { message: 'Téléphone trop long' })
    .optional()
    .nullable(),
});

/**
 * Type TypeScript pour la création d'un utilisateur
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Parse et valide les données selon un schéma Zod
 * @param schema - Schéma Zod à utiliser
 * @param data - Données à valider
 * @returns Résultat de la validation avec les erreurs formatées
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T; errors?: undefined }
  | { success: false; data?: undefined; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Formater les erreurs en objet clé-valeur
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return { success: false, errors };
}

/**
 * Parse partiellement (partial) les données selon un schéma Zod
 * Utile pour les requêtes PATCH
 */
export function validatePartialSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: Partial<T>; errors?: undefined }
  | { success: false; data?: undefined; errors: Record<string, string> } {
  // ZodSchema base type n'expose pas .partial() — seul ZodObject le possède
  const partialSchema = (schema as z.ZodObject<z.ZodRawShape>).partial() as z.ZodSchema<Partial<T>>;
  return validateSchema(partialSchema, data);
}
