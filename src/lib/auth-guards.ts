/**
 * Utilitaires de sécurité pour Server Actions
 * Vérification des rôles côté serveur (incontournable)
 * 
 * IMPORTANT : Ces fonctions doivent être appelées EN DÉBUT de chaque Server Action
 * sensible pour éviter les accès non autorisés par appel direct.
 */

import { createClient } from './supabase/server';

// Rôles utilisateur dans profiles.role
export type UserRole = 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' | 'SUPER_ADMIN';

// Rôle minimum requis (ordre de privilège décroissant)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'SUPER_ADMIN': 100,
  'ADMIN': 90,
  'DIRECTEUR': 80,
  'AGENT_DE_PARC': 50,
  'EXPLOITANT': 30,
};

/**
 * Vérifie que l'utilisateur est authentifié
 * @returns L'utilisateur authentifié
 * @throws Error si non authentifié
 */
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Non authentifié');
  }
  
  return user;
}

/**
 * Vérifie que l'utilisateur a l'un des rôles autorisés
 * @param allowedRoles - Liste des rôles autorisés
 * @returns { user, role, profile } si autorisé
 * @throws Error si non authentifié ou rôle insuffisant
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_id, first_name, last_name')
    .eq('id', user.id)
    .single();
  
  if (error || !profile) {
    throw new Error('Profil non trouvé');
  }
  
  const userRole = profile.role as UserRole;
  
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Permissions insuffisantes. Rôles requis: ${allowedRoles.join(', ')}`);
  }
  
  return { 
    user, 
    role: userRole, 
    profile,
    companyId: profile.company_id 
  };
}

/**
 * Vérifie que l'utilisateur a un rôle hiérarchiquement supérieur ou égal au minimum requis
 * @param minRole - Rôle minimum requis
 * @returns { user, role, profile } si autorisé
 * @throws Error si non authentifié ou rôle insuffisant
 */
export async function requireRoleAtLeast(minRole: UserRole) {
  const user = await requireAuth();
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_id, first_name, last_name')
    .eq('id', user.id)
    .single();
  
  if (error || !profile) {
    throw new Error('Profil non trouvé');
  }
  
  const userRole = profile.role as UserRole;
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  
  if (userLevel < minLevel) {
    throw new Error(`Permissions insuffisantes. Rôle minimum requis: ${minRole}`);
  }
  
  return { 
    user, 
    role: userRole, 
    profile,
    companyId: profile.company_id 
  };
}

// ===== Helpers pratiques =====

/**
 * Vérifie que l'utilisateur est ADMIN ou SUPER_ADMIN
 */
export async function requireAdmin() {
  return requireRole(['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Vérifie que l'utilisateur est ADMIN ou DIRECTEUR
 * Pour les actions de gestion (suppression, configuration)
 */
export async function requireManagerOrAbove() {
  return requireRole(['ADMIN', 'DIRECTEUR', 'SUPER_ADMIN']);
}

/**
 * Vérifie que l'utilisateur est au moins AGENT_DE_PARC
 * Pour les actions opérationnelles (création, modification)
 */
export async function requireAgentOrAbove() {
  return requireRole(['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'SUPER_ADMIN']);
}

/**
 * Vérifie que l'utilisateur appartient à la même entreprise que la ressource
 * @param resourceCompanyId - ID de l'entreprise de la ressource
 * @param userCompanyId - ID de l'entreprise de l'utilisateur (depuis requireRole)
 * @throws Error si les entreprises ne correspondent pas
 */
export function requireSameCompany(resourceCompanyId: string, userCompanyId: string | null) {
  if (!userCompanyId) {
    throw new Error('Entreprise non définie pour l\'utilisateur');
  }
  
  if (resourceCompanyId !== userCompanyId) {
    throw new Error('Accès refusé : ressource d\'une autre entreprise');
  }
}
