/**
 * Configuration globale React Query pour FleetMaster Pro
 * Optimisée pour la scalabilité (1000+ véhicules)
 */

import { QueryClientConfig } from '@tanstack/react-query';

export const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache Strategy
      staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
      gcTime: 10 * 60 * 1000,   // 10 minutes - garbage collection
      
      // Pagination
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Performance
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
      
      // Infinite scroll
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      // Optimistic updates
      retry: 1,
      retryDelay: 1000,
    },
  },
};

// Temps de cache spécifiques par type de données
export const cacheTimes = {
  // Données statiques (changements rares)
  vehicles: {
    staleTime: 5 * 60 * 1000,  // 5 min
    gcTime: 10 * 60 * 1000,    // 10 min
  },
  drivers: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  company: {
    staleTime: 15 * 60 * 1000, // 15 min
    gcTime: 30 * 60 * 1000,
  },
  
  // Données dynamiques (changements fréquents)
  maintenance: {
    staleTime: 2 * 60 * 1000,  // 2 min
    gcTime: 5 * 60 * 1000,
  },
  inspections: {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  routes: {
    staleTime: 1 * 60 * 1000,  // 1 min
    gcTime: 3 * 60 * 1000,
  },
  dashboard: {
    staleTime: 30 * 1000,      // 30 sec
    gcTime: 2 * 60 * 1000,
  },
};

// Constantes de pagination
export const paginationConfig = {
  defaultPageSize: 20,
  maxPageSize: 100,
  minPageSize: 10,
};
