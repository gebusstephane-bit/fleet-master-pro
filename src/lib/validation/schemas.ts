/**
 * Schémas de validation Zod pour FleetMaster Pro
 * 
 * Ces schémas définissent la structure et les contraintes de validation
 * pour les données entrantes des API routes et des formulaires.
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
 * Types de véhicules valides
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
 * Statuts de véhicule valides
 */
export const VehicleStatusEnum = z.enum([
  'ACTIF',
  'INACTIF',
  'EN_MAINTENANCE',
  'HORS_SERVICE',
  'active',
  'inactive',
  'maintenance',
  'retired',
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
 * Schéma de création d'un véhicule
 */
export const createVehicleSchema = z.object({
  // Champs obligatoires
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

  // Champs optionnels
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
  const partialSchema = (schema as any).partial();
  return validateSchema(partialSchema, data);
}
