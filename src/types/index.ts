/**
 * Types principaux de l'application FleetMaster
 * Centralisation des interfaces pour un code plus sûr
 */

// ==================== TYPES UTILISATEUR ====================
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'CHAUFFEUR';
  company_id: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ==================== TYPES ENTREPRISE ====================
export interface Company {
  id: string;
  name: string;
  siret: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  subscription_plan: 'essential' | 'pro' | 'unlimited';
  subscription_status: 'active' | 'inactive' | 'pending' | 'canceled';
  max_vehicles: number;
  max_drivers: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

// ==================== TYPES VÉHICULE ====================
export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
  fuel_type: string;
  status: 'ACTIF' | 'INACTIF' | 'EN_MAINTENANCE' | 'ARCHIVE';
  purchase_date?: string;
  vin?: string;
  year?: number;
  color?: string;
  assigned_driver_id?: string;
  qr_code_data?: string;
  qr_code_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  drivers?: Driver;
  // Dates réglementaires (optionnelles selon les données Supabase)
  last_technical_control?: string | null;
  technical_control_date?: string | null;
  technical_control_expiry?: string | null;
  tachy_control_expiry?: string | null;
  tachy_control_date?: string | null;
  atp_expiry?: string | null;
  atp_date?: string | null;
  insurance_expiry?: string | null;
}

// ==================== TYPES CHAUFFEUR ====================
export interface Driver {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  license_type?: string | null;
  status: 'active' | 'inactive' | 'on_leave' | 'suspended' | 'terminated';
  is_active: boolean;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  birth_date?: string | null;
  hire_date?: string | null;
  nationality?: string | null;
  contract_type?: 'CDI' | 'CDD' | 'Intérim' | 'Gérant' | 'Autre' | null;
  social_security_number?: string | null;
  // Carte conducteur (tachographe)
  driver_card_number?: string | null;
  driver_card_expiry?: string | null;
  // Formations obligatoires
  fimo_date?: string | null;
  fimo_expiry?: string | null;
  fcos_expiry?: string | null;
  qi_date?: string | null;
  // Aptitude médicale
  medical_certificate_expiry?: string | null;
  // ADR (transport matières dangereuses)
  adr_certificate_expiry?: string | null;
  adr_classes?: string[] | null;
  // CQC
  cqc_card_number?: string | null;
  cqc_expiry?: string | null;
  cqc_expiry_date?: string | null; // Champ legacy pour rétrocompatibilité
  cqc_category?: string | null;
  // Scores
  safety_score?: number | null;
  fuel_efficiency_score?: number | null;
  total_distance_driven?: number | null;
  avatar_url?: string | null;
  current_vehicle_id?: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: Pick<Vehicle, 'registration_number'> | null;
}

// ==================== TYPES AFFECTATION CONDUCTEUR-VÉHICULE ====================
export interface DriverAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
  company_id: string;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  // Joined (optionnel selon la requête)
  drivers?: Pick<Driver, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null;
  vehicles?: Pick<Vehicle, 'id' | 'registration_number' | 'brand' | 'model' | 'year'> | null;
}

// ==================== TYPES MAINTENANCE ====================
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'PNEUMATIQUE' | 'CARROSSERIE';
export type MaintenancePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type MaintenanceStatus = 'DEMANDE_CREEE' | 'VALIDEE_DIRECTEUR' | 'RDV_PRIS' | 'EN_COURS' | 'TERMINEE' | 'REFUSEE';

export interface MaintenanceRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  description: string;
  mileage_at_maintenance?: number;
  cost?: number;
  requested_by: string;
  assigned_garage_id?: string;
  appointment_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Type Maintenance pour les exports (Supabase row avec jointures)
export interface Maintenance {
  id: string;
  company_id: string;
  vehicle_id: string;
  type: string;
  description?: string | null;
  status: string;
  scheduled_date?: string | null;
  completed_date?: string | null;
  cost?: number | null;
  provider?: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: {
    brand?: string | null;
    model?: string | null;
    registration_number?: string | null;
  } | null;
}

// ==================== TYPES INSPECTION ====================
export interface Inspection {
  id: string;
  company_id: string;
  vehicle_id: string;
  created_by?: string;
  mileage: number;
  fuel_level: number;
  adblue_level?: number;
  gnr_level?: number;
  cleanliness_exterior: number;
  cleanliness_interior: number;
  cleanliness_cargo_area?: number;
  compartment_c1_temp?: number;
  compartment_c2_temp?: number;
  tires_condition: {
    front_left?: { pressure?: number; wear?: string; damage?: string };
    front_right?: { pressure?: number; wear?: string; damage?: string };
    rear_left?: { pressure?: number; wear?: string; damage?: string };
    rear_right?: { pressure?: number; wear?: string; damage?: string };
    spare?: { pressure?: number; wear?: string; damage?: string };
  };
  reported_defects: Array<{
    id: string;
    description: string;
    severity: 'CRITIQUE' | 'MAJEUR' | 'MINEUR';
    category: string;
  }>;
  photos: string[];  // URLs des photos dans le bucket storage (max 4)
  driver_name: string;
  driver_signature?: string;
  inspector_notes?: string;
  location?: string;
  status: 'PENDING' | 'COMPLETED' | 'ISSUES_FOUND' | 'CRITICAL_ISSUES' | 'REFUSEE';
  score?: number;
  grade?: string;
  defects_count?: number;
  validated_at?: string;
  validated_by?: string;
  inspection_date?: string;
  created_at: string;
  updated_at: string;
}

// ==================== TYPES RÉPONSES API ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  status?: number;
  details?: unknown;
}

// ==================== TYPES PAGINATION ====================
export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ==================== TYPES TABLEAU DE BORD ====================
export interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  inMaintenanceVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  pendingMaintenances: number;
  upcomingInspections: number;
  alertsCount?: number;
  criticalAlerts?: number;
  todayRoutes?: number;
  // Propriétés additionnelles pour l'UI
  upcomingMaintenance?: number;
  overdueMaintenance?: number;
  // Inspections stats
  inspections?: {
    pending: number;
    completedThisMonth: number;
  };
}

// ==================== TYPES ABONNEMENT ====================
export interface Subscription {
  id: string;
  company_id: string;
  plan: 'ESSENTIAL' | 'PRO' | 'UNLIMITED';
  status: 'ACTIVE' | 'PENDING' | 'CANCELED' | 'PAST_DUE';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  vehicle_limit: number;
  user_limit: number;
  features: string[];
  created_at: string;
  updated_at: string;
}
