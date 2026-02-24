/**
 * Client Supabase sécurisé - Élimination du bypass RLS
 * 
 * PRINCIPE : Toutes les Server Actions utilisent le client RLS standard
 * Exceptions : Cron jobs, webhooks, et superadmin uniquement
 */

import { createClient } from './server';
import { redirect } from 'next/navigation';

/**
 * Récupère l'utilisateur authentifié avec vérification RLS
 * Utilise uniquement le client standard (pas de service role)
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }
  
  // Récupérer le profil via RLS (la policy doit permettre SELECT sur son propre profil)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, company_id, is_active, avatar_url, phone, email_notifications, notify_maintenance')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    console.error('getAuthenticatedUser: Profile not found', profileError);
    return null;
  }
  
  // Vérifier que le user est actif
  if (!profile.is_active) {
    console.warn('getAuthenticatedUser: User inactive', user.id);
    return null;
  }
  
  return {
    ...profile,
    auth_id: user.id,
  };
}

/**
 * Récupère l'utilisateur ou redirige vers login
 * À utiliser dans les pages/dashboard
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

/**
 * Récupère l'utilisateur avec vérification company_id
 * Pour les opérations multi-tables
 */
export async function getUserWithCompanySecure() {
  const user = await getAuthenticatedUser();
  
  if (!user || !user.company_id) {
    return null;
  }
  
  const supabase = await createClient();
  
  // Récupérer la company via RLS
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', user.company_id)
    .single();
  
  if (error || !company) {
    console.error('getUserWithCompanySecure: Company not found', error);
    return { user, company: null };
  }
  
  return { user, company };
}

/**
 * Vérifie si l'utilisateur a un rôle autorisé
 * Retourne l'utilisateur si autorisé, null sinon
 */
export async function requireRole(allowedRoles: string[]) {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return null;
  }
  
  if (!allowedRoles.includes(user.role)) {
    console.warn('requireRole: Insufficient permissions', { 
      userId: user.id, 
      role: user.role, 
      required: allowedRoles 
    });
    return null;
  }
  
  return user;
}

/**
 * Wrapper pour les Server Actions CRUD
 * Fournit le client RLS + l'utilisateur authentifié
 */
export async function withAuth<T>(
  callback: (supabase: Awaited<ReturnType<typeof createClient>>, user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }
    
    const supabase = await createClient();
    const result = await callback(supabase, user);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('withAuth error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    };
  }
}

/**
 * Wrapper avec vérification de rôle
 */
export async function withRole<T>(
  allowedRoles: string[],
  callback: (supabase: Awaited<ReturnType<typeof createClient>>, user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const user = await requireRole(allowedRoles);
    
    if (!user) {
      return { success: false, error: 'Permissions insuffisantes' };
    }
    
    const supabase = await createClient();
    const result = await callback(supabase, user);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('withRole error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    };
  }
}
