/**
 * Client Supabase Admin - Contourne les RLS
 * À utiliser uniquement côté serveur (Server Actions, API Routes)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
