'use client';

/**
 * Hook React Query - Gestion des activités de transport par entreprise
 * ADR, Frigorifique, etc.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';
import { cacheTimes } from '@/lib/query-config';
import { toast } from 'sonner';
import { getReadableError } from '@/lib/error-messages';
import {
  getCompanyActivities,
  addCompanyActivity,
  removeCompanyActivity,
  updateCompanyPrimaryActivity,
  type TransportActivity,
  type CompanyActivity,
} from '@/actions/company-activities';

// Clés de cache
const companyActivityKeys = {
  all: ['company-activities'] as const,
  lists: (companyId: string) => [...companyActivityKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...companyActivityKeys.all, 'detail', id] as const,
};

/**
 * Hook pour récupérer les activités de l'entreprise
 */
export function useCompanyActivities(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useQuery<CompanyActivity[]>({
    queryKey: companyActivityKeys.lists(companyId || ''),
    queryFn: async () => {
      if (!companyId) {
        logger.warn('[useCompanyActivities] No companyId available');
        return [];
      }

      const result = await getCompanyActivities(companyId);
      
      if (!result.success) {
        logger.error('[useCompanyActivities] Error:', result.error);
        throw new Error(result.error || 'Erreur récupération activités');
      }

      return result.data || [];
    },
    enabled: options?.enabled !== false && !!companyId,
    retry: 1,
    retryDelay: 1000,
    ...cacheTimes.company,
  });
}

/**
 * Hook pour ajouter une activité à l'entreprise
 */
export function useAddCompanyActivity() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useMutation({
    mutationFn: async ({
      activity,
      isPrimary = false,
      settings,
    }: {
      activity: TransportActivity;
      isPrimary?: boolean;
      settings?: Record<string, unknown>;
    }) => {
      if (!companyId) {
        throw new Error('Entreprise non trouvée');
      }

      const result = await addCompanyActivity(companyId, activity, isPrimary, settings);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur ajout activité');
      }

      return result.data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ 
          queryKey: companyActivityKeys.lists(companyId) 
        });
      }
      toast.success('Activité ajoutée avec succès');
    },
    onError: (error: Error) => {
      logger.error('Error adding company activity', error);
      toast.error(getReadableError(error));
    },
  });
}

/**
 * Hook pour retirer une activité de l'entreprise
 */
export function useRemoveCompanyActivity() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!companyId) {
        throw new Error('Entreprise non trouvée');
      }

      const result = await removeCompanyActivity(companyId, activityId);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur suppression activité');
      }

      return { success: true };
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ 
          queryKey: companyActivityKeys.lists(companyId) 
        });
      }
      toast.success('Activité retirée');
    },
    onError: (error: Error) => {
      logger.error('Error removing company activity', error);
      toast.error(getReadableError(error));
    },
  });
}

/**
 * Hook pour mettre à jour l'activité principale
 */
export function useUpdateCompanyPrimaryActivity() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const companyId = user?.company_id;

  return useMutation({
    mutationFn: async (activity: TransportActivity) => {
      if (!companyId) {
        throw new Error('Entreprise non trouvée');
      }

      const result = await updateCompanyPrimaryActivity(companyId, activity);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur mise à jour activité principale');
      }

      return result.data;
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ 
          queryKey: companyActivityKeys.lists(companyId) 
        });
      }
      toast.success('Activité principale mise à jour');
    },
    onError: (error: Error) => {
      logger.error('Error updating primary activity', error);
      toast.error(getReadableError(error));
    },
  });
}

/**
 * Hook pour vérifier si une activité est déjà assignée
 */
export function useHasCompanyActivity(
  activity: TransportActivity,
  options?: { enabled?: boolean }
) {
  const { data: activities, isLoading } = useCompanyActivities(options);
  
  const hasActivity = activities?.some(
    (a) => a.activity === activity
  ) ?? false;

  const primaryActivity = activities?.find(
    (a) => a.is_primary
  )?.activity || null;

  return {
    hasActivity,
    isPrimary: primaryActivity === activity,
    primaryActivity,
    allActivities: activities?.map((a) => a.activity) || [],
    isLoading,
  };
}

/**
 * Liste des activités disponibles avec leurs labels
 */
export const TRANSPORT_ACTIVITIES: { value: TransportActivity; label: string; description: string }[] = [
  {
    value: 'MARCHANDISES_GENERALES',
    label: 'Marchandises Générales',
    description: 'Transport standard de marchandises',
  },
  {
    value: 'FRIGORIFIQUE',
    label: 'Frigorifique',
    description: 'Transport de marchandises sous température dirigée',
  },
  {
    value: 'ADR_COLIS',
    label: 'ADR Colis',
    description: 'Transport de marchandises dangereuses en colis',
  },
  {
    value: 'ADR_CITERNE',
    label: 'ADR Citerne',
    description: 'Transport de marchandises dangereuses en vrac liquide',
  },
  {
    value: 'CONVOI_EXCEPTIONNEL',
    label: 'Convoi Exceptionnel',
    description: 'Transport de charges indivisibles hors gabarit',
  },
  {
    value: 'BENNE_TRAVAUX_PUBLICS',
    label: 'Benne TP',
    description: 'Transport de matériaux de construction',
  },
  {
    value: 'ANIMAUX_VIVANTS',
    label: 'Animaux Vivants',
    description: 'Transport d\'animaux vivants',
  },
];
