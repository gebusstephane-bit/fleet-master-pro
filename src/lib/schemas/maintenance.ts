/**
 * Schémas Zod pour le module Maintenance
 * Gestion des interventions, entretiens préventifs et correctifs
 */

import { z } from 'zod';

export const maintenanceDocumentSchema = z.object({
  name: z.string().min(1, "Nom du document requis"),
  url: z.string().url("URL invalide"),
  type: z.enum(['INVOICE', 'QUOTE', 'REPORT', 'PHOTO']).default('INVOICE'),
});

export const maintenanceSchema = z.object({
  id: z.string().uuid().optional(),
  vehicleId: z.string().uuid("Véhicule requis"),
  // @ts-expect-error - zod enum overload issue
  type: z.enum([
    'PREVENTIVE', 
    'CORRECTIVE', 
    'INSPECTION', 
    'TIRE_CHANGE', 
    'OIL_CHANGE',
    'BRAKE_CHANGE',
    'FILTER_CHANGE',
    'TIMING_BELT',
    'TECHNICAL_CONTROL',
    'ATP_CONTROL',
    'OTHER'
  ], {
    errorMap: () => ({ message: "Type d'intervention requis" })
  }),
  description: z.string().min(1, "Description requise"),
  cost: z.number().min(0, "Le coût doit être positif").default(0),
  mileageAtService: z.number().min(0, "Kilométrage invalide").default(0),
  serviceDate: z.string().min(1, "Date requise"), // Format ISO YYYY-MM-DD
  garage: z.string().optional(),
  invoiceNumber: z.string().optional(),
  documents: z.array(maintenanceDocumentSchema).optional().default([]),
  // Pour préventif : prochaine échéance
  nextServiceDue: z.string().optional(), // Format ISO YYYY-MM-DD
  nextServiceMileage: z.number().optional(),
  // Détails technique
  partsReplaced: z.array(z.object({
    name: z.string(),
    reference: z.string().optional(),
    cost: z.number(),
    quantity: z.number().default(1),
  })).optional().default([]),
  laborCost: z.number().min(0).default(0),
  partsCost: z.number().min(0).default(0),
  notes: z.string().optional(),
  status: z.enum(['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS', 'TERMINEE', 'REFUSEE']).default('DEMANDE_CREEE'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
});

export const maintenanceAlertSchema = z.object({
  id: z.string().uuid().optional(),
  vehicleId: z.string().uuid(),
  type: z.enum([
    'MILEAGE_DUE',      // Prochain entretien kilométrage
    'DATE_DUE',         // Prochain entretien date
    'OVERDUE',          // Entretien en retard
    'CUSTOM'            // Alerte personnalisée
  ]),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('WARNING'),
  message: z.string().min(1),
  dueDate: z.string().optional(),
  dueMileage: z.number().optional(),
  currentMileage: z.number().optional(),
  acknowledged: z.boolean().default(false),
  acknowledgedAt: z.string().optional(),
});

// Types dérivés
export type Maintenance = z.infer<typeof maintenanceSchema>;
export type MaintenanceDocument = z.infer<typeof maintenanceDocumentSchema>;
export type MaintenanceAlert = z.infer<typeof maintenanceAlertSchema>;

// Configuration des types d'intervention (pour l'UI)
export const maintenanceTypeConfig = {
  PREVENTIVE: { 
    label: 'Entretien préventif', 
    icon: 'Shield',
    color: 'bg-blue-100 text-blue-700',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
  },
  CORRECTIVE: { 
    label: 'Réparation corrective', 
    icon: 'Wrench',
    color: 'bg-red-100 text-red-700',
  },
  INSPECTION: { 
    label: 'Inspection', 
    icon: 'Search',
    color: 'bg-purple-100 text-purple-700',
  },
  TIRE_CHANGE: { 
    label: 'Changement pneus', 
    icon: 'Circle',
    color: 'bg-amber-100 text-amber-700',
    defaultIntervalKm: 40000,
  },
  OIL_CHANGE: { 
    label: 'Vidange', 
    icon: 'Droplet',
    color: 'bg-emerald-100 text-emerald-700',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
  },
  BRAKE_CHANGE: { 
    label: 'Freins', 
    icon: 'AlertCircle',
    color: 'bg-orange-100 text-orange-700',
    defaultIntervalKm: 30000,
  },
  FILTER_CHANGE: { 
    label: 'Filtres', 
    icon: 'Filter',
    color: 'bg-cyan-100 text-cyan-700',
  },
  TIMING_BELT: { 
    label: 'Courroie distribution', 
    icon: 'Cog',
    color: 'bg-rose-100 text-rose-700',
    defaultIntervalKm: 120000,
    defaultIntervalYears: 5,
  },
  TECHNICAL_CONTROL: { 
    label: 'Contrôle technique', 
    icon: 'ClipboardCheck',
    color: 'bg-indigo-100 text-indigo-700',
    defaultIntervalMonths: 24,
  },
  ATP_CONTROL: { 
    label: 'Contrôle ATP', 
    icon: 'FileCheck',
    color: 'bg-teal-100 text-teal-700',
    defaultIntervalMonths: 36, // Validité ATP : 36 mois
  },
  OTHER: { 
    label: 'Autre', 
    icon: 'MoreHorizontal',
    color: 'bg-slate-100 text-slate-700',
  },
} as const;

// Helpers pour calculer les prochains entretiens
export function calculateNextService(
  type: keyof typeof maintenanceTypeConfig,
  currentMileage: number,
  serviceDate: string,
  config?: { intervalKm?: number; intervalMonths?: number; intervalYears?: number }
) {
  const typeConfig = maintenanceTypeConfig[type] as {
    label: string;
    icon: string;
    color: string;
    defaultIntervalKm?: number;
    defaultIntervalMonths?: number;
    defaultIntervalYears?: number;
  };
  
  const nextMileage = typeConfig?.defaultIntervalKm 
    ? currentMileage + (config?.intervalKm || typeConfig.defaultIntervalKm)
    : undefined;
  
  // Calcul de la prochaine date (mois OU années)
  let nextDate: string | undefined;
  const baseDate = new Date(serviceDate);
  
  if (config?.intervalMonths || typeConfig?.defaultIntervalMonths) {
    const months = config?.intervalMonths || typeConfig.defaultIntervalMonths;
    nextDate = new Date(baseDate.getTime() + months! * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } else if (config?.intervalYears || typeConfig?.defaultIntervalYears) {
    const years = config?.intervalYears || typeConfig.defaultIntervalYears;
    nextDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + years!)).toISOString().split('T')[0];
  }
    
  return { nextMileage, nextDate };
}
