/**
 * Types Supabase Database — FleetMaster Pro
 * Mis à jour manuellement depuis les migrations SQL.
 * Pour régénérer automatiquement : `npx supabase gen types typescript`
 *
 * IMPORTANT: Every table MUST include `Relationships: []` to satisfy
 * the GenericTable constraint from @supabase/postgrest-js.
 * Without it, all queries resolve to `never`.
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
      // ============================================
      // COMPANIES
      // ============================================
      companies: {
        Row: {
          id: string;
          name: string;
          siret: string | null;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          country: string | null;
          phone: string | null;
          email: string | null;
          subscription_plan: string | null;
          subscription_status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          max_vehicles: number;
          max_drivers: number;
          logo_url: string | null;
          onboarding_completed: boolean;
          onboarding_started_at: string | null;
          onboarding_completed_at: string | null;
          fleet_size: number | null;
          industry: string | null;
          monthly_report_enabled: boolean;
          monthly_report_day: number;
          monthly_report_recipients: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          siret?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          country?: string | null;
          phone?: string | null;
          email?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          max_vehicles?: number;
          max_drivers?: number;
          logo_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_started_at?: string | null;
          onboarding_completed_at?: string | null;
          fleet_size?: number | null;
          industry?: string | null;
          monthly_report_enabled?: boolean;
          monthly_report_day?: number;
          monthly_report_recipients?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          siret?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          country?: string | null;
          phone?: string | null;
          email?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          max_vehicles?: number;
          max_drivers?: number;
          logo_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_started_at?: string | null;
          onboarding_completed_at?: string | null;
          fleet_size?: number | null;
          industry?: string | null;
          monthly_report_enabled?: boolean;
          monthly_report_day?: number;
          monthly_report_recipients?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // MONTHLY REPORT LOGS
      // ============================================
      monthly_report_logs: {
        Row: {
          id: string;
          company_id: string;
          period: string;
          sent_at: string;
          recipient_count: number;
          status: 'sent' | 'failed' | 'skipped';
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          period: string;
          sent_at?: string;
          recipient_count?: number;
          status?: 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          period?: string;
          sent_at?: string;
          recipient_count?: number;
          status?: 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_report_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          }
        ];
      };

      // ============================================
      // MONTHLY REPORT UNSUBSCRIBES
      // ============================================
      monthly_report_unsubscribes: {
        Row: {
          id: string;
          email: string;
          company_id: string;
          unsubscribed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          company_id: string;
          unsubscribed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          company_id?: string;
          unsubscribed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_report_unsubscribes_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          }
        ];
      };

      // ============================================
      // PROFILES
      // ============================================
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          company_id: string | null;
          role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' | 'CHAUFFEUR';
          is_active: boolean;
          avatar_url: string | null;
          phone: string | null;
          email_notifications: boolean;
          notify_maintenance: boolean;
          created_by: string | null;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          company_id?: string | null;
          role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' | 'CHAUFFEUR';
          is_active?: boolean;
          avatar_url?: string | null;
          phone?: string | null;
          email_notifications?: boolean;
          notify_maintenance?: boolean;
          created_by?: string | null;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          company_id?: string | null;
          role?: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT';
          is_active?: boolean;
          avatar_url?: string | null;
          phone?: string | null;
          email_notifications?: boolean;
          notify_maintenance?: boolean;
          created_by?: string | null;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };

      // Legacy alias kept for backward compat
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' | 'CHAUFFEUR';
          company_id: string | null;
          avatar_url: string | null;
          created_at: string;
          last_sign_in: string | null;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' | 'CHAUFFEUR';
          company_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          last_sign_in?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          role?: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT';
          company_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          last_sign_in?: string | null;
        };
        Relationships: [];
      };

      // ============================================
      // VEHICLES
      // ============================================
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          registration_number: string;
          brand: string;
          model: string;
          year: number;
          type: string;
          fuel_type: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
          vin: string | null;
          color: string | null;
          mileage: number;
          status: 'ACTIF' | 'INACTIF' | 'EN_MAINTENANCE' | 'ARCHIVE';
          category: string | null;
          has_fridge: boolean | null;
          next_maintenance_date: string | null;
          next_maintenance_mileage: number | null;
          next_service_due: string | null;
          next_service_mileage: number | null;
          insurance_company: string | null;
          insurance_policy_number: string | null;
          insurance_expiry: string | null;
          technical_control_expiry: string | null;
          technical_control_date: string | null;
          tachy_control_expiry: string | null;
          tachy_control_date: string | null;
          atp_expiry: string | null;
          atp_date: string | null;
          purchase_date: string | null;
          fuel_consumption_avg: number | null;
          dates_auto_calculated: boolean | null;
          maintenance_started_at: string | null;
          maintenance_ended_at: string | null;
          compatible_activities: string[] | null;
          detailed_type: string | null;
          deleted_at: string | null;
          current_latitude: number | null;
          current_longitude: number | null;
          current_speed: number | null;
          last_position_update: string | null;
          assigned_driver_id: string | null;
          // Alias temporaire pour compatibilité
          driver_id?: string | null;
          qr_code_url: string | null;
          qr_code_data: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          registration_number: string;
          brand: string;
          model: string;
          year: number;
          type: string;
          fuel_type: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
          vin?: string | null;
          color?: string | null;
          mileage?: number;
          status?: 'ACTIF' | 'INACTIF' | 'EN_MAINTENANCE' | 'ARCHIVE';
          category?: string | null;
          has_fridge?: boolean | null;
          next_maintenance_date?: string | null;
          next_maintenance_mileage?: number | null;
          next_service_due?: string | null;
          next_service_mileage?: number | null;
          insurance_company?: string | null;
          insurance_policy_number?: string | null;
          insurance_expiry?: string | null;
          technical_control_expiry?: string | null;
          technical_control_date?: string | null;
          tachy_control_expiry?: string | null;
          tachy_control_date?: string | null;
          atp_expiry?: string | null;
          atp_date?: string | null;
          purchase_date?: string | null;
          fuel_consumption_avg?: number | null;
          dates_auto_calculated?: boolean | null;
          maintenance_started_at?: string | null;
          maintenance_ended_at?: string | null;
          compatible_activities?: string[] | null;
          detailed_type?: string | null;
          deleted_at?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          current_speed?: number | null;
          last_position_update?: string | null;
          assigned_driver_id?: string | null;
          driver_id?: string | null;
          qr_code_url?: string | null;
          qr_code_data?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          registration_number?: string;
          brand?: string;
          model?: string;
          year?: number;
          type?: string;
          fuel_type?: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
          vin?: string | null;
          color?: string | null;
          mileage?: number;
          status?: 'ACTIF' | 'INACTIF' | 'EN_MAINTENANCE' | 'ARCHIVE';
          category?: string | null;
          has_fridge?: boolean | null;
          next_maintenance_date?: string | null;
          next_maintenance_mileage?: number | null;
          next_service_due?: string | null;
          next_service_mileage?: number | null;
          insurance_company?: string | null;
          insurance_policy_number?: string | null;
          insurance_expiry?: string | null;
          technical_control_expiry?: string | null;
          technical_control_date?: string | null;
          tachy_control_expiry?: string | null;
          tachy_control_date?: string | null;
          atp_expiry?: string | null;
          atp_date?: string | null;
          purchase_date?: string | null;
          fuel_consumption_avg?: number | null;
          dates_auto_calculated?: boolean | null;
          maintenance_started_at?: string | null;
          maintenance_ended_at?: string | null;
          compatible_activities?: string[] | null;
          detailed_type?: string | null;
          deleted_at?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          current_speed?: number | null;
          last_position_update?: string | null;
          assigned_driver_id?: string | null;
          driver_id?: string | null;
          qr_code_url?: string | null;
          qr_code_data?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey";
            columns: ["assigned_driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          }
        ];
      };

      // ============================================
      // DRIVERS
      // ============================================
      drivers: {
        Row: {
          id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          birth_date: string | null;
          hire_date: string | null;
          status: 'active' | 'inactive' | 'on_leave' | 'suspended' | 'terminated';
          license_number: string;
          license_type: string;
          license_expiry: string;
          medical_certificate_expiry: string | null;
          adr_certificate_expiry: string | null;
          adr_classes: string[] | null;
          fimo_expiry: string | null;
          fimo_date: string | null;
          fcos_expiry: string | null;
          qi_date: string | null;
          cqc_expiry_date: string | null;
          // Alias temporaire pour compatibilité
          cqc_expiry?: string | null;
          cqc_category: string | null;
          cqc_card_number: string | null;
          driver_card_number: string | null;
          driver_card_expiry: string | null;
          nationality: string | null;
          social_security_number: string | null;
          contract_type: 'CDI' | 'CDD' | 'Intérim' | 'Gérant' | 'Autre' | null;
          is_active: boolean;
          address: string | null;
          city: string | null;
          safety_score: number | null;
          fuel_efficiency_score: number | null;
          total_distance_driven: number | null;
          avatar_url: string | null;
          current_vehicle_id: string | null;
          user_id: string | null;
          has_app_access: boolean;
          app_access_enabled_at: string | null;
          app_access_enabled_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          birth_date?: string | null;
          hire_date?: string | null;
          status?: 'active' | 'inactive' | 'on_leave' | 'suspended' | 'terminated';
          license_number: string;
          license_type: string;
          license_expiry: string;
          medical_certificate_expiry?: string | null;
          adr_certificate_expiry?: string | null;
          adr_classes?: string[] | null;
          fimo_expiry?: string | null;
          fimo_date?: string | null;
          fcos_expiry?: string | null;
          qi_date?: string | null;
          cqc_expiry_date?: string | null;
          cqc_expiry?: string | null;
          cqc_category?: string | null;
          cqc_card_number?: string | null;
          driver_card_number?: string | null;
          driver_card_expiry?: string | null;
          nationality?: string | null;
          social_security_number?: string | null;
          contract_type?: 'CDI' | 'CDD' | 'Intérim' | 'Gérant' | 'Autre' | null;
          is_active?: boolean;
          address?: string | null;
          city?: string | null;
          safety_score?: number | null;
          fuel_efficiency_score?: number | null;
          total_distance_driven?: number | null;
          avatar_url?: string | null;
          current_vehicle_id?: string | null;
          user_id?: string | null;
          has_app_access?: boolean;
          app_access_enabled_at?: string | null;
          app_access_enabled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          birth_date?: string | null;
          hire_date?: string | null;
          status?: 'active' | 'inactive' | 'on_leave' | 'suspended' | 'terminated';
          license_number?: string;
          license_type?: string;
          license_expiry?: string;
          medical_certificate_expiry?: string | null;
          adr_certificate_expiry?: string | null;
          adr_classes?: string[] | null;
          fimo_expiry?: string | null;
          fimo_date?: string | null;
          fcos_expiry?: string | null;
          qi_date?: string | null;
          cqc_expiry_date?: string | null;
          cqc_expiry?: string | null;
          cqc_category?: string | null;
          cqc_card_number?: string | null;
          driver_card_number?: string | null;
          driver_card_expiry?: string | null;
          nationality?: string | null;
          social_security_number?: string | null;
          contract_type?: 'CDI' | 'CDD' | 'Intérim' | 'Gérant' | 'Autre' | null;
          is_active?: boolean;
          address?: string | null;
          city?: string | null;
          safety_score?: number | null;
          fuel_efficiency_score?: number | null;
          total_distance_driven?: number | null;
          avatar_url?: string | null;
          current_vehicle_id?: string | null;
          user_id?: string | null;
          has_app_access?: boolean;
          app_access_enabled_at?: string | null;
          app_access_enabled_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // DRIVER DOCUMENTS
      // ============================================
      driver_documents: {
        Row: {
          id: string;
          driver_id: string;
          company_id: string;
          document_type: 'permis' | 'carte_conducteur' | 'fco' | 'fimo' | 'visite_medicale' | 'adr' | 'qi' | 'autre';
          side: 'recto' | 'verso' | 'complet' | null;
          document_name: string;
          storage_path: string;
          file_size: number | null;
          mime_type: string | null;
          expiry_date: string | null;
          notes: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          company_id: string;
          document_type: 'permis' | 'carte_conducteur' | 'fco' | 'fimo' | 'visite_medicale' | 'adr' | 'qi' | 'autre';
          side?: 'recto' | 'verso' | 'complet' | null;
          document_name: string;
          storage_path: string;
          file_size?: number | null;
          mime_type?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          company_id?: string;
          document_type?: 'permis' | 'carte_conducteur' | 'fco' | 'fimo' | 'visite_medicale' | 'adr' | 'qi' | 'autre';
          side?: 'recto' | 'verso' | 'complet' | null;
          document_name?: string;
          storage_path?: string;
          file_size?: number | null;
          mime_type?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // MAINTENANCE RECORDS
      // ============================================
      maintenance_records: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          requested_by: string | null;
          type: string;
          description: string;
          priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          status: string;
          requested_at: string;
          validated_at: string | null;
          rdv_scheduled_at: string | null;
          rdv_confirmed_at: string | null;
          completed_at: string | null;
          service_date: string | null;
          garage_name: string | null;
          garage_address: string | null;
          garage_phone: string | null;
          rdv_date: string | null;
          rdv_time: string | null;
          estimated_cost: number | null;
          final_cost: number | null;
          cost: number | null;
          quote_document_url: string | null;
          invoice_document_url: string | null;
          photos_before: string[] | null;
          photos_after: string[] | null;
          notes_request: string | null;
          notes_validation: string | null;
          notes_completion: string | null;
          technician_notes: string | null;
          validation_token: string | null;
          rdv_token: string | null;
          estimated_days: number | null;
          estimated_hours: number | null;
          mileage_at_maintenance: number | null;
          mileage_at_service: number | null;
          next_service_date: string | null;
          service_type: string | null;
          scheduled_date: string | null;
          performed_by: string | null;
          parts_replaced: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id: string;
          requested_by?: string | null;
          type: string;
          description: string;
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          status?: string;
          requested_at?: string;
          validated_at?: string | null;
          rdv_scheduled_at?: string | null;
          rdv_confirmed_at?: string | null;
          completed_at?: string | null;
          service_date?: string | null;
          garage_name?: string | null;
          garage_address?: string | null;
          garage_phone?: string | null;
          rdv_date?: string | null;
          rdv_time?: string | null;
          estimated_cost?: number | null;
          final_cost?: number | null;
          cost?: number | null;
          quote_document_url?: string | null;
          invoice_document_url?: string | null;
          photos_before?: string[] | null;
          photos_after?: string[] | null;
          notes_request?: string | null;
          notes_validation?: string | null;
          notes_completion?: string | null;
          technician_notes?: string | null;
          validation_token?: string | null;
          rdv_token?: string | null;
          estimated_days?: number | null;
          estimated_hours?: number | null;
          mileage_at_maintenance?: number | null;
          mileage_at_service?: number | null;
          next_service_date?: string | null;
          service_type?: string | null;
          scheduled_date?: string | null;
          performed_by?: string | null;
          parts_replaced?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string;
          requested_by?: string | null;
          type?: string;
          description?: string;
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          status?: string;
          requested_at?: string;
          validated_at?: string | null;
          rdv_scheduled_at?: string | null;
          rdv_confirmed_at?: string | null;
          completed_at?: string | null;
          service_date?: string | null;
          garage_name?: string | null;
          garage_address?: string | null;
          garage_phone?: string | null;
          rdv_date?: string | null;
          rdv_time?: string | null;
          estimated_cost?: number | null;
          final_cost?: number | null;
          cost?: number | null;
          quote_document_url?: string | null;
          invoice_document_url?: string | null;
          photos_before?: string[] | null;
          photos_after?: string[] | null;
          notes_request?: string | null;
          notes_validation?: string | null;
          notes_completion?: string | null;
          technician_notes?: string | null;
          validation_token?: string | null;
          rdv_token?: string | null;
          estimated_days?: number | null;
          estimated_hours?: number | null;
          mileage_at_maintenance?: number | null;
          mileage_at_service?: number | null;
          next_service_date?: string | null;
          service_type?: string | null;
          scheduled_date?: string | null;
          performed_by?: string | null;
          parts_replaced?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      // ============================================
      // MAINTENANCE AGENDA
      // ============================================
      maintenance_agenda: {
        Row: {
          id: string;
          maintenance_id: string;
          company_id: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          title: string;
          description: string | null;
          event_type: 'RDV_GARAGE' | 'RETOUR_PREVU' | 'RAPPEL' | null;
          attendees: string[] | null;
          status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
          reminder_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          maintenance_id: string;
          company_id: string;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          title: string;
          description?: string | null;
          event_type?: 'RDV_GARAGE' | 'RETOUR_PREVU' | 'RAPPEL' | null;
          attendees?: string[] | null;
          status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          maintenance_id?: string;
          company_id?: string;
          event_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          title?: string;
          description?: string | null;
          event_type?: 'RDV_GARAGE' | 'RETOUR_PREVU' | 'RAPPEL' | null;
          attendees?: string[] | null;
          status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // MAINTENANCE STATUS HISTORY
      // ============================================
      maintenance_status_history: {
        Row: {
          id: string;
          maintenance_id: string;
          old_status: string | null;
          new_status: string;
          changed_by: string | null;
          changed_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          maintenance_id: string;
          old_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          changed_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          maintenance_id?: string;
          old_status?: string | null;
          new_status?: string;
          changed_by?: string | null;
          changed_at?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      // ============================================
      // VEHICLE DOCUMENTS
      // ============================================
      vehicle_documents: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          type: string;
          name: string;
          file_url: string;
          file_name: string;
          file_size: number;
          expiry_date: string | null;
          reminder_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id: string;
          type: string;
          name: string;
          file_url: string;
          file_name: string;
          file_size: number;
          expiry_date?: string | null;
          reminder_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string;
          type?: string;
          name?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number;
          expiry_date?: string | null;
          reminder_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // VEHICLE INSPECTIONS
      // ============================================
      vehicle_inspections: {
        Row: {
          id: string;
          vehicle_id: string;
          company_id: string;
          created_by: string | null;
          conducted_by: string | null;
          inspection_date: string;
          inspection_type: string | null;
          location: string | null;
          mileage: number;
          fuel_level: number;
          adblue_level: number | null;
          gnr_level: number | null;
          cleanliness_exterior: number;
          cleanliness_interior: number;
          cleanliness_cargo_area: number | null;
          compartment_c1_temp: number | null;
          compartment_c2_temp: number | null;
          tires_condition: Json;
          reported_defects: Json;
          photos: Json | null;
          photos_exterior: string[] | null;
          photos_interior: string[] | null;
          photos_cargo_area: string[] | null;
          photos_defects: string[] | null;
          driver_name: string | null;
          driver_signature: string | null;
          validated_by: string | null;
          validated_at: string | null;
          validation_notes: string | null;
          score: number | null;
          status: string;
          completed_at: string | null;
          linked_maintenance_id: string | null;
          qr_code_url: string | null;
          access_token: string | null;
          inspector_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          company_id: string;
          created_by?: string | null;
          conducted_by?: string | null;
          inspection_date: string;
          inspection_type?: string | null;
          location?: string | null;
          mileage: number;
          fuel_level: number;
          adblue_level?: number | null;
          gnr_level?: number | null;
          cleanliness_exterior: number;
          cleanliness_interior: number;
          cleanliness_cargo_area?: number | null;
          compartment_c1_temp?: number | null;
          compartment_c2_temp?: number | null;
          tires_condition?: Json;
          reported_defects?: Json;
          photos?: Json | null;
          photos_exterior?: string[] | null;
          photos_interior?: string[] | null;
          photos_cargo_area?: string[] | null;
          photos_defects?: string[] | null;
          driver_name?: string | null;
          driver_signature?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          validation_notes?: string | null;
          score?: number | null;
          status?: string;
          completed_at?: string | null;
          linked_maintenance_id?: string | null;
          qr_code_url?: string | null;
          access_token?: string | null;
          inspector_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          company_id?: string;
          created_by?: string | null;
          conducted_by?: string | null;
          inspection_date?: string;
          inspection_type?: string | null;
          location?: string | null;
          mileage?: number;
          fuel_level?: number;
          adblue_level?: number | null;
          gnr_level?: number | null;
          cleanliness_exterior?: number;
          cleanliness_interior?: number;
          cleanliness_cargo_area?: number | null;
          compartment_c1_temp?: number | null;
          compartment_c2_temp?: number | null;
          tires_condition?: Json;
          reported_defects?: Json;
          photos?: Json | null;
          photos_exterior?: string[] | null;
          photos_interior?: string[] | null;
          photos_cargo_area?: string[] | null;
          photos_defects?: string[] | null;
          driver_name?: string | null;
          driver_signature?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          validation_notes?: string | null;
          score?: number | null;
          status?: string;
          completed_at?: string | null;
          linked_maintenance_id?: string | null;
          qr_code_url?: string | null;
          access_token?: string | null;
          inspector_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Legacy alias
      inspections: {
        Row: {
          id: string;
          vehicle_id: string;
          company_id: string;
          created_by: string | null;
          conducted_by: string | null;
          inspection_date: string;
          inspection_type: string | null;
          location: string | null;
          mileage: number;
          fuel_level: number;
          adblue_level: number | null;
          gnr_level: number | null;
          cleanliness_exterior: number;
          cleanliness_interior: number;
          cleanliness_cargo_area: number | null;
          compartment_c1_temp: number | null;
          compartment_c2_temp: number | null;
          tires_condition: Json;
          reported_defects: Json;
          photos: Json | null;
          photos_exterior: string[] | null;
          photos_interior: string[] | null;
          photos_cargo_area: string[] | null;
          photos_defects: string[] | null;
          driver_name: string | null;
          driver_signature: string | null;
          validated_by: string | null;
          validated_at: string | null;
          validation_notes: string | null;
          score: number | null;
          status: string;
          completed_at: string | null;
          linked_maintenance_id: string | null;
          qr_code_url: string | null;
          access_token: string | null;
          inspector_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          company_id: string;
          created_by?: string | null;
          conducted_by?: string | null;
          inspection_date: string;
          inspection_type?: string | null;
          location?: string | null;
          mileage: number;
          fuel_level: number;
          adblue_level?: number | null;
          gnr_level?: number | null;
          cleanliness_exterior: number;
          cleanliness_interior: number;
          cleanliness_cargo_area?: number | null;
          compartment_c1_temp?: number | null;
          compartment_c2_temp?: number | null;
          tires_condition?: Json;
          reported_defects?: Json;
          photos?: Json | null;
          photos_exterior?: string[] | null;
          photos_interior?: string[] | null;
          photos_cargo_area?: string[] | null;
          photos_defects?: string[] | null;
          driver_name?: string | null;
          driver_signature?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          validation_notes?: string | null;
          score?: number | null;
          status?: string;
          completed_at?: string | null;
          linked_maintenance_id?: string | null;
          qr_code_url?: string | null;
          access_token?: string | null;
          inspector_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          company_id?: string;
          created_by?: string | null;
          conducted_by?: string | null;
          inspection_date?: string;
          inspection_type?: string | null;
          location?: string | null;
          mileage?: number;
          fuel_level?: number;
          adblue_level?: number | null;
          gnr_level?: number | null;
          cleanliness_exterior?: number;
          cleanliness_interior?: number;
          cleanliness_cargo_area?: number | null;
          compartment_c1_temp?: number | null;
          compartment_c2_temp?: number | null;
          tires_condition?: Json;
          reported_defects?: Json;
          photos?: Json | null;
          photos_exterior?: string[] | null;
          photos_interior?: string[] | null;
          photos_cargo_area?: string[] | null;
          photos_defects?: string[] | null;
          driver_name?: string | null;
          driver_signature?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          validation_notes?: string | null;
          score?: number | null;
          status?: string;
          completed_at?: string | null;
          linked_maintenance_id?: string | null;
          qr_code_url?: string | null;
          access_token?: string | null;
          inspector_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };

      // ============================================
      // ROUTES
      // ============================================
      routes: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          driver_id: string | null;
          vehicle_id: string | null;
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
          planned_start_time: string | null;
          actual_start_time: string | null;
          planned_end_time: string | null;
          actual_end_time: string | null;
          total_distance: number | null;
          total_duration: number | null;
          fuel_consumed: number | null;
          start_location_lat: number | null;
          start_location_lng: number | null;
          end_location_lat: number | null;
          end_location_lng: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          driver_id?: string | null;
          vehicle_id?: string | null;
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
          planned_start_time?: string | null;
          actual_start_time?: string | null;
          planned_end_time?: string | null;
          actual_end_time?: string | null;
          total_distance?: number | null;
          total_duration?: number | null;
          fuel_consumed?: number | null;
          start_location_lat?: number | null;
          start_location_lng?: number | null;
          end_location_lat?: number | null;
          end_location_lng?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          driver_id?: string | null;
          vehicle_id?: string | null;
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
          planned_start_time?: string | null;
          actual_start_time?: string | null;
          planned_end_time?: string | null;
          actual_end_time?: string | null;
          total_distance?: number | null;
          total_duration?: number | null;
          fuel_consumed?: number | null;
          start_location_lat?: number | null;
          start_location_lng?: number | null;
          end_location_lat?: number | null;
          end_location_lng?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // ROUTE STOPS
      // ============================================
      route_stops: {
        Row: {
          id: string;
          route_id: string;
          sequence: number;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          planned_arrival: string | null;
          actual_arrival: string | null;
          stop_duration: number;
          status: 'pending' | 'completed' | 'skipped';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          sequence: number;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          planned_arrival?: string | null;
          actual_arrival?: string | null;
          stop_duration?: number;
          status?: 'pending' | 'completed' | 'skipped';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          route_id?: string;
          sequence?: number;
          name?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          planned_arrival?: string | null;
          actual_arrival?: string | null;
          stop_duration?: number;
          status?: 'pending' | 'completed' | 'skipped';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // ALERTS
      // ============================================
      alerts: {
        Row: {
          id: string;
          company_id: string;
          type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          message: string;
          entity_type: string | null;
          entity_id: string | null;
          is_read: boolean;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          message: string;
          entity_type?: string | null;
          entity_id?: string | null;
          is_read?: boolean;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          type?: string;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          title?: string;
          message?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          is_read?: boolean;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // SUBSCRIPTIONS (Stripe billing)
      // ============================================
      subscriptions: {
        Row: {
          id: string;
          company_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          plan: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          trial_ends_at: string | null;
          canceled_at: string | null;
          vehicle_limit: number;
          user_limit: number;
          features: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan: string;
          status: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          canceled_at?: string | null;
          vehicle_limit?: number;
          user_limit?: number;
          features?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          canceled_at?: string | null;
          vehicle_limit?: number;
          user_limit?: number;
          features?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // NOTIFICATIONS (in-app)
      // ============================================
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          link: string | null;
          priority: 'low' | 'normal' | 'high' | 'critical';
          read: boolean;
          read_at: string | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          link?: string | null;
          priority?: 'low' | 'normal' | 'high' | 'critical';
          read?: boolean;
          read_at?: string | null;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          link?: string | null;
          priority?: 'low' | 'normal' | 'high' | 'critical';
          read?: boolean;
          read_at?: string | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // ACTIVITY LOGS
      // ============================================
      activity_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          action_type: string;
          entity_type: string | null;
          entity_id: string | null;
          entity_name: string | null;
          description: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          action_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          description?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          action_type?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          description?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // FUEL RECORDS
      // ============================================
      fuel_records: {
        Row: {
          id: string;
          company_id: string | null;
          vehicle_id: string;
          driver_id: string | null;
          date: string;
          quantity_liters: number;
          price_total: number;
          price_per_liter: number | null;
          mileage_at_fill: number;
          fuel_type: string;
          station_name: string | null;
          consumption_l_per_100km: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          vehicle_id: string;
          driver_id?: string | null;
          date: string;
          quantity_liters: number;
          price_total: number;
          price_per_liter?: number | null;
          mileage_at_fill: number;
          fuel_type: string;
          station_name?: string | null;
          consumption_l_per_100km?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          vehicle_id?: string;
          driver_id?: string | null;
          date?: string;
          quantity_liters?: number;
          price_total?: number;
          price_per_liter?: number | null;
          mileage_at_fill?: number;
          fuel_type?: string;
          station_name?: string | null;
          consumption_l_per_100km?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // USER APPEARANCE SETTINGS
      // ============================================
      user_appearance_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: 'light' | 'dark' | 'system';
          primary_color: string;
          custom_color: string | null;
          density: 'compact' | 'comfortable' | 'spacious';
          font: string;
          font_size: number;
          language: string;
          date_format: string;
          time_format: string;
          currency: string;
          timezone: string;
          sidebar_style: string;
          sidebar_auto_collapse: boolean;
          sidebar_icons_only: boolean;
          reduce_motion: boolean;
          glass_effects: boolean;
          shadows: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: 'light' | 'dark' | 'system';
          primary_color?: string;
          custom_color?: string | null;
          density?: 'compact' | 'comfortable' | 'spacious';
          font?: string;
          font_size?: number;
          language?: string;
          date_format?: string;
          time_format?: string;
          currency?: string;
          timezone?: string;
          sidebar_style?: string;
          sidebar_auto_collapse?: boolean;
          sidebar_icons_only?: boolean;
          reduce_motion?: boolean;
          glass_effects?: boolean;
          shadows?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: 'light' | 'dark' | 'system';
          primary_color?: string;
          custom_color?: string | null;
          density?: 'compact' | 'comfortable' | 'spacious';
          font?: string;
          font_size?: number;
          language?: string;
          date_format?: string;
          time_format?: string;
          currency?: string;
          timezone?: string;
          sidebar_style?: string;
          sidebar_auto_collapse?: boolean;
          sidebar_icons_only?: boolean;
          reduce_motion?: boolean;
          glass_effects?: boolean;
          shadows?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // USER NOTIFICATION PREFERENCES
      // ============================================
      user_notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          alert_maintenance: boolean;
          alert_inspection: boolean;
          alert_routes: boolean;
          alert_documents_expiry: boolean;
          alert_fuel: boolean;
          alert_critical_only: boolean;
          email_enabled: boolean;
          sms_enabled: boolean;
          push_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          alert_maintenance?: boolean;
          alert_inspection?: boolean;
          alert_routes?: boolean;
          alert_documents_expiry?: boolean;
          alert_fuel?: boolean;
          alert_critical_only?: boolean;
          email_enabled?: boolean;
          sms_enabled?: boolean;
          push_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          alert_maintenance?: boolean;
          alert_inspection?: boolean;
          alert_routes?: boolean;
          alert_documents_expiry?: boolean;
          alert_fuel?: boolean;
          alert_critical_only?: boolean;
          email_enabled?: boolean;
          sms_enabled?: boolean;
          push_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // USER LOGIN HISTORY
      // ============================================
      user_login_history: {
        Row: {
          id: string;
          user_id: string;
          ip_address: string | null;
          user_agent: string | null;
          login_at: string;
          logout_at: string | null;
          success: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          ip_address?: string | null;
          user_agent?: string | null;
          login_at?: string;
          logout_at?: string | null;
          success: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          login_at?: string;
          logout_at?: string | null;
          success?: boolean;
        };
        Relationships: [];
      };

      // ============================================
      // USER INVITATIONS
      // ============================================
      user_invitations: {
        Row: {
          id: string;
          email: string;
          company_id: string;
          invited_by: string | null;
          role: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          company_id: string;
          invited_by?: string | null;
          role: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          company_id?: string;
          invited_by?: string | null;
          role?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          used_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // PUSH SUBSCRIPTIONS (Web Push API)
      // ============================================
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // SOS PROVIDERS
      // ============================================
      sos_providers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          specialty: string;
          phone_standard: string | null;
          phone_24h: string | null;
          max_distance_km: number;
          city: string;
          address: string | null;
          vehicle_brands: string[] | null;
          is_active: boolean;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          specialty: string;
          phone_standard?: string | null;
          phone_24h?: string | null;
          max_distance_km?: number;
          city: string;
          address?: string | null;
          vehicle_brands?: string[] | null;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          specialty?: string;
          phone_standard?: string | null;
          phone_24h?: string | null;
          max_distance_km?: number;
          city?: string;
          address?: string | null;
          vehicle_brands?: string[] | null;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // SOS EMERGENCY CONTRACTS
      // ============================================
      sos_emergency_contracts: {
        Row: {
          id: string;
          user_id: string;
          service_type: string;
          name: string;
          phone_number: string;
          contract_ref: string | null;
          instructions: string;
          for_distance: 'close' | 'far' | 'both';
          for_immobilized: boolean | null;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_type: string;
          name: string;
          phone_number: string;
          contract_ref?: string | null;
          instructions: string;
          for_distance?: 'close' | 'far' | 'both';
          for_immobilized?: boolean | null;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_type?: string;
          name?: string;
          phone_number?: string;
          contract_ref?: string | null;
          instructions?: string;
          for_distance?: 'close' | 'far' | 'both';
          for_immobilized?: boolean | null;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // SOS HISTORY
      // ============================================
      sos_history: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string | null;
          breakdown_type: string;
          distance_category: string;
          vehicle_state: string;
          solution_type: string;
          solution_name: string | null;
          solution_phone: string | null;
          location_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id?: string | null;
          breakdown_type: string;
          distance_category: string;
          vehicle_state: string;
          solution_type: string;
          solution_name?: string | null;
          solution_phone?: string | null;
          location_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_id?: string | null;
          breakdown_type?: string;
          distance_category?: string;
          vehicle_state?: string;
          solution_type?: string;
          solution_name?: string | null;
          solution_phone?: string | null;
          location_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // EMERGENCY RULES
      // ============================================
      emergency_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          rule_type: string;
          applies_to_breakdown_types: string[];
          applies_if_immobilized: boolean | null;
          applies_on_highway: boolean;
          phone_number: string;
          contact_name: string | null;
          contract_reference: string | null;
          instructions: string;
          display_color: string;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          rule_type: string;
          applies_to_breakdown_types?: string[];
          applies_if_immobilized?: boolean | null;
          applies_on_highway?: boolean;
          phone_number: string;
          contact_name?: string | null;
          contract_reference?: string | null;
          instructions: string;
          display_color?: string;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          rule_type?: string;
          applies_to_breakdown_types?: string[];
          applies_if_immobilized?: boolean | null;
          applies_on_highway?: boolean;
          phone_number?: string;
          contact_name?: string | null;
          contract_reference?: string | null;
          instructions?: string;
          display_color?: string;
          priority?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // AI PREDICTIONS
      // ============================================
      ai_predictions: {
        Row: {
          id: string;
          vehicle_id: string;
          failure_probability: number;
          predicted_failure_type: string | null;
          confidence_score: number | null;
          prediction_horizon_days: number | null;
          features_used: Json | null;
          recommended_action: string | null;
          estimated_roi: number | null;
          urgency_level: 'low' | 'medium' | 'high' | 'critical' | null;
          actual_failure_occurred: boolean | null;
          feedback_provided_at: string | null;
          feedback_notes: string | null;
          model_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          failure_probability: number;
          predicted_failure_type?: string | null;
          confidence_score?: number | null;
          prediction_horizon_days?: number | null;
          features_used?: Json | null;
          recommended_action?: string | null;
          estimated_roi?: number | null;
          urgency_level?: 'low' | 'medium' | 'high' | 'critical' | null;
          actual_failure_occurred?: boolean | null;
          feedback_provided_at?: string | null;
          feedback_notes?: string | null;
          model_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          failure_probability?: number;
          predicted_failure_type?: string | null;
          confidence_score?: number | null;
          prediction_horizon_days?: number | null;
          features_used?: Json | null;
          recommended_action?: string | null;
          estimated_roi?: number | null;
          urgency_level?: 'low' | 'medium' | 'high' | 'critical' | null;
          actual_failure_occurred?: boolean | null;
          feedback_provided_at?: string | null;
          feedback_notes?: string | null;
          model_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // SUPPORT TICKETS
      // ============================================
      support_tickets: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          subject: string;
          description: string;
          category: 'bug' | 'billing' | 'feature' | 'training' | 'other';
          status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
          priority: 'low' | 'medium' | 'high' | 'critical';
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          subject: string;
          description: string;
          category?: 'bug' | 'billing' | 'feature' | 'training' | 'other';
          status?: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          subject?: string;
          description?: string;
          category?: 'bug' | 'billing' | 'feature' | 'training' | 'other';
          status?: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_tickets_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // ============================================
      // SUPPORT MESSAGES
      // ============================================
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          author_id: string | null;
          author_type: 'client' | 'admin' | 'system';
          content: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_id?: string | null;
          author_type?: 'client' | 'admin' | 'system';
          content: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_id?: string | null;
          author_type?: 'client' | 'admin' | 'system';
          content?: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // USER SERVICE PROVIDERS (legacy SOS)
      // ============================================
      user_service_providers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // VEHICLE DRIVER ASSIGNMENTS
      // ============================================
      vehicle_driver_assignments: {
        Row: {
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
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          driver_id: string;
          company_id: string;
          is_primary?: boolean;
          start_date?: string;
          end_date?: string | null;
          notes?: string | null;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          driver_id?: string;
          company_id?: string;
          is_primary?: boolean;
          start_date?: string;
          end_date?: string | null;
          notes?: string | null;
          assigned_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // WEBHOOK ERRORS
      // ============================================
      webhook_errors: {
        Row: {
          id: string;
          event_type: string | null;
          error_message: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type?: string | null;
          error_message?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string | null;
          error_message?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // VEHICLE AXLE CONFIGS
      // ============================================
      vehicle_axle_configs: {
        Row: {
          id: string;
          vehicle_id: string;
          company_id: string;
          axle_formula: string;
          axle_details: Json;
          reference_dimensions: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          company_id: string;
          axle_formula: string;
          axle_details?: Json;
          reference_dimensions?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          company_id?: string;
          axle_formula?: string;
          axle_details?: Json;
          reference_dimensions?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // TIRES
      // ============================================
      tires: {
        Row: {
          id: string;
          company_id: string;
          serial_number: string | null;
          dot_code: string | null;
          manufacture_week: number | null;
          manufacture_year: number | null;
          brand: string;
          model: string | null;
          dimensions: string;
          load_index: string | null;
          speed_index: string | null;
          tire_type: 'regional' | 'longue_distance' | 'urbain' | 'tout_terrain' | 'hiver' | 'remorque' | 'basse_hauteur' | null;
          status: 'in_stock' | 'in_use' | 'retreaded' | 'scrapped';
          tread_depth_new: number | null;
          tread_depth_current: number | null;
          tread_depth_measured_at: string | null;
          tread_depth_measured_km: number | null;
          purchase_price: number | null;
          purchase_date: string | null;
          supplier: string | null;
          invoice_reference: string | null;
          is_retreaded: boolean;
          retreaded_count: number;
          retreaded_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          serial_number?: string | null;
          dot_code?: string | null;
          manufacture_week?: number | null;
          manufacture_year?: number | null;
          brand: string;
          model?: string | null;
          dimensions: string;
          load_index?: string | null;
          speed_index?: string | null;
          tire_type?: 'regional' | 'longue_distance' | 'urbain' | 'tout_terrain' | 'hiver' | 'remorque' | 'basse_hauteur' | null;
          status?: 'in_stock' | 'in_use' | 'retreaded' | 'scrapped';
          tread_depth_new?: number | null;
          tread_depth_current?: number | null;
          tread_depth_measured_at?: string | null;
          tread_depth_measured_km?: number | null;
          purchase_price?: number | null;
          purchase_date?: string | null;
          supplier?: string | null;
          invoice_reference?: string | null;
          is_retreaded?: boolean;
          retreaded_count?: number;
          retreaded_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          serial_number?: string | null;
          dot_code?: string | null;
          manufacture_week?: number | null;
          manufacture_year?: number | null;
          brand?: string;
          model?: string | null;
          dimensions?: string;
          load_index?: string | null;
          speed_index?: string | null;
          tire_type?: 'regional' | 'longue_distance' | 'urbain' | 'tout_terrain' | 'hiver' | 'remorque' | 'basse_hauteur' | null;
          status?: 'in_stock' | 'in_use' | 'retreaded' | 'scrapped';
          tread_depth_new?: number | null;
          tread_depth_current?: number | null;
          tread_depth_measured_at?: string | null;
          tread_depth_measured_km?: number | null;
          purchase_price?: number | null;
          purchase_date?: string | null;
          supplier?: string | null;
          invoice_reference?: string | null;
          is_retreaded?: boolean;
          retreaded_count?: number;
          retreaded_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // TIRE MOUNTINGS
      // ============================================
      tire_mountings: {
        Row: {
          id: string;
          tire_id: string;
          vehicle_id: string;
          company_id: string;
          axle_position: string;
          mount_type: 'simple' | 'jumele_ext' | 'jumele_int';
          mounted_date: string;
          mounted_km: number;
          unmounted_date: string | null;
          unmounted_km: number | null;
          tread_depth_at_unmount: number | null;
          reason_unmounted: 'worn' | 'puncture' | 'rotation' | 'seasonal' | 'vehicle_sold' | 'inspection' | 'retreading' | 'other' | null;
          destination: 'stock' | 'retreading' | 'scrap' | 'sold' | null;
          performed_by: string | null;
          garage_name: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tire_id: string;
          vehicle_id: string;
          company_id: string;
          axle_position: string;
          mount_type: 'simple' | 'jumele_ext' | 'jumele_int';
          mounted_date: string;
          mounted_km: number;
          unmounted_date?: string | null;
          unmounted_km?: number | null;
          tread_depth_at_unmount?: number | null;
          reason_unmounted?: 'worn' | 'puncture' | 'rotation' | 'seasonal' | 'vehicle_sold' | 'inspection' | 'retreading' | 'other' | null;
          destination?: 'stock' | 'retreading' | 'scrap' | 'sold' | null;
          performed_by?: string | null;
          garage_name?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tire_id?: string;
          vehicle_id?: string;
          company_id?: string;
          axle_position?: string;
          mount_type?: 'simple' | 'jumele_ext' | 'jumele_int';
          mounted_date?: string;
          mounted_km?: number;
          unmounted_date?: string | null;
          unmounted_km?: number | null;
          tread_depth_at_unmount?: number | null;
          reason_unmounted?: 'worn' | 'puncture' | 'rotation' | 'seasonal' | 'vehicle_sold' | 'inspection' | 'retreading' | 'other' | null;
          destination?: 'stock' | 'retreading' | 'scrap' | 'sold' | null;
          performed_by?: string | null;
          garage_name?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // TIRE DEPTH CHECKS
      // ============================================
      tire_depth_checks: {
        Row: {
          id: string;
          mounting_id: string;
          tire_id: string;
          vehicle_id: string;
          company_id: string;
          check_date: string;
          check_km: number;
          tread_depth: number;
          depth_inner: number | null;
          depth_center: number | null;
          depth_outer: number | null;
          pressure_bar: number | null;
          checked_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mounting_id: string;
          tire_id: string;
          vehicle_id: string;
          company_id: string;
          check_date?: string;
          check_km: number;
          tread_depth: number;
          depth_inner?: number | null;
          depth_center?: number | null;
          depth_outer?: number | null;
          pressure_bar?: number | null;
          checked_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mounting_id?: string;
          tire_id?: string;
          vehicle_id?: string;
          company_id?: string;
          check_date?: string;
          check_km?: number;
          tread_depth?: number;
          depth_inner?: number | null;
          depth_center?: number | null;
          depth_outer?: number | null;
          pressure_bar?: number | null;
          checked_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // MAINTENANCE RULES
      // ============================================
      maintenance_rules: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          description: string | null;
          category: string | null;
          trigger_type: string;
          interval_km: number | null;
          interval_months: number | null;
          applicable_vehicle_types: string[] | null;
          applicable_fuel_types: string[] | null;
          alert_km_before: number | null;
          alert_days_before: number | null;
          is_active: boolean;
          is_system_rule: boolean;
          priority: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          name: string;
          description?: string | null;
          category?: string | null;
          trigger_type: string;
          interval_km?: number | null;
          interval_months?: number | null;
          applicable_vehicle_types?: string[] | null;
          applicable_fuel_types?: string[] | null;
          alert_km_before?: number | null;
          alert_days_before?: number | null;
          is_active?: boolean;
          is_system_rule?: boolean;
          priority?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          name?: string;
          description?: string | null;
          category?: string | null;
          trigger_type?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          applicable_vehicle_types?: string[] | null;
          applicable_fuel_types?: string[] | null;
          alert_km_before?: number | null;
          alert_days_before?: number | null;
          is_active?: boolean;
          is_system_rule?: boolean;
          priority?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // MAINTENANCE PREDICTIONS (cache cron)
      // ============================================
      maintenance_predictions: {
        Row: {
          id: string;
          vehicle_id: string;
          rule_id: string;
          company_id: string;
          last_maintenance_id: string | null;
          last_maintenance_date: string | null;
          last_maintenance_km: number | null;
          current_km: number;
          estimated_due_km: number | null;
          estimated_due_date: string | null;
          km_until_due: number | null;
          days_until_due: number | null;
          status: 'ok' | 'upcoming' | 'due' | 'overdue';
          priority: 'low' | 'medium' | 'high' | 'critical';
          alert_sent_at: string | null;
          alert_acknowledged_at: string | null;
          calculated_at: string;
          is_initialized: boolean;
          initialization_note: string | null;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          rule_id: string;
          company_id: string;
          last_maintenance_id?: string | null;
          last_maintenance_date?: string | null;
          last_maintenance_km?: number | null;
          current_km: number;
          estimated_due_km?: number | null;
          estimated_due_date?: string | null;
          km_until_due?: number | null;
          days_until_due?: number | null;
          status: 'ok' | 'upcoming' | 'due' | 'overdue';
          priority: 'low' | 'medium' | 'high' | 'critical';
          alert_sent_at?: string | null;
          alert_acknowledged_at?: string | null;
          calculated_at?: string;
          is_initialized?: boolean;
          initialization_note?: string | null;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          rule_id?: string;
          company_id?: string;
          last_maintenance_id?: string | null;
          last_maintenance_date?: string | null;
          last_maintenance_km?: number | null;
          current_km?: number;
          estimated_due_km?: number | null;
          estimated_due_date?: string | null;
          km_until_due?: number | null;
          days_until_due?: number | null;
          status?: 'ok' | 'upcoming' | 'due' | 'overdue';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          alert_sent_at?: string | null;
          alert_acknowledged_at?: string | null;
          calculated_at?: string;
          is_initialized?: boolean;
          initialization_note?: string | null;
        };
        Relationships: [];
      };

      // ============================================
      // INCIDENTS (Gestion des sinistres)
      // ============================================
      incidents: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          driver_id: string | null;
          incident_number: string | null;
          incident_date: string;
          location_description: string | null;
          incident_type: 'accident_matériel' | 'accident_corporel' | 'vol' | 'vandalisme' | 'incendie' | 'panne_grave' | 'autre';
          severity: 'mineur' | 'moyen' | 'grave' | 'très_grave' | null;
          circumstances: string | null;
          third_party_involved: boolean;
          third_party_info: Record<string, unknown> | null;
          injuries_description: string | null;
          witnesses: unknown[] | null;
          insurance_company: string | null;
          insurance_policy_number: string | null;
          claim_number: string | null;
          claim_date: string | null;
          claim_status: 'non_declaré' | 'déclaré' | 'en_instruction' | 'accepté' | 'refusé' | 'réglé';
          estimated_damage: number | null;
          final_settlement: number | null;
          status: 'ouvert' | 'en_cours' | 'clôturé';
          notes: string | null;
          reported_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id: string;
          driver_id?: string | null;
          incident_number?: string | null;
          incident_date: string;
          location_description?: string | null;
          incident_type: string;
          severity?: string | null;
          circumstances?: string | null;
          third_party_involved?: boolean;
          third_party_info?: Record<string, unknown> | null;
          injuries_description?: string | null;
          witnesses?: unknown[] | null;
          insurance_company?: string | null;
          insurance_policy_number?: string | null;
          claim_number?: string | null;
          claim_date?: string | null;
          claim_status?: string;
          estimated_damage?: number | null;
          final_settlement?: number | null;
          status?: string;
          notes?: string | null;
          reported_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string;
          driver_id?: string | null;
          incident_number?: string | null;
          incident_date?: string;
          location_description?: string | null;
          incident_type?: string;
          severity?: string | null;
          circumstances?: string | null;
          third_party_involved?: boolean;
          third_party_info?: Record<string, unknown> | null;
          injuries_description?: string | null;
          witnesses?: unknown[] | null;
          insurance_company?: string | null;
          insurance_policy_number?: string | null;
          claim_number?: string | null;
          claim_date?: string | null;
          claim_status?: string;
          estimated_damage?: number | null;
          final_settlement?: number | null;
          status?: string;
          notes?: string | null;
          reported_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_maintenance_record_id_fkey";
            columns: ["maintenance_record_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          }
        ];
      };

      // ============================================
      // INCIDENT_DOCUMENTS
      // ============================================
      incident_documents: {
        Row: {
          id: string;
          incident_id: string;
          document_type: 'constat' | 'photo' | 'rapport_police' | 'devis' | 'facture' | 'autre' | null;
          storage_path: string;
          file_name: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          document_type?: string | null;
          storage_path: string;
          file_name?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          incident_id?: string;
          document_type?: string | null;
          storage_path?: string;
          file_name?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };

      // ============================================
      // COMPANY ACTIVITIES (Transport activities multi-activités)
      // ============================================
      company_activities: {
        Row: {
          id: string;
          company_id: string;
          activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          is_primary: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          is_primary?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          activity?: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          is_primary?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'company_activities_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          }
        ];
      };

      // ============================================
      // COMPLIANCE RULES (Règles de conformité réglementaire)
      // ============================================
      compliance_rules: {
        Row: {
          id: string;
          activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          document_code: string;
          document_name: string;
          frequency_months: number;
          is_mandatory: boolean;
          requires_equipment: boolean;
          equipment_list: string[] | null;
          applicable_vehicle_types: string[] | null;
          reminder_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          document_code: string;
          document_name: string;
          frequency_months: number;
          is_mandatory?: boolean;
          requires_equipment?: boolean;
          equipment_list?: string[] | null;
          applicable_vehicle_types?: string[] | null;
          reminder_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity?: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          document_code?: string;
          document_name?: string;
          frequency_months?: number;
          is_mandatory?: boolean;
          requires_equipment?: boolean;
          equipment_list?: string[] | null;
          applicable_vehicle_types?: string[] | null;
          reminder_days?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      // ============================================
      // VEHICLE ACTIVITY ASSIGNMENTS (Historique des activités par véhicule)
      // ============================================
      vehicle_activity_assignments: {
        Row: {
          id: string;
          vehicle_id: string;
          activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          assigned_by: string | null;
          start_date: string;
          end_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          assigned_by?: string | null;
          start_date?: string;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          activity?: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS';
          assigned_by?: string | null;
          start_date?: string;
          end_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_activity_assignments_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          }
        ];
      };
    };

    Views: {
      company_subscription: {
        Row: {
          company_id: string;
          company_name: string;
          plan: string | null;
          status: string | null;
          vehicle_limit: number | null;
          user_limit: number | null;
          current_period_end: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_vehicle_count: number;
          current_user_count: number;
          can_add_vehicle: boolean;
          can_add_user: boolean;
        };
        Relationships: [];
      };
      maintenance_with_details: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          requested_by: string | null;
          type: string;
          description: string;
          priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          status: string;
          requested_at: string;
          validated_at: string | null;
          rdv_scheduled_at: string | null;
          rdv_confirmed_at: string | null;
          completed_at: string | null;
          service_date: string | null;
          garage_name: string | null;
          garage_address: string | null;
          garage_phone: string | null;
          rdv_date: string | null;
          rdv_time: string | null;
          estimated_cost: number | null;
          final_cost: number | null;
          cost: number | null;
          quote_document_url: string | null;
          invoice_document_url: string | null;
          photos_before: string[] | null;
          photos_after: string[] | null;
          notes_request: string | null;
          notes_validation: string | null;
          notes_completion: string | null;
          technician_notes: string | null;
          validation_token: string | null;
          rdv_token: string | null;
          estimated_days: number | null;
          estimated_hours: number | null;
          mileage_at_maintenance: number | null;
          mileage_at_service: number | null;
          next_service_date: string | null;
          service_type: string | null;
          scheduled_date: string | null;
          performed_by: string | null;
          parts_replaced: string[] | null;
          created_at: string;
          updated_at: string;
          // Joined from vehicles
          vehicle_registration: string | null;
          vehicle_brand: string | null;
          vehicle_model: string | null;
          vehicle_mileage: number | null;
          // Joined from users
          requester_first_name: string | null;
          requester_last_name: string | null;
          requester_email: string | null;
        };
        Relationships: [];
      };
      agenda_with_details: {
        Row: {
          id: string;
          maintenance_id: string;
          company_id: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          title: string;
          description: string | null;
          event_type: 'RDV_GARAGE' | 'RETOUR_PREVU' | 'RAPPEL' | null;
          attendees: string[] | null;
          status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
          reminder_sent: boolean;
          created_at: string;
          updated_at: string;
          // Joined from maintenance_records
          vehicle_id: string | null;
          garage_name: string | null;
          garage_address: string | null;
          garage_phone: string | null;
          maintenance_type: string | null;
          priority: string | null;
          maintenance_status: string | null;
          // Joined from vehicles
          vehicle_registration: string | null;
        };
        Relationships: [];
      };
      vehicle_current_activity: {
        Row: {
          vehicle_id: string;
          registration_number: string;
          vehicle_type: string;
          company_id: string;
          current_activity: 
            | 'MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS' | null;
          activity_start_date: string | null;
          activity_notes: string | null;
          inferred_activities: 
            | ('MARCHANDISES_GENERALES'
            | 'FRIGORIFIQUE'
            | 'ADR_COLIS'
            | 'ADR_CITERNE'
            | 'CONVOI_EXCEPTIONNEL'
            | 'BENNE_TRAVAUX_PUBLICS'
            | 'ANIMAUX_VIVANTS')[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_current_activity_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          }
        ];
      };
    };

    Functions: {
      can_add_vehicle: {
        Args: { p_company_id: string };
        Returns: boolean;
      };
      can_add_user: {
        Args: { p_company_id: string };
        Returns: boolean;
      };
      exec_sql: {
        Args: { sql: string };
        Returns: Json;
      };
      log_activity: {
        Args: {
          p_company_id: string;
          p_user_id: string;
          p_action_type: string;
          p_entity_type?: string;
          p_entity_id?: string;
          p_entity_name?: string;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: void;
      };
    };

    Enums: {
      [_ in never]: never;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
