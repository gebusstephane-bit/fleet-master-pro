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
  status: 'ACTIF' | 'INACTIF' | 'EN_MAINTENANCE';
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
  status: 'ACTIF' | 'INACTIF';
  address?: string;
  city?: string;
  postal_code?: string;
  created_at: string;
  updated_at: string;
  license_type?: string | null;
  safety_score?: number | null;
  vehicles?: Pick<Vehicle, 'registration_number'> | null;
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
  driver_id?: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  status: 'PASSED' | 'FAILED' | 'PENDING';
  mileage: number;
  fuel_level?: number;
  cleanliness_exterior?: number;
  cleanliness_interior?: number;
  tire_condition?: string;
  lights_working?: boolean;
  notes?: string;
  created_by: string;
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
