/**
 * Hooks pour gérer l'abonnement et les limites
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCompanySubscription,
  checkSubscriptionLimits,
  createCheckoutSession,
  requestEnterpriseQuote,
  cancelSubscription,
} from '@/actions/subscription';
// PlanType: 'ESSENTIAL' | 'PRO' | 'UNLIMITED'
type PlanType = 'ESSENTIAL' | 'PRO' | 'UNLIMITED';

export const subscriptionKeys = {
  all: ['subscription'] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  limits: () => [...subscriptionKeys.all, 'limits'] as const,
};

// Récupérer l'abonnement de l'entreprise
export function useSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.details(),
    queryFn: async () => {
      const result = await getCompanySubscription();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération abonnement');
      }
      return result.data.data;
    },
  });
}

// Récupérer les limites actuelles
export function useSubscriptionLimits() {
  return useQuery({
    queryKey: subscriptionKeys.limits(),
    queryFn: async () => {
      const result = await checkSubscriptionLimits();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération limites');
      }
      return result.data.data;
    },
    refetchInterval: 30 * 1000, // Rafraîchir toutes les 30s
  });
}

// Créer une session de checkout
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ plan, yearly }: { plan: PlanType; yearly?: boolean }) => {
      const result = await createCheckoutSession({ plan, yearly: yearly || false });
      if (!result?.data?.success) {
        throw new Error('Erreur création session');
      }
      return result.data.url;
    },
    onSuccess: (url) => {
      if (url) {
        window.location.href = url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Demander un devis Enterprise
export function useRequestEnterpriseQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ message, phone }: { message: string; phone?: string }) => {
      const result = await requestEnterpriseQuote({ message, phone });
      if (!result?.data?.success) {
        throw new Error('Erreur envoi demande');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast.success('Votre demande a été envoyée à notre équipe commerciale');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Annuler l'abonnement
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const result = await cancelSubscription();
      if (!result?.data?.success) {
        throw new Error('Erreur annulation');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast.success('Abonnement annulé. Vous resterez sur votre plan jusqu\'à la fin de la période.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook utilitaire pour vérifier si on peut ajouter un véhicule
export function useCanAddVehicle() {
  const { data: limits } = useSubscriptionLimits();
  return limits?.canAddVehicle ?? false;
}

// Hook utilitaire pour vérifier si on peut ajouter un utilisateur
export function useCanAddUser() {
  const { data: limits } = useSubscriptionLimits();
  return limits?.canAddUser ?? false;
}

// Hook pour obtenir le nombre de véhicules restants
export function useRemainingVehicles() {
  const { data: limits } = useSubscriptionLimits();
  if (!limits) return 0;
  return Math.max(0, limits.vehicleLimit - limits.vehicleCount);
}
