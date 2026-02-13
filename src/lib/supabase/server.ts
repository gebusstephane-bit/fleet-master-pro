/**
 * Client Supabase côté serveur - Configuration SSR robuste
 * Pour Server Components et API Routes
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

/**
 * Crée un client Supabase standard (respecte RLS)
 * Pour les requêtes authentifiées de l'utilisateur
 */
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
            // Le middleware gère déjà les cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Le middleware gère déjà les cookies
          }
        },
      },
    }
  );
}

/**
 * Crée un client Supabase Admin (bypass RLS)
 * ⚠️ À utiliser UNIQUEMENT côté serveur pour les opérations critiques
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

/**
 * Récupère l'utilisateur courant avec ses données métier
 * Utilise le client admin pour contourner les problèmes RLS
 */
export async function getUserWithCompany() {
  try {
    // Vérifier que les variables d'environnement sont définies
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('getUserWithCompany: Missing Supabase env vars');
      return null;
    }

    // 1. Vérifier l'authentification avec le client standard
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('getUserWithCompany: Auth error', authError.message);
      return null;
    }
    
    if (!user) {
      console.log('getUserWithCompany: No authenticated user');
      return null;
    }
    
    console.log('getUserWithCompany: User found', user.id);
    
    // 2. Récupérer les données avec le client admin (bypass RLS)
    const adminClient = createAdminClient();
    
    // Récupérer le profil
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.log('getUserWithCompany: Profile error', profileError.message);
      // Retourner un profil minimal basé sur l'utilisateur auth
      return {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'ADMIN',
        is_active: true,
        company_id: null,
        companies: null,
      };
    }
    
    if (!profile) {
      console.log('getUserWithCompany: No profile found');
      return {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'ADMIN',
        is_active: true,
        company_id: null,
        companies: null,
      };
    }
    
    // 3. Récupérer la company si possible
    let companyData = null;
    if (profile.company_id) {
      try {
        const { data: company } = await adminClient
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();
        companyData = company;
      } catch (e) {
        console.log('getUserWithCompany: No company found');
      }
    }
    
    console.log('getUserWithCompany: Success', { id: profile.id, email: profile.email });
    
    return {
      ...profile,
      companies: companyData,
    };
  } catch (e) {
    console.error('getUserWithCompany: Exception', e);
    return null;
  }
}

/**
 * Récupère l'utilisateur courant depuis la session
 * Alternative qui retourne juste l'ID utilisateur et company_id
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }
    
    // Récupérer juste le company_id avec le client admin
    const adminClient = createAdminClient();
    
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, role, company_id')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      return {
        id: user.id,
        email: user.email,
        role: 'ADMIN',
        company_id: null,
      };
    }
    
    return profile;
  } catch (e) {
    console.error('getCurrentUser: Exception', e);
    return null;
  }
}
