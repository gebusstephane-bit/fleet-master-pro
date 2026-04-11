/**
 * Hooks React Query pour la gestion des comptes conducteurs (authentification)
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createDriverAccount,
  revokeDriverAccount,
  resetDriverPassword,
  reactivateDriverAccount,
  type CreateDriverAccountInput,
  type RevokeDriverAccountInput,
  type ResetDriverPasswordInput,
} from '@/actions/driver-auth';
import { driverKeys } from '@/hooks/use-drivers';
import { getReadableError } from '@/lib/error-messages';

// ============================================================================
// HOOK : Créer un compte conducteur
// ============================================================================

export function useCreateDriverAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateDriverAccountInput) => {
      const result = await createDriverAccount(data);
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(variables.driverId) });
      toast.success('Compte conducteur créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(getReadableError(error));
    },
  });
}

// ============================================================================
// HOOK : Révoquer un compte conducteur
// ============================================================================

export function useRevokeDriverAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RevokeDriverAccountInput) => {
      const result = await revokeDriverAccount(data);
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(variables.driverId) });
      toast.success('Accès révoqué avec succès');
    },
    onError: (error: Error) => {
      toast.error(getReadableError(error));
    },
  });
}

// ============================================================================
// HOOK : Réinitialiser le mot de passe
// ============================================================================

export function useResetDriverPassword() {
  return useMutation({
    mutationFn: async (data: ResetDriverPasswordInput) => {
      const result = await resetDriverPassword(data);
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data?.data;
    },
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé avec succès');
    },
    onError: (error: Error) => {
      toast.error(getReadableError(error));
    },
  });
}

// ============================================================================
// HOOK : Réactiver un compte conducteur
// ============================================================================

export function useReactivateDriverAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RevokeDriverAccountInput) => {
      const result = await reactivateDriverAccount(data);
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(variables.driverId) });
      toast.success('Compte réactivé avec succès');
    },
    onError: (error: Error) => {
      toast.error(getReadableError(error));
    },
  });
}
