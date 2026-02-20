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
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
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
  config?: { intervalKm?: number; intervalMonths?: number }
) {
  const typeConfig = maintenanceTypeConfig[type] as any;
  
  const nextMileage = typeConfig?.defaultIntervalKm 
    ? currentMileage + (config?.intervalKm || typeConfig.defaultIntervalKm)
    : undefined;
    
  const nextDate = typeConfig?.defaultIntervalMonths
    ? new Date(new Date(serviceDate).getTime() + (config?.intervalMonths || typeConfig.defaultIntervalMonths) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined;
    
  return { nextMileage, nextDate };
}
