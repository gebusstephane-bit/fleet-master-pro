'use server';

/**
 * Actions Utilisateurs - VERSION SÉCURISÉE RLS
 * 
 * PRINCIPE : 
 * - createClient() pour toutes les opérations sur la DB (profiles) - RLS sécurisé
 * - createAdminClient() UNIQUEMENT pour auth.admin.createUser/deleteUser (nécessite service role)
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient, createAdminClient } from '@/lib/supabase/server';

// Schémas de validation
const createUserSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis'),
  last_name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT']),
  company_id: z.string().uuid(),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
});

const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT']).optional(),
  is_active: z.boolean().optional(),
});

// Types
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;

/**
 * Récupérer tous les utilisateurs de l'entreprise
 * RLS : Filtre automatiquement par company_id
 */
export async function getUsers(companyId?: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Non authentifié', data: null };
    }
    
    // Si pas de companyId fourni, récupérer celui de l'utilisateur courant (via RLS)
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();
      
      if (!profile) {
        return { error: 'Profil non trouvé', data: null };
      }
      
      targetCompanyId = profile.company_id || undefined;
    }
    
    // RLS filtre automatiquement par company_id
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('getUsers error:', error);
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('getUsers exception:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

/**
 * Récupérer un utilisateur par ID
 * RLS : Vérifie l'appartenance à la company
 */
export async function getUserById(userId: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { error: 'Non authentifié', data: null };
    }
    
    // RLS filtre automatiquement
    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_notification_preferences(*)')
      .eq('id', userId)
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

// Type pour les préférences de notification
export interface NotificationPreferences {
  email_notifications?: boolean;
  notify_maintenance?: boolean;
  notify_alerts?: boolean;
  notify_fuel?: boolean;
  daily_digest?: boolean;
  alert_maintenance?: boolean;
  alert_inspection?: boolean;
  alert_routes?: boolean;
  alert_documents_expiry?: boolean;
  alert_critical_only?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
}

/**
 * Mettre à jour les préférences de notification
 * RLS : Vérifie que l'utilisateur modifie ses propres préférences ou appartient à la même company
 */
export async function updateNotificationPreferences(
  userId: string, 
  preferences: Partial<NotificationPreferences>
) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Non authentifié', data: null };
    }
    
    // Vérifier que l'utilisateur cible existe (RLS filtre par company)
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (targetError || !targetUser) {
      return { error: 'Utilisateur non trouvé', data: null };
    }
    
    // Mettre à jour les préférences (RLS vérifie l'appartenance)
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

/**
 * Créer un nouvel utilisateur
 * RLS pour profiles, AdminClient UNIQUEMENT pour auth.admin.createUser
 */
export async function createUser(data: CreateUserData, creatorId: string) {
  try {
    const supabase = await createClient();
    // Admin client UNIQUEMENT pour les opérations auth (création user)
    const adminSupabase = createAdminClient();
    
    // Vérifier company_id
    if (!data.company_id) {
      return { error: 'Company ID manquant', data: null };
    }
    
    // 1. Vérifier que le créateur a les droits (RLS)
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', creatorId)
      .single();
    
    if (creatorError || !creator) {
      return { error: 'Créateur non trouvé', data: null };
    }
    
    // Seul ADMIN ou DIRECTEUR peut créer des utilisateurs
    if (!['ADMIN', 'DIRECTEUR'].includes(creator.role)) {
      return { error: 'Permissions insuffisantes pour créer un utilisateur', data: null };
    }
    
    // Seul ADMIN peut créer d'autres ADMIN
    if (data.role === 'ADMIN' && creator.role !== 'ADMIN') {
      return { error: 'Seul un administrateur peut créer un autre administrateur', data: null };
    }
    
    // DIRECTEUR ne peut pas créer d'autres DIRECTEUR
    if (data.role === 'DIRECTEUR' && creator.role === 'DIRECTEUR') {
      return { error: 'Un directeur ne peut pas créer un autre directeur', data: null };
    }
    
    // Vérifier que l'email n'est pas déjà utilisé (RLS)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .single();
    
    if (existingUser) {
      return { error: 'Un utilisateur avec cet email existe déjà', data: null };
    }
    
    // 2. Créer l'utilisateur dans Auth Supabase (NÉCESSITE ADMIN CLIENT)
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        company_id: data.company_id,
      },
    });
    
    if (authError || !authUser.user) {
      return { error: `Erreur création auth: ${authError?.message}`, data: null };
    }
    
    // 3. Le profil est créé automatiquement par le trigger
    // Mettre à jour le profil avec les données complètes (RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
        company_id: data.company_id,
        is_active: true,
      })
      .eq('id', authUser.user.id)
      .select()
      .single();
    
    if (profileError) {
      // Rollback: supprimer l'utilisateur auth si le profil échoue
      await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      return { error: `Erreur création profil: ${profileError.message}`, data: null };
    }
    
    revalidatePath('/settings/users');
    
    return { data: profile, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

/**
 * Mettre à jour un utilisateur
 * RLS : Vérifie les permissions
 */
export async function updateUser(data: UpdateUserData, updaterId: string) {
  try {
    const supabase = await createClient();
    
    // Vérifier permissions (RLS)
    const { data: updater, error: updaterError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', updaterId)
      .single();
    
    if (updaterError || !updater) {
      return { error: 'Utilisateur non trouvé', data: null };
    }
    
    // Vérifier l'utilisateur cible (RLS)
    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', data.user_id)
      .single();
    
    if (targetError || !target) {
      return { error: 'Utilisateur cible non trouvé', data: null };
    }
    
    // Permissions
    if (!['ADMIN', 'DIRECTEUR'].includes(updater.role)) {
      return { error: 'Permissions insuffisantes', data: null };
    }
    
    // Seul ADMIN peut modifier un ADMIN
    if (target.role === 'ADMIN' && updater.role !== 'ADMIN') {
      return { error: 'Seul un administrateur peut modifier un administrateur', data: null };
    }
    
    // Seul ADMIN peut changer le rôle
    if (data.role && updater.role !== 'ADMIN') {
      return { error: 'Seul un administrateur peut changer le rôle', data: null };
    }
    
    // Mettre à jour (RLS vérifie l'appartenance)
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user_id)
      .select()
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    revalidatePath('/settings/users');
    return { data: updated, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

/**
 * Supprimer un utilisateur
 * RLS pour vérification, AdminClient UNIQUEMENT pour auth.admin.deleteUser
 */
export async function deleteUser(userId: string, actorId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier permissions (RLS)
    const { data: actor, error: actorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', actorId)
      .single();
    
    if (actorError || !actor) {
      return { error: 'Acteur non trouvé', data: null };
    }
    
    // Vérifier l'utilisateur cible (RLS)
    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (targetError || !target) {
      return { error: 'Utilisateur cible non trouvé', data: null };
    }
    
    // Permissions
    if (!['ADMIN', 'DIRECTEUR'].includes(actor.role)) {
      return { error: 'Permissions insuffisantes', data: null };
    }
    
    // Seul ADMIN peut supprimer un ADMIN
    if (target.role === 'ADMIN' && actor.role !== 'ADMIN') {
      return { error: 'Seul un administrateur peut supprimer un administrateur', data: null };
    }
    
    // Supprimer d'abord les données liées (RLS)
    await supabase.from('user_notification_preferences').delete().eq('user_id', userId);
    await supabase.from('user_login_history').delete().eq('user_id', userId);
    
    // Supprimer le profil (RLS)
    await supabase.from('profiles').delete().eq('id', userId);
    
    // Supprimer l'utilisateur auth (NÉCESSITE ADMIN CLIENT)
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      return { error: `Erreur suppression auth: ${authError.message}`, data: null };
    }
    
    revalidatePath('/settings/users');
    return { success: true, data: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}

/**
 * Désactiver/réactiver un utilisateur
 * RLS : Vérifie les permissions
 */
export async function toggleUserStatus(userId: string, isActive: boolean, actorId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier permissions (RLS)
    const { data: actor, error: actorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', actorId)
      .single();
    
    if (actorError || !actor) {
      return { error: 'Acteur non trouvé', data: null };
    }
    
    if (!['ADMIN', 'DIRECTEUR'].includes(actor.role)) {
      return { error: 'Permissions insuffisantes', data: null };
    }
    
    // Mettre à jour le profil (RLS)
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    // Mettre à jour auth (NÉCESSITE ADMIN CLIENT)
    if (!isActive) {
      await adminSupabase.auth.admin.updateUserById(userId, { 
        ban_duration: '8760h' // Ban for 1 year (effectively permanent)
      });
    } else {
      await adminSupabase.auth.admin.updateUserById(userId, { 
        ban_duration: '0h' // Unban
      });
    }
    
    revalidatePath('/settings/users');
    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { error: message, data: null };
  }
}
