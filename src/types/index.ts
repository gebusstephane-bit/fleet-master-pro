/**
 * Types globaux FleetMaster Pro
 * Exporte tous les types de l'application
 */

import type { Database } from './supabase';

// ============================================
// TYPES DE BASE (depuis Supabase)
// ============================================

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Tables individuelles
export type Company = Tables['companies']['Row'];
export type Profile = Tables['profiles']['Row'];
export type Vehicle = Tables['vehicles']['Row'];
export type Driver = Tables['drivers']['Row'];
export type MaintenanceRecord = Tables['maintenance_records']['Row'];
export type Inspection = Tables['inspections']['Row'];
export type Route = Tables['routes']['Row'];
export type Alert = Tables['alerts']['Row'];

// Insert/Update types
export type CompanyInsert = Tables['companies']['Insert'];
export type CompanyUpdate = Tables['companies']['Update'];
export type ProfileInsert = Tables['profiles']['Insert'];
export type ProfileUpdate = Tables['profiles']['Update'];
export type VehicleInsert = Tables['vehicles']['Insert'];
export type VehicleUpdate = Tables['vehicles']['Update'];

// ============================================
// TYPES MÉTIER
// ============================================

export type UserRole = 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT';

export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'retired';
export type VehicleType = 'truck' | 'van' | 'car' | 'motorcycle' | 'trailer';
export type FuelType = 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';

export type DriverStatus = 'active' | 'inactive' | 'on_leave' | 'suspended';
export type DriverLicenseType = 'B' | 'C' | 'C1' | 'CE' | 'D' | 'D1';

export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'tire_change' | 'oil_change';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type InspectionStatus = 'pending' | 'completed' | 'failed';
export type DefectSeverity = 'CRITIQUE' | 'MAJEUR' | 'MINEUR';

export type RouteStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type StopPriority = 'LOW' | 'NORMAL' | 'HIGH';

export type AlertType = 'maintenance' | 'insurance' | 'license' | 'vehicle_issue' | 'safety';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SubscriptionPlan = 'starter' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

// ============================================
// TYPES POUR LES RELATIONS
// ============================================

export interface VehicleWithDriver extends Vehicle {
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null;
}

export interface VehicleWithDetails extends VehicleWithDriver {
  maintenance_count?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  fuel_consumption_avg?: number;
}

export interface DriverWithVehicle extends Driver {
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
  } | null;
}

export interface MaintenanceWithVehicle extends MaintenanceRecord {
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
    company_id: string;
  } | null;
}

export interface InspectionWithDetails extends Inspection {
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
  } | null;
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  inspector?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface RouteWithDetails extends Route {
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
  } | null;
  drivers?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  stops?: RouteStop[];
}

export interface RouteStop {
  id: string;
  route_id: string;
  sequence: number;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  arrival_time?: string;
  departure_time?: string;
  service_duration?: number;
  priority: StopPriority;
  notes?: string;
}

// ============================================
// TYPES UTILITAIRES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// TYPES POUR LES FORMS
// ============================================

export interface VehicleFormData {
  registration_number: string;
  brand: string;
  model: string;
  year: number;
  type: VehicleType;
  fuel_type: FuelType;
  color: string;
  mileage: number;
  vin?: string;
  status: VehicleStatus;
  purchase_date?: string;
  insurance_expiry?: string;
  technical_control_expiry?: string;
}

export interface DriverFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_type: DriverLicenseType;
  license_expiry: string;
  medical_certificate_expiry?: string;
  hire_date?: string;
}

// ============================================
// TYPES POUR LE DASHBOARD
// ============================================

export interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  totalDrivers: number;
  activeDrivers: number;
  pendingAlerts: number;
  criticalAlerts: number;
  routesToday: number;
  routesCompleted: number;
}

export interface ActivityItem {
  id: string;
  type: 'maintenance' | 'inspection' | 'route' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  link?: string;
}

// ============================================
// TYPES POUR L'AUTH
// ============================================

export interface UserWithCompany extends Profile {
  company?: Company | null;
}

export interface AuthContextType {
  user: UserWithCompany | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

// ============================================
// TYPES POUR LA CONFIGURATION
// ============================================

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  font: 'inter' | 'roboto' | 'poppins';
  fontSize: number;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  timezone: string;
  sidebarStyle: 'default' | 'floating' | 'compact';
  sidebarAutoCollapse: boolean;
  sidebarIconsOnly: boolean;
  reduceMotion: boolean;
  glassEffects: boolean;
  shadows: boolean;
}

// Re-export pour compatibilité
export type { Database };
