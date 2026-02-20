'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

// Vérifier les permissions
async function checkPermissions(supabase: any, userId: string, requiredRoles: string[]) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single();
  
  if (error || !profile) {
    return { allowed: false, error: 'Utilisateur non trouvé' };
  }
  
  if (!requiredRoles.includes(profile.role)) {
    return { allowed: false, error: 'Permissions insuffisantes' };
  }
  
  return { allowed: true, profile };
}

// Récupérer tous les utilisateurs de l'entreprise
export async function getUsers(companyId?: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Non authentifié', data: null };
    }
    
    // Si pas de companyId fourni, récupérer celui de l'utilisateur courant
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();
      
      if (!profile) {
        return { error: 'Profil non trouvé', data: null };
      }
      
      targetCompanyId = profile.company_id || undefined;
    }
    
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('company_id', targetCompanyId || '')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('getUsers error:', error);
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error('getUsers exception:', error);
    return { error: error.message, data: null };
  }
}

// Récupérer un utilisateur par ID
export async function getUserById(userId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { error: 'Non authentifié', data: null };
    }
    
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('*, user_notification_preferences(*)')
      .eq('id', userId)
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    return { data, error: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}

// Créer un nouvel utilisateur
export async function createUser(data: CreateUserData, creatorId: string) {
  try {
    console.log('createUser: Données reçues:', { ...data, password: '***' });
    
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier company_id
    if (!data.company_id) {
      return { error: 'Company ID manquant', data: null };
    }
    
    // 1. Vérifier que le créateur a les droits (avec admin pour bypass RLS)
    const { data: creator, error: creatorError } = await adminSupabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', creatorId)
      .single();
    
    if (creatorError || !creator) {
      return { error: 'Créateur non trouvé', data: null };
    }
    
    console.log('createUser: Créateur trouvé:', creator);
    
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
    
    // Vérifier que l'email n'est pas déjà utilisé
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .single();
    
    if (existingUser) {
      return { error: 'Un utilisateur avec cet email existe déjà', data: null };
    }
    
    // 2. Créer l'utilisateur dans Auth Supabase (avec admin client)
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      },
    });
    
    if (authError) {
      console.error('createUser auth error:', authError);
      return { error: `Erreur création auth: ${authError.message}`, data: null };
    }
    
    // 3. Créer le profil (avec admin pour bypass RLS)
    console.log('createUser: Création profil avec company_id:', data.company_id);
    
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        company_id: data.company_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        is_active: true,
        created_by: creatorId,
      })
      .select()
      .single();
    
    console.log('createUser: Profil créé:', profile);
    
    if (profileError) {
      // Rollback: supprimer l'utilisateur auth
      await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      console.error('createUser profile error:', profileError);
      return { error: `Erreur création profil: ${profileError.message}`, data: null };
    }
    
    // 4. Créer les préférences de notifications par défaut (avec admin)
    await adminSupabase
      .from('user_notification_preferences')
      .insert({
        user_id: authUser.user.id,
        alert_maintenance: true,
        alert_inspection: true,
        alert_routes: true,
        alert_documents_expiry: true,
        alert_fuel: false,
        alert_critical_only: data.role === 'EXPLOITANT',
        email_enabled: true,
        sms_enabled: false,
        push_enabled: false,
      });
    
    revalidatePath('/settings/users');
    
    return { 
      data: { 
        user: profile 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('createUser exception:', error);
    return { error: error.message, data: null };
  }
}

// Mettre à jour un utilisateur
export async function updateUser(data: UpdateUserData, updaterId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // 1. Vérifier les permissions (avec admin)
    const { data: updater, error: updaterError } = await adminSupabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', updaterId)
      .single();
    
    if (updaterError || !updater) {
      return { error: 'Modificateur non trouvé', data: null };
    }
    
    // 2. Récupérer l'utilisateur cible (avec admin)
    const { data: target, error: targetError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', data.user_id)
      .single();
    
    if (targetError || !target) {
      return { error: 'Utilisateur non trouvé', data: null };
    }
    
    // 3. Vérifier les permissions de modification
    // - ADMIN peut tout modifier
    // - DIRECTEUR peut modifier dans sa company sauf les ADMIN
    // - Un utilisateur peut se modifier lui-même (sauf son rôle)
    
    const isSelf = updaterId === data.user_id;
    const isAdmin = updater.role === 'ADMIN';
    const isDirecteur = updater.role === 'DIRECTEUR';
    const sameCompany = updater.company_id === target.company_id;
    
    if (!isAdmin && !isDirecteur && !isSelf) {
      return { error: 'Permissions insuffisantes', data: null };
    }
    
    if (isDirecteur) {
      if (!sameCompany) {
        return { error: 'Utilisateur d\'une autre entreprise', data: null };
      }
      if (target.role === 'ADMIN') {
        return { error: 'Impossible de modifier un administrateur', data: null };
      }
      if (data.role && data.role === 'ADMIN') {
        return { error: 'Impossible de promouvoir au rang d\'administrateur', data: null };
      }
    }
    
    if (isSelf && data.role && data.role !== target.role) {
      return { error: 'Vous ne pouvez pas modifier votre propre rôle', data: null };
    }
    
    // 4. Effectuer la mise à jour (avec admin)
    const updateData: any = {};
    if (data.first_name) updateData.first_name = data.first_name;
    if (data.last_name) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role && (isAdmin || isDirecteur)) updateData.role = data.role;
    if (data.is_active !== undefined && (isAdmin || isDirecteur)) updateData.is_active = data.is_active;
    
    const { data: updated, error } = await adminSupabase
      .from('profiles')
      .update(updateData)
      .eq('id', data.user_id)
      .select()
      .single();
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    revalidatePath('/settings/users');
    revalidatePath(`/settings/users/${data.user_id}/edit`);
    
    return { data: updated, error: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}

// Activer/Désactiver un utilisateur
export async function toggleUserStatus(userId: string, isActive: boolean, actorId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier permissions (avec admin)
    const { data: actor, error: actorError } = await adminSupabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', actorId)
      .single();
    
    if (actorError || !actor) {
      return { error: 'Acteur non trouvé', data: null };
    }
    
    const { data: target, error: targetError } = await adminSupabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .single();
    
    if (targetError || !target) {
      return { error: 'Cible non trouvée', data: null };
    }
    
    // Vérifications
    if (actor.role !== 'ADMIN') {
      if (actor.company_id !== target.company_id) {
        return { error: 'Entreprise différente', data: null };
      }
      if (target.role === 'ADMIN') {
        return { error: 'Impossible de modifier un admin', data: null };
      }
    }
    
    // Ne pas se désactiver soi-même
    if (actorId === userId && !isActive) {
      return { error: 'Vous ne pouvez pas vous désactiver vous-même', data: null };
    }
    
    // Mettre à jour le profil (avec admin)
    const { error } = await adminSupabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);
    
    if (error) {
      return { error: error.message, data: null };
    }
    
    // Désactiver/activer dans Auth aussi
    if (!isActive) {
      await adminSupabase.auth.admin.updateUserById(userId, { 
        ban_duration: '876000h' // 100 ans = banni
      });
    } else {
      await adminSupabase.auth.admin.updateUserById(userId, { 
        ban_duration: 'none' 
      });
    }
    
    revalidatePath('/settings/users');
    
    return { data: { success: true }, error: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}

// Supprimer un utilisateur (ADMIN uniquement)
export async function deleteUser(userId: string, actorId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Vérifier que c'est un ADMIN (avec admin)
    const { data: actor, error: actorError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', actorId)
      .single();
    
    if (actorError || !actor || actor.role !== 'ADMIN') {
      return { error: 'Seul un administrateur peut supprimer un utilisateur', data: null };
    }
    
    // Ne pas se supprimer soi-même
    if (actorId === userId) {
      return { error: 'Vous ne pouvez pas vous supprimer vous-même', data: null };
    }
    
    // Supprimer d'abord les données liées (avec admin)
    await adminSupabase.from('user_notification_preferences').delete().eq('user_id', userId);
    await adminSupabase.from('user_login_history').delete().eq('user_id', userId);
    
    // Supprimer le profil (avec admin)
    await adminSupabase.from('profiles').delete().eq('id', userId);
    
    // Supprimer l'utilisateur Auth
    await adminSupabase.auth.admin.deleteUser(userId);
    
    revalidatePath('/settings/users');
    
    return { data: { success: true }, error: null };
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}

// Mettre à jour les préférences de notifications
export async function updateNotificationPreferences(
  userId: string, 
  preferences: {
    alert_maintenance?: boolean;
    alert_inspection?: boolean;
    alert_routes?: boolean;
    alert_documents_expiry?: boolean;
    alert_fuel?: boolean;
    alert_critical_only?: boolean;
    email_enabled?: boolean;
    sms_enabled?: boolean;
    push_enabled?: boolean;
  }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { error: 'Non autorisé', data: null };
    }
    
    const { data, error } = await adminSupabase
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
  } catch (error: any) {
    return { error: error.message, data: null };
  }
}
