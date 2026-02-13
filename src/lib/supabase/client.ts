/**
 * Client Supabase côté navigateur
 * Utilisé pour les interactions client-side avec Supabase
 * 
 * ⚠️ SECURITY NOTICE: Ce fichier a été corrigé pour éliminer le cast 'as any'
 * et implémenter un pattern singleton sécurisé avec vérification de window.
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

/**
 * Crée un client Supabase pour le navigateur
 * Singleton pattern pour éviter de multiples instances
 */
export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined');
  }

  return createBrowserClient<Database>(url, key);
}

// Variable privée pour le singleton
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Hook sécurisé pour obtenir le client Supabase
 * À utiliser dans les composants client uniquement
 * 
 * @throws Error si appelé côté serveur
 */
export function getSupabaseClient(): ReturnType<typeof createBrowserClient<Database>> {
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabaseClient() must only be called in the browser. ' +
      'For server-side operations, use createClient() from @/lib/supabase/server'
    );
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }

  return supabaseInstance;
}

/**
 * Réinitialise l'instance singleton (utile pour les tests)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}

// ⚠️ DEPRECATED: Cet export est conservé pour la compatibilité
// mais retourne toujours null. Utilisez getSupabaseClient() à la place.
// Sera supprimé dans une future version.
export const supabase = null;
