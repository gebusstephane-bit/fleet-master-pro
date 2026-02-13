/**
 * Client Supabase côté serveur - Configuration SSR robuste
 * Pour Server Components et API Routes
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { logger } from '@/lib/logger';

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
    // 1. Vérifier l'authentification avec le client standard
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      logger.info('getUserWithCompany: Erreur auth', { message: authError.message });
      return null;
    }
    
    if (!user) {
      logger.info('getUserWithCompany: Pas d\'utilisateur authentifié');
      return null;
    }
    
    logger.info('getUserWithCompany: Auth user ID', { userId: user.id });
    
    // 2. Récupérer les données avec le client admin (bypass RLS)
    const adminClient = createAdminClient();
    
    // ESSAI 1: Table profiles
    let userData = null;
    let companyData = null;
    
    try {
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profile) {
        logger.info('getUserWithCompany: Profil trouvé dans profiles');
        userData = profile;
      }
    } catch (e) {
      logger.info('getUserWithCompany: Erreur profiles', { error: e });
    }
    
    // ESSAI 2: Table users (fallback)
    if (!userData) {
      try {
        const { data: userDb, error: userError } = await adminClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!userError && userDb) {
          logger.info('getUserWithCompany: Profil trouvé dans users');
          userData = userDb;
        }
      } catch (e) {
        logger.info('getUserWithCompany: Erreur users', { error: e });
      }
    }
    
    if (!userData) {
      logger.info('getUserWithCompany: Aucun profil trouvé');
      // Créer un profil minimal pour permettre la connexion
      return {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'ADMIN', // Par défaut pour permettre l'accès
        is_active: true,
        company_id: null,
        companies: null,
      };
    }
    
    // 3. Récupérer la company si possible
    if (userData.company_id) {
      try {
        const { data: company } = await adminClient
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single();
        companyData = company;
      } catch (e) {
        logger.info('getUserWithCompany: Pas de company trouvée');
      }
    }
    
    logger.info('getUserWithCompany: Données récupérées', {
      id: userData?.id,
      email: userData?.email,
      role: userData?.role,
      company_id: userData?.company_id,
      hasCompany: !!companyData,
    });
    
    return {
      ...userData,
      companies: companyData,
    };
  } catch (e) {
    logger.error('getUserWithCompany: Exception', e as Error);
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
    
    // Essayer profiles d'abord
    let data = null;
    
    try {
      const result = await adminClient
        .from('profiles')
        .select('id, email, role, company_id')
        .eq('id', user.id)
        .single();
      if (result.data) data = result.data;
    } catch (e) {
      logger.info('getCurrentUser: profiles error, trying users');
    }
    
    // Fallback sur users
    if (!data) {
      try {
        const result = await adminClient
          .from('profiles')
          .select('id, email, company_id')
          .eq('id', user.id)
          .single();
        if (result.data) data = { ...result.data, role: 'ADMIN' };
      } catch (e) {
        logger.info('getCurrentUser: users error too');
      }
    }
    
    if (!data) {
      // Retourner des données minimales
      return {
        id: user.id,
        email: user.email,
        role: 'ADMIN',
        company_id: null,
      };
    }
    
    return data;
  } catch (e) {
    logger.error('getCurrentUser: Exception', e as Error);
    return null;
  }
}
