/**
 * Schémas Zod pour la validation de l'onboarding
 * Isolés du reste de l'application pour éviter les conflits
 */

import { z } from "zod";

// Étape 2: Informations entreprise
export const CompanyStepSchema = z.object({
  companyId: z.string().uuid("ID entreprise invalide"),
  name: z
    .string()
    .min(2, "Le nom doit faire au moins 2 caractères")
    .max(100, "Le nom ne peut dépasser 100 caractères"),
  siret: z
    .string()
    .regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres"),
  fleetSize: z
    .number()
    .min(1, "Au moins 1 véhicule")
    .max(10000, "Maximum 10 000 véhicules"),
  industry: z
    .string()
    .min(2, "Le secteur doit faire au moins 2 caractères")
    .max(100, "Le secteur ne peut dépasser 100 caractères"),
});

export type CompanyStepData = z.infer<typeof CompanyStepSchema>;

// Étape 3: Premier véhicule
export const VehicleStepSchema = z.object({
  companyId: z.string().uuid("ID entreprise invalide"),
  registrationNumber: z
    .string()
    .regex(
      /^[A-Z]{2}-\d{3}-[A-Z]{2}$/,
      "Format d'immatriculation invalide (ex: AB-123-CD)"
    ),
  brand: z
    .string()
    .min(2, "La marque doit faire au moins 2 caractères")
    .max(50, "La marque ne peut dépasser 50 caractères"),
  model: z
    .string()
    .min(2, "Le modèle doit faire au moins 2 caractères")
    .max(50, "Le modèle ne peut dépasser 50 caractères"),
  mileage: z
    .number()
    .min(0, "Le kilométrage ne peut être négatif")
    .max(10000000, "Kilométrage trop élevé"),
});

export type VehicleStepData = z.infer<typeof VehicleStepSchema>;

// Étape 4: Premier chauffeur (optionnel)
export const DriverStepSchema = z
  .object({
    companyId: z.string().uuid("ID entreprise invalide"),
    firstName: z
      .string()
      .min(2, "Le prénom doit faire au moins 2 caractères")
      .max(50, "Le prénom ne peut dépasser 50 caractères"),
    lastName: z
      .string()
      .min(2, "Le nom doit faire au moins 2 caractères")
      .max(50, "Le nom ne peut dépasser 50 caractères"),
    email: z.string().email("Adresse email invalide"),
    phone: z
      .string()
      .regex(
        /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
        "Numéro de téléphone français invalide"
      ),
  })
  .partial({
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
  })
  .refine(
    (data) => {
      // Si un champ est rempli, tous doivent être remplis
      const hasAny = data.firstName || data.lastName || data.email || data.phone;
      const hasAll = data.firstName && data.lastName && data.email && data.phone;
      return !hasAny || hasAll;
    },
    {
      message:
        "Si vous ajoutez un chauffeur, tous les champs sont obligatoires",
    }
  );

export type DriverStepData = z.infer<typeof DriverStepSchema>;

// Helpers de validation
export const formatSiret = (value: string): string => {
  // Retire tous les espaces et garde que les chiffres
  return value.replace(/\s/g, "").replace(/\D/g, "");
};

export const formatPhone = (value: string): string => {
  // Format: 06 12 34 56 78
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return value;
};

export const formatRegistration = (value: string): string => {
  // Format: AB-123-CD
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }
  return value.toUpperCase();
};
