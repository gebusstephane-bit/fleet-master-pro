/**
 * Schémas Zod de validation pour l'import CSV/Excel
 * Utilisés côté CLIENT (UX) ET côté SERVEUR (sécurité)
 */

import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optionalDate = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: 'Format attendu : AAAA-MM-JJ (ex: 2025-06-30)',
  });

// ─── Véhicules ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

export const VehicleImportRowSchema = z.object({
  immatriculation: z
    .string()
    .min(1, 'Immatriculation obligatoire')
    .max(20, 'Immatriculation trop longue (20 car. max)'),
  marque: z.string().min(1, 'Marque obligatoire').max(50, 'Marque trop longue'),
  modele: z.string().min(1, 'Modèle obligatoire').max(100, 'Modèle trop long'),
  kilometrage: z
    .string()
    .min(1, 'Kilométrage obligatoire')
    .refine((v) => /^\d+$/.test(v), { message: 'Kilométrage doit être un entier ≥ 0' }),
  annee: z
    .string()
    .refine(
      (v) => !v || (/^\d{4}$/.test(v) && +v >= 1900 && +v <= CURRENT_YEAR + 1),
      { message: `Année invalide (1900–${CURRENT_YEAR + 1})` }
    )
    .optional(),
  type_vehicule: z
    .string()
    .refine(
      (v) =>
        !v ||
        ['VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO'].includes(
          v.trim().toUpperCase()
        ),
      { message: 'Type invalide. Valeurs : VOITURE, FOURGON, POIDS_LOURD, POIDS_LOURD_FRIGO' }
    )
    .optional(),
  carburant: z
    .string()
    .refine(
      (v) =>
        !v ||
        ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'].includes(v.trim().toLowerCase()),
      { message: 'Carburant invalide. Valeurs : diesel, gasoline, electric, hybrid, lpg' }
    )
    .optional(),
  vin: z
    .string()
    .refine((v) => !v || v.length === 17, { message: 'VIN doit comporter exactement 17 caractères' })
    .optional(),
  date_mise_en_service: optionalDate.optional(),
  date_controle_technique: optionalDate.optional(),
  date_atp: optionalDate.optional(),
  date_tachygraphe: optionalDate.optional(),
  numero_serie: z.string().optional(),
});

// ─── Chauffeurs ───────────────────────────────────────────────────────────────

const VALID_CONTRACTS = ['CDI', 'CDD', 'Intérim', 'Interim', 'Gérant', 'Gerant', 'Autre'];

export const DriverImportRowSchema = z.object({
  nom: z.string().min(1, 'Nom obligatoire').max(100, 'Nom trop long'),
  prenom: z.string().min(1, 'Prénom obligatoire').max(100, 'Prénom trop long'),
  email: z
    .string()
    .min(1, 'Email obligatoire')
    .email('Email invalide (format attendu : user@domaine.com)'),
  telephone: z.string().min(1, 'Téléphone obligatoire').max(20, 'Téléphone trop long'),
  numero_permis: z.string().min(1, 'N° permis obligatoire').max(50, 'N° permis trop long'),
  categorie_permis: z
    .string()
    .refine(
      (v) =>
        !v ||
        ['B', 'C', 'CE', 'D', 'BE', 'C1', 'C1E', 'D1', 'D1E'].includes(v.trim().toUpperCase()),
      { message: 'Catégorie permis invalide. Valeurs : B, C, CE, D, BE, C1, C1E, D1, D1E' }
    )
    .optional(),
  date_expiration_permis: optionalDate.optional(),
  date_naissance: optionalDate.optional(),
  date_embauche: optionalDate.optional(),
  type_contrat: z
    .string()
    .refine(
      (v) =>
        !v || VALID_CONTRACTS.some((c) => c.toLowerCase() === v.trim().toLowerCase()),
      { message: 'Type contrat invalide. Valeurs : CDI, CDD, Intérim, Gérant, Autre' }
    )
    .optional(),
});

// ─── Résultat de validation ───────────────────────────────────────────────────

export interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportValidationResult {
  /** Lignes ayant passé la validation */
  validRows: Record<string, string>[];
  /** Erreurs par champ avec numéro de ligne (1-based) */
  errors: RowValidationError[];
  /** Nombre de lignes contenant au moins une erreur */
  errorRowCount: number;
}

// ─── Fonction de validation ───────────────────────────────────────────────────

export function validateImportRows(
  rows: Record<string, string>[],
  type: 'vehicles' | 'drivers'
): ImportValidationResult {
  const schema = type === 'vehicles' ? VehicleImportRowSchema : DriverImportRowSchema;
  const validRows: Record<string, string>[] = [];
  const errors: RowValidationError[] = [];
  const errorRowNums = new Set<number>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const result = schema.safeParse(row);
    if (result.success) {
      validRows.push(row);
    } else {
      errorRowNums.add(rowNum);
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: (issue.path[0] as string) ?? 'général',
          message: issue.message,
        });
      }
    }
  });

  return { validRows, errors, errorRowCount: errorRowNums.size };
}
