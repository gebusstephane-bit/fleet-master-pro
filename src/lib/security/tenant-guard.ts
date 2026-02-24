/**
 * GARDIEN DE SÉCURITÉ TENANT
 * 
 * Ce fichier vérifie que chaque requête API n'accède qu'aux données
 * de l'entreprise de l'utilisateur connecté.
 * 
 * C'est comme un vigile qui vérifie ton badge avant de te laisser entrer.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Récupère le company_id de l'utilisateur connecté depuis son token JWT
 */
export async function getUserCompanyId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('[TenantGuard] Utilisateur non authentifié');
      return null;
    }
    
    // Récupère le profil avec le company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile?.company_id) {
      console.error('[TenantGuard] Profil ou company_id non trouvé');
      return null;
    }
    
    return profile.company_id;
  } catch (error) {
    console.error('[TenantGuard] Erreur:', error);
    return null;
  }
}

/**
 * Vérifie si une ressource appartient à l'entreprise de l'utilisateur
 * @param table - Nom de la table (vehicles, drivers, etc.)
 * @param resourceId - ID de la ressource à vérifier
 * @param companyId - Company_id de l'utilisateur connecté
 */
export async function verifyResourceOwnership(
  table: string,
  resourceId: string,
  companyId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await (supabase as any)
      .from(table)
      .select('id')
      .eq('id', resourceId)
      .eq('company_id', companyId)
      .single();
    
    if (error || !data) {
      console.warn(`[TenantGuard] Ressource ${resourceId} non trouvée ou accès refusé`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[TenantGuard] Erreur vérification:', error);
    return false;
  }
}

/**
 * Réponse standard pour accès refusé
 */
export function forbiddenResponse(message: string = 'Accès refusé') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Réponse standard pour erreur serveur
 */
export function errorResponse(message: string = 'Erreur serveur') {
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
