/**
 * Hooks React Query — Sinistres
 * Pattern identique à use-vehicles / use-drivers
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUserContext } from '@/components/providers/user-provider';
import { cacheTimes } from '@/lib/query-config';
import {
  getIncidents,
  getIncident,
  getIncidentStats,
  createIncident,
  updateIncident,
  deleteIncident,
  addIncidentDocument,
  deleteIncidentDocument,
} from '@/actions/incidents';
import type { CreateIncidentData, UpdateIncidentData } from '@/lib/schemas';

// ============================================================
// Types
// ============================================================

export interface Incident {
  id: string;
  company_id: string;
  vehicle_id: string;
  driver_id: string | null;
  maintenance_record_id: string | null;
  incident_number: string | null;
  incident_date: string;
  location_description: string | null;
  incident_type: string;
  severity: string | null;
  circumstances: string | null;
  third_party_involved: boolean;
  third_party_info: Record<string, unknown> | null;
  injuries_description: string | null;
  witnesses: unknown[] | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  claim_number: string | null;
  claim_date: string | null;
  claim_status: string;
  estimated_damage: number | null;
  final_settlement: number | null;
  status: string;
  notes: string | null;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
  // Jointures
  vehicles?: { id: string; registration_number: string; brand: string; model: string; type?: string } | null;
  drivers?: { id: string; first_name: string; last_name: string; phone?: string } | null;
  maintenance_records?: { id: string; type: string; description: string; status: string } | null;
  incident_documents?: IncidentDocument[];
}

export interface IncidentDocument {
  id: string;
  incident_id: string;
  document_type: string | null;
  storage_path: string;
  file_name: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// ============================================================
// Clés de cache
// ============================================================

export const incidentKeys = {
  all: ['incidents'] as const,
  lists: (companyId: string) => [...incidentKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...incidentKeys.all, 'detail', id] as const,
  stats: (companyId: string) => [...incidentKeys.all, 'stats', companyId] as const,
};

// ============================================================
// Hooks lectures
// ============================================================

export function useIncidents() {
  const { user } = useUserContext();
  const companyId = user?.company_id ?? '';

  return useQuery({
    queryKey: incidentKeys.lists(companyId),
    queryFn: async () => {
      const result = await getIncidents();
      if (!result.success) throw new Error(result.error ?? 'Erreur chargement sinistres');
      return (result.data ?? []) as Incident[];
    },
    enabled: !!companyId,
    staleTime: cacheTimes.short,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: async () => {
      const result = await getIncident(id);
      if (!result.success) throw new Error(result.error ?? 'Erreur chargement sinistre');
      return result.data as Incident;
    },
    enabled: !!id,
    staleTime: cacheTimes.short,
  });
}

export function useIncidentStats() {
  const { user } = useUserContext();
  const companyId = user?.company_id ?? '';

  return useQuery({
    queryKey: incidentKeys.stats(companyId),
    queryFn: async () => {
      const result = await getIncidentStats();
      if (!result.success) throw new Error(result.error ?? 'Erreur statistiques');
      return result.data as {
        total: number;
        totalCost: number;
        topVehicle: { count: number; label: string } | null;
        topDriver: { count: number; label: string } | null;
        byMonth: Record<string, number>;
      };
    },
    enabled: !!companyId,
    staleTime: cacheTimes.medium,
  });
}

// ============================================================
// Mutations
// ============================================================

export function useCreateIncident() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id ?? '';

  return useMutation({
    mutationFn: async (data: CreateIncidentData) => {
      const result = await createIncident(data);
      if (!result.success) throw new Error(result.error ?? 'Erreur création');
      return result.data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats(companyId) });
      toast.success('Sinistre déclaré avec succès');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id ?? '';

  return useMutation({
    mutationFn: async (data: UpdateIncidentData) => {
      const result = await updateIncident(data);
      if (!result.success) throw new Error(result.error ?? 'Erreur mise à jour');
      return result.data as Incident;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats(companyId) });
      toast.success('Sinistre mis à jour');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id ?? '';

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteIncident(id);
      if (!result.success) throw new Error(result.error ?? 'Erreur suppression');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.stats(companyId) });
      toast.success('Sinistre supprimé');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddIncidentDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      storagePath,
      fileName,
      documentType,
    }: {
      incidentId: string;
      storagePath: string;
      fileName: string;
      documentType: string;
    }) => {
      const result = await addIncidentDocument(incidentId, storagePath, fileName, documentType);
      if (!result.success) throw new Error(result.error ?? 'Erreur ajout document');
      return result.data as IncidentDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(data.incident_id) });
      toast.success('Document ajouté');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteIncidentDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      storagePath,
      incidentId,
    }: {
      documentId: string;
      storagePath: string;
      incidentId: string;
    }) => {
      const result = await deleteIncidentDocument(documentId, storagePath);
      if (!result.success) throw new Error(result.error ?? 'Erreur suppression document');
      return incidentId;
    },
    onSuccess: (incidentId) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
      toast.success('Document supprimé');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
