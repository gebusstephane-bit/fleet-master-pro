/**
 * Client Supabase Admin
 * Bypass RLS - À utiliser uniquement côté serveur pour les opérations admin
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Crée un client Supabase avec les droits admin (bypass RLS)
 * Nécessite SUPABASE_SERVICE_ROLE_KEY
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined');
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
