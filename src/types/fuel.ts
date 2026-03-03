/**
 * Types TypeScript pour le module Carburant
 */

export type FuelType = 'diesel' | 'adblue' | 'gnr' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';

export interface FuelRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  driver_id?: string | null;
  driver_name?: string | null;  // Nom du conducteur saisi via QR
  date: string;
  fuel_type: FuelType;
  quantity_liters: number;
  price_total: number;
  price_per_liter?: number | null;
  mileage_at_fill: number;
  consumption_l_per_100km?: number | null;
  station_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  
  // Relations
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
    type: string;
  };
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface FuelStats {
  totalRecords: number;
  totalLiters: number;
  totalCost: number;
  averageConsumption: number | null;
  averagePricePerLiter: number;
  monthOverMonthChange: {
    liters: number;
    cost: number;
    consumption: number;
  };
  vehicleStats: {
    vehicle_id: string;
    registration_number: string;
    brand: string;
    model: string;
    totalLiters: number;
    totalCost: number;
    averageConsumption: number;
    recordsCount: number;
  }[];
}

export interface FuelFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  vehicleIds?: string[];
  fuelTypes?: FuelType[];
  driverName?: string;
  minConsumption?: number | null;
  maxConsumption?: number | null;
}

export interface FuelFormData {
  vehicle_id: string;
  fuel_type: FuelType;
  quantity_liters: number;
  price_total: number;
  mileage_at_fill: number;
  station_name?: string;
  notes?: string;
}

// ============================================================================
// TYPES POUR FORMULAIRE MULTI-CARBURANT (Session de Ravitaillement)
// ============================================================================

/**
 * Représente une ligne de carburant dans le formulaire multi-plein
 * Utilisé pour la saisie terrain (QR Code)
 */
export interface FuelInputLine {
  id: string; // ID unique local pour React key
  type: FuelType;
  liters: string; // String pour permettre saisie vide/placeholder
  price: string; // String pour permettre saisie vide (prix optionnel)
  mileage: string; // String pour permettre saisie vide (GNR n'a pas besoin de km)
}

/**
 * Données d'une session de ravitaillement complète
 * Envoyées à l'API create_fuel_session
 */
export interface FuelSessionInput {
  vehicleId: string;
  accessToken: string;
  fuels: {
    type: FuelType;
    liters: number;
    price: number | null;
    mileage: number | null;
  }[];
  driverName: string;
  stationName?: string;
}

/**
 * Résultat d'une session de ravitaillement
 */
export interface FuelSessionResult {
  success: boolean;
  record_ids: string[];
  count: number;
  ticket_number: string;
  error?: string;
}

/**
 * Configuration spécifique par type de carburant pour le formulaire
 */
export interface FuelTypeFormConfig {
  value: FuelType;
  label: string;
  icon: string;
  color: string;
  requiresMileage: boolean;
  description?: string;
}

/** 
 * Configuration des types de carburant pour le formulaire multi-plein
 * GNR ne nécessite pas de kilométrage (groupe frigo)
 */
export const FUEL_TYPE_FORM_CONFIG: FuelTypeFormConfig[] = [
  { 
    value: 'diesel', 
    label: 'Gasoil', 
    icon: '⛽', 
    color: 'bg-red-500/20 text-red-400 border-red-500/40',
    requiresMileage: true 
  },
  { 
    value: 'adblue', 
    label: 'AdBlue', 
    icon: '💧', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    requiresMileage: true 
  },
  { 
    value: 'gnr', 
    label: 'GNR', 
    icon: '🌿', 
    color: 'bg-green-500/20 text-green-400 border-green-500/40',
    requiresMileage: false,
    description: 'Groupe frigo uniquement - pas de kilométrage'
  },
  { 
    value: 'gasoline', 
    label: 'Essence', 
    icon: '⛽', 
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    requiresMileage: true 
  },
];

// Configuration des badges couleur par type de carburant
export const FUEL_TYPE_CONFIG: Record<FuelType, { label: string; color: string; bgColor: string }> = {
  diesel: { label: 'Gasoil', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  adblue: { label: 'AdBlue', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  gnr: { label: 'GNR', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  gasoline: { label: 'Essence', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  electric: { label: 'Électrique', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  hybrid: { label: 'Hybride', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  lpg: { label: 'GPL', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
};

// Configuration des indicateurs de consommation
export function getConsumptionIndicator(consumption: number | null | undefined): {
  color: string;
  bgColor: string;
  label: string;
} {
  if (consumption === null || consumption === undefined) {
    return { color: 'text-slate-400', bgColor: 'bg-slate-500/20', label: 'N/A' };
  }
  if (consumption < 25) {
    return { color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Économe' };
  }
  if (consumption <= 30) {
    return { color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Moyen' };
  }
  return { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Élevé' };
}
