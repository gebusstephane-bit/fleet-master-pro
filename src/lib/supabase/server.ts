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
      console.error('getUserWithCompany: Auth error', error);
      return null;
    }
    
    // Récupérer le profil via RLS
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('getUserWithCompany: Profile fetch error', profileError);
    }
    
    // Récupérer les infos de la company si company_id existe
    let companyData = null;
    const companyId = profile?.company_id || user.user_metadata?.company_id || null;
    
    if (companyId) {
      // Récupérer d'abord les données de companies
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, logo_url, max_vehicles, max_drivers')
        .eq('id', companyId)
        .maybeSingle();
      
      // Puis récupérer le PLAN depuis subscriptions (source de vérité)
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan, vehicle_limit, user_limit, status, trial_ends_at')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (!companyError && company) {
        companyData = {
          ...company,
          // Utiliser subscriptions comme source de vérité pour le plan
          subscription_plan: subscription?.plan || 'ESSENTIAL',
          trial_ends_at: subscription?.trial_ends_at,
          plan: subscription?.plan || 'ESSENTIAL',
          max_vehicles: subscription?.vehicle_limit || company.max_vehicles || 5,
          max_drivers: subscription?.user_limit || company.max_drivers || 10,
          subscription_status: subscription?.status || 'ACTIVE',
          logo_url: company.logo_url, // Ajouter le logo_url
        };
      }
    }
    
    // Construire l'objet user à partir du profil DB ou des metadata
    const userData = {
      id: user.id,
      email: user.email || '',
      first_name: profile?.first_name || user.user_metadata?.first_name || '',
      last_name: profile?.last_name || user.user_metadata?.last_name || '',
      role: profile?.role || user.user_metadata?.role || 'ADMIN',
      is_active: profile?.is_active ?? true,
      company_id: companyId,
      companies: companyData ? {
        id: companyData.id,
        name: companyData.name,
        plan: companyData.subscription_plan || 'essential',
        subscription_plan: companyData.subscription_plan || 'essential',
        max_vehicles: companyData.max_vehicles,
        max_drivers: companyData.max_drivers,
        logo_url: companyData.logo_url,
        trial_ends_at: companyData.trial_ends_at,
        subscription_status: companyData.subscription_status,
      } : null,
      ...profile, // Écraser avec les données du profil si elles existent
    };
    
    return userData;
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
