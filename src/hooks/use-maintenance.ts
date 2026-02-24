/**
 * Hooks React Query pour la maintenance
 * VERSION CORRIGÉE - Utilise client Supabase côté client avec fallback RLS
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import {
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from '@/actions/maintenance';
import { sendMaintenanceAlerts, testEmailConfig } from '@/actions/email-alerts';
import { cacheTimes } from '@/lib/query-config';

// Types
export interface Maintenance {
  id: string;
  company_id: string;
  vehicle_id: string;
  type: 'preventive' | 'corrective' | 'inspection' | 'repair';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  mileage_at_service?: number;
  performed_by?: string;
  parts_used?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  vehicles?: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
  } | null;
}

// Clés de cache
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  lists: (companyId: string) => [...maintenanceKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...maintenanceKeys.all, 'detail', id] as const,
  byVehicle: (vehicleId: string) => [...maintenanceKeys.all, 'byVehicle', vehicleId] as const,
  alerts: (companyId: string) => [...maintenanceKeys.all, 'alerts', companyId] as const,
  stats: (companyId: string) => [...maintenanceKeys.all, 'stats', companyId] as const,
};

// Hook récupération liste interventions - UTILISE CLIENT SUPABASE DIRECT
export function useMaintenances(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: maintenanceKeys.lists(companyId || ''),
    queryFn: async () => {
      logger.info('useMaintenances: Fetching with company_id', { companyId });
      
      if (!companyId) {
        logger.warn('No companyId available');
        return [];
      }
      
      const supabase = getSupabaseClient();
      
      // Essayer la requête directe d'abord
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          vehicles(registration_number, brand, model)
        `)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: false });
      
      if (error) {
        logger.error('Error fetching maintenances', error);
        
        // Si erreur de recursion RLS, essayer le fallback
        if (error.message?.includes('infinite recursion') || error.code === '42P17') {
          logger.warn('RLS recursion detected, trying fallback...');
          
          const { data: allData, error: allError } = await supabase
            .from('maintenance_records')
            .select(`
              *,
              vehicles(registration_number, brand, model)
            `)
            .order('scheduled_date', { ascending: false });
          
          if (!allError && allData) {
            const filtered = allData.filter(m => m.company_id === companyId);
            logger.info('Fallback: Found maintenances', { count: filtered.length });
            return filtered as unknown as Maintenance[];
          }
        }
        
        throw new Error(error.message);
      }
      
      logger.info('Fetched maintenances', { count: data?.length || 0 });
      return (data || []) as unknown as Maintenance[];
    },
    enabled: options?.enabled !== false && !!companyId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.maintenance,
  });
}

// Hook récupération détail intervention
export function useMaintenance(id: string, options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: async () => {
      if (!id || !companyId) return null;
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          vehicles(*)
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Error fetching maintenance', error);
        throw new Error(error.message);
      }
      
      return data as unknown as Maintenance;
    },
    enabled: options?.enabled !== false && !!id && !!companyId,
    ...cacheTimes.maintenance,
  });
}

// Hook récupération interventions par véhicule
export function useMaintenancesByVehicle(vehicleId: string, options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: maintenanceKeys.byVehicle(vehicleId),
    queryFn: async () => {
      if (!vehicleId || !companyId) return [];
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: false });
      
      if (error) {
        logger.error('Error fetching maintenances by vehicle', error);
        throw new Error(error.message);
      }
      
      return (data || []) as unknown as Maintenance[];
    },
    enabled: options?.enabled !== false && !!vehicleId && !!companyId,
    ...cacheTimes.maintenance,
  });
}

// Hook création intervention
export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof createMaintenance>[0]) => {
      const result = await createMaintenance(data);
      // @ts-ignore
      if (!result?.data?.success) {
        throw new Error('Erreur création intervention');
      }
      // @ts-ignore
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists(companyId) });
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.alerts(companyId) });
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats(companyId) });
      }
      if ('vehicleId' in variables) {
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.byVehicle(variables.vehicleId) });
      }
      toast.success('Intervention créée avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook mise à jour intervention
export function useUpdateMaintenance() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof updateMaintenance>[0]) => {
      const result = await updateMaintenance(data);
      // @ts-ignore
      if (!result?.data?.success) {
        throw new Error('Erreur mise à jour intervention');
      }
      // @ts-ignore
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(variables.id) });
      toast.success('Intervention mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook suppression intervention
export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteMaintenance({ id });
      // @ts-ignore
      if (!result?.data?.success) {
        throw new Error('Erreur suppression intervention');
      }
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists(companyId) });
      }
      toast.success('Intervention supprimée');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Statuts actifs dans le workflow maintenance
const ACTIVE_MAINTENANCE_STATUSES = [
  'DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS',
  // Anciens statuts pour rétrocompatibilité
  'scheduled', 'in_progress', 'pending',
];

// Hook récupération alertes maintenance
export function useMaintenanceAlerts(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery({
    queryKey: maintenanceKeys.alerts(companyId || ''),
    queryFn: async () => {
      if (!companyId) return [];

      const supabase = getSupabaseClient();

      // Alertes = maintenances actives (workflow)
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          vehicles(registration_number, brand, model)
        `)
        .eq('company_id', companyId)
        .in('status', ACTIVE_MAINTENANCE_STATUSES)
        .order('rdv_date', { ascending: true, nullsFirst: false })
        .limit(20);

      if (error) {
        logger.error('Error fetching maintenance alerts', error);
        throw new Error(error.message);
      }

      // Mapper vers la forme attendue par le dashboard
      const now = new Date();
      return (data || []).map(m => {
        const vehicle = (m as any).vehicles;
        const vehicleName = vehicle
          ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})`
          : 'Véhicule inconnu';
        const rdvDate = (m as any).rdv_date as string | null;
        const daysUntil = rdvDate
          ? Math.ceil((new Date(rdvDate).getTime() - now.getTime()) / 86_400_000)
          : null;

        const priorityRaw: string = (m as any).priority || 'NORMAL';
        const severity =
          priorityRaw === 'CRITICAL' || priorityRaw === 'critical' ? 'CRITICAL'
          : priorityRaw === 'HIGH' || priorityRaw === 'high' ? 'WARNING'
          : daysUntil !== null && daysUntil <= 3 ? 'CRITICAL'
          : daysUntil !== null && daysUntil <= 7 ? 'WARNING'
          : 'INFO';

        return {
          ...m,
          vehicleName,
          severity,
          dueDate: rdvDate ? new Date(rdvDate).toLocaleDateString('fr-FR') : '—',
          message: (m as any).description || `Maintenance ${m.type || ''}`.trim(),
        };
      });
    },
    enabled: options?.enabled !== false && !!companyId,
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  });
}

// Hook récupération stats maintenance
export function useMaintenanceStats(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  
  return useQuery({
    queryKey: maintenanceKeys.stats(companyId || ''),
    queryFn: async () => {
      if (!companyId) return null;
      
      const supabase = getSupabaseClient();
      
      // Stats simples
      const { data: totalData, error: totalError } = await supabase
        .from('maintenance_records')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId);
      
      if (totalError) {
        logger.error('Error fetching maintenance stats', totalError);
        throw new Error(totalError.message);
      }
      
      const { count: total } = totalData as unknown as { count: number };
      
      const { data: scheduledData } = await supabase
        .from('maintenance_records')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('status', 'scheduled');
      
      const { data: inProgressData } = await supabase
        .from('maintenance_records')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('status', 'in_progress');
      
      const { data: completedData } = await supabase
        .from('maintenance_records')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('status', 'completed');
      
      return {
        total: total || 0,
        scheduled: (scheduledData as unknown as { count: number })?.count || 0,
        inProgress: (inProgressData as unknown as { count: number })?.count || 0,
        completed: (completedData as unknown as { count: number })?.count || 0,
      };
    },
    enabled: options?.enabled !== false && !!companyId,
    ...cacheTimes.maintenance,
  });
}

// Hook envoi alertes email
export function useSendMaintenanceAlerts() {
  return useMutation({
    mutationFn: async () => {
      const result = await sendMaintenanceAlerts();
      // @ts-ignore
      if (!result?.data?.success) {
        throw new Error('Erreur envoi alertes');
      }
      // @ts-ignore
      return result.data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data.sent} alertes envoyées à ${data.recipients} destinataires`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook test configuration email
export function useTestEmailConfig() {
  return useMutation({
    mutationFn: async () => {
      const result = await testEmailConfig();
      // @ts-ignore
      if (!result?.data?.success) {
        throw new Error('Erreur test email');
      }
      // @ts-ignore
      return result.data;
    },
    onSuccess: () => {
      toast.success('Email de test envoyé avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
