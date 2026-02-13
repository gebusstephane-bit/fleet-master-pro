/**
 * Types générés pour Supabase Database
 * À mettre à jour avec le schema réel après création des tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          siret: string;
          address: string;
          postal_code: string;
          city: string;
          country: string;
          phone: string;
          email: string;
          subscription_plan: 'starter' | 'pro' | 'business';
          subscription_status: 'active' | 'cancelled' | 'past_due' | 'trialing';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          max_vehicles: number;
          max_drivers: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT';
          company_id: string;
          avatar_url: string | null;
          created_at: string;
          last_sign_in: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'last_sign_in'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          registration_number: string;
          brand: string;
          model: string;
          year: number;
          type: 'truck' | 'van' | 'car' | 'motorcycle' | 'trailer';
          fuel_type: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
          vin: string;
          color: string;
          mileage: number;
          status: 'active' | 'inactive' | 'maintenance' | 'retired';
          next_maintenance_date: string | null;
          next_maintenance_mileage: number | null;
          insurance_expiry: string | null;
          technical_control_expiry: string | null;
          fuel_consumption_avg: number | null;
          current_latitude: number | null;
          current_longitude: number | null;
          current_speed: number | null;
          last_position_update: string | null;
          assigned_driver_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      drivers: {
        Row: {
          id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          birth_date: string;
          hire_date: string;
          status: 'active' | 'inactive' | 'on_leave' | 'suspended';
          license_number: string;
          license_type: 'C' | 'C1' | 'CE' | 'D' | 'D1' | 'B';
          license_expiry: string;
          medical_certificate_expiry: string | null;
          adr_certificate_expiry: string | null;
          safety_score: number;
          fuel_efficiency_score: number;
          total_distance_driven: number;
          avatar_url: string | null;
          current_vehicle_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>;
      };
      maintenance_records: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          type: 'preventive' | 'corrective' | 'revision';
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          scheduled_date: string;
          completed_date: string | null;
          description: string;
          cost: number | null;
          provider: string | null;
          invoice_number: string | null;
          mileage_at_maintenance: number;
          technician_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['maintenance_records']['Insert']>;
      };
      vehicle_documents: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          type: 'registration' | 'insurance' | 'technical_control' | 'license' | 'medical_certificate' | 'training_certificate';
          name: string;
          file_url: string;
          file_name: string;
          file_size: number;
          expiry_date: string | null;
          reminder_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicle_documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vehicle_documents']['Insert']>;
      };
      routes: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          driver_id: string;
          vehicle_id: string;
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
          planned_start_time: string;
          actual_start_time: string | null;
          planned_end_time: string;
          actual_end_time: string | null;
          total_distance: number | null;
          total_duration: number | null;
          fuel_consumed: number | null;
          start_location_lat: number;
          start_location_lng: number;
          end_location_lat: number;
          end_location_lng: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['routes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['routes']['Insert']>;
      };
      route_stops: {
        Row: {
          id: string;
          route_id: string;
          sequence: number;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          planned_arrival: string;
          actual_arrival: string | null;
          stop_duration: number;
          status: 'pending' | 'completed' | 'skipped';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['route_stops']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['route_stops']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          company_id: string;
          type: 'maintenance' | 'document_expiry' | 'vehicle_fault' | 'geofence';
          severity: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          message: string;
          entity_type: 'vehicle' | 'driver' | null;
          entity_id: string | null;
          is_read: boolean;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
