/**
 * Client Supabase côté serveur
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Client standard (respecte RLS)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

// Client admin (bypass RLS)
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Récupérer l'utilisateur courant (VERSION SÉCURISÉE - RLS)
export async function getUserWithCompany() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // Récupérer le profil via RLS (policy doit permettre SELECT sur son propre profil)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('getUserWithCompany: Profile fetch error', profileError);
    }
    
    if (profile) {
      return {
        ...profile,
        companies: null,
      };
    }
    
    // Fallback: retourner les données de auth
    return {
      id: user.id,
      email: user.email || '',
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      role: 'ADMIN',
      is_active: true,
      company_id: user.user_metadata?.company_id || null,
      companies: null,
    };
  } catch (e) {
    console.error('getUserWithCompany error:', e);
    return null;
  }
}

// Récupérer la session
export async function getSession() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session;
  } catch (e) {
    return null;
  }
}

// Récupérer l'utilisateur courant (simplifié)
export async function getCurrentUser() {
  return getUserWithCompany();
}
