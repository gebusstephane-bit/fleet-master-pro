import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  startRoute,
  completeRoute,
} from '@/actions/routes';

export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  details: () => [...routeKeys.all, 'detail'] as const,
  detail: (id: string) => [...routeKeys.details(), id] as const,
};

export function useRoutes() {
  return useQuery({
    queryKey: routeKeys.lists(),
    queryFn: async () => {
      const result = await getRoutes();
      if (!result?.data?.success) {
        throw new Error('Erreur récupération tournées');
      }
      return result.data.data;
    },
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: async () => {
      const result = await getRouteById({ id });
      if (!result?.data?.success) {
        throw new Error('Tournée non trouvée');
      }
      return result.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof createRoute>[0]) => {
      const result = await createRoute(data);
      console.log('Create route raw result:', result);
      
      // Vérifier si c'est une erreur serveur
      if (!result) {
        throw new Error('Pas de réponse du serveur');
      }
      
      // Vérifier la structure de la réponse
      if (result.serverError) {
        throw new Error(`Erreur serveur: ${result.serverError.message || 'Inconnue'}`);
      }
      
      if (result.validationErrors) {
        throw new Error(`Erreur de validation: ${JSON.stringify(result.validationErrors)}`);
      }
      
      const responseData = result.data;
      if (!responseData?.success) {
        const errorMsg = responseData?.error || 'Erreur création tournée';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast.success('Tournée créée avec succès');
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast.error(error.message);
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Parameters<typeof updateRoute>[0]) => {
      const result = await updateRoute(data);
      if (!result?.data?.success) {
        throw new Error(typeof result?.data === 'string' ? result.data : 'Erreur mise à jour');
      }
      return result.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(variables.id) });
      toast.success('Tournée mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRoute({ id });
      if (!result?.data?.success) {
        throw new Error(typeof result?.data === 'string' ? result.data : 'Erreur suppression');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast.success('Tournée supprimée');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useStartRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await startRoute({ id });
      if (!result?.data?.success) {
        throw new Error(typeof result?.data === 'string' ? result.data : 'Erreur démarrage');
      }
      return result.data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(id) });
      toast.success('Tournée démarrée !');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCompleteRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await completeRoute({ id });
      if (!result?.data?.success) {
        throw new Error(typeof result?.data === 'string' ? result.data : 'Erreur finalisation');
      }
      return result.data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(id) });
      toast.success('Tournée terminée !');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
