'use server';

/**
 * Actions d'authentification pour les comptes conducteurs (chauffeurs)
 * 
 * SECURITY :
 * - Utilise createAdminClient() (service_role) pour créer les comptes auth
 * - Seuls ADMIN et DIRECTEUR peuvent créer/révoquer des comptes
 * - Vérification stricte du company_id pour l'isolation des données
 * - Rollback automatique si une étape échoue
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { USER_ROLE } from '@/constants/enums';

// ============================================================================
// SCHÉMAS DE VALIDATION
// ============================================================================

const createDriverAccountSchema = z.object({
  driverId: z.string().uuid({ message: 'ID conducteur invalide' }),
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
  firstName: z.string().min(1, { message: 'Prénom requis' }),
  lastName: z.string().min(1, { message: 'Nom requis' }),
  companyId: z.string().uuid({ message: 'ID entreprise invalide' }),
});

const revokeDriverAccountSchema = z.object({
  driverId: z.string().uuid({ message: 'ID conducteur invalide' }),
  companyId: z.string().uuid({ message: 'ID entreprise invalide' }),
});

const resetDriverPasswordSchema = z.object({
  driverId: z.string().uuid({ message: 'ID conducteur invalide' }),
  companyId: z.string().uuid({ message: 'ID entreprise invalide' }),
  newPassword: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
});

// ============================================================================
// TYPES
// ============================================================================

export type CreateDriverAccountInput = z.infer<typeof createDriverAccountSchema>;
export type RevokeDriverAccountInput = z.infer<typeof revokeDriverAccountSchema>;
export type ResetDriverPasswordInput = z.infer<typeof resetDriverPasswordSchema>;

// ============================================================================
// HELPER : Vérifier les permissions Admin/Director
// ============================================================================

async function verifyAdminOrDirector(userId: string, companyId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single();
  
  if (error || !profile) {
    logger.error('[verifyAdminOrDirector] Erreur:', error);
    return false;
  }
  
  // Vérifier le rôle et le company_id
  const allowedRoles: string[] = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR];
  const hasRole = allowedRoles.includes(profile.role);
  const hasCompany = profile.company_id === companyId;
  
  logger.debug('[verifyAdminOrDirector]', {
    userRole: profile.role,
    userCompany: profile.company_id?.slice(0, 8),
    targetCompany: companyId.slice(0, 8),
    hasRole,
    hasCompany,
  });
  
  return hasRole && hasCompany;
}

// ============================================================================
// ACTION : Créer un compte conducteur
// ============================================================================

export const createDriverAccount = authActionClient
  .schema(createDriverAccountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { driverId, email, password, firstName, lastName, companyId } = parsedInput;
    
    // 1. Vérifier que l'utilisateur appelant est Admin ou Director
    const isAuthorized = await verifyAdminOrDirector(ctx.user.id, companyId);
    if (!isAuthorized) {
      throw new Error('Permission refusée — rôle Admin ou Director requis');
    }
    
    const adminClient = createAdminClient();
    
    try {
      // 2. Vérifier que le conducteur existe et appartient à la company
      const { data: driver, error: driverError } = await adminClient
        .from('drivers')
        .select('id, email, first_name, last_name, has_app_access')
        .eq('id', driverId)
        .eq('company_id', companyId)
        .single();
      
      if (driverError || !driver) {
        throw new Error('Conducteur non trouvé ou accès non autorisé');
      }
      
      // 3. Vérifier que le conducteur n'a pas déjà un accès
      if (driver.has_app_access) {
        throw new Error('Ce conducteur a déjà un accès à l\'application');
      }
      
      // 4. Créer le compte Supabase Auth (Supabase gère le doublon d'email nativement)
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true, // Confirmé directement
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: USER_ROLE.CHAUFFEUR,
          company_id: companyId,
        },
        app_metadata: {
          role: USER_ROLE.CHAUFFEUR,
          company_id: companyId,
        },
      });
      
      if (authError || !authData.user) {
        logger.error('[createDriverAccount] Erreur création auth:', authError);
        // Supabase retourne "User already registered" si l'email existe
        if (authError?.message?.includes('already registered')) {
          throw new Error('Cet email est déjà utilisé par un autre compte');
        }
        throw new Error(authError?.message || 'Erreur lors de la création du compte');
      }
      
      const newUserId = authData.user.id;
      logger.debug('[createDriverAccount] Compte auth créé:', newUserId.slice(0, 8));
      
      // 6. Créer le profil dans la table profiles
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: newUserId,
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          company_id: companyId,
          role: USER_ROLE.CHAUFFEUR,
          is_active: true,
          created_by: ctx.user.id,
        });
      
      if (profileError) {
        logger.error('[createDriverAccount] Erreur création profil:', profileError);
        // Rollback : supprimer le compte auth
        await adminClient.auth.admin.deleteUser(newUserId);
        throw new Error('Erreur création profil : ' + profileError.message);
      }
      
      // 7. Lier le compte auth au conducteur dans la table drivers
      const { error: driverUpdateError } = await adminClient
        .from('drivers')
        .update({
          user_id: newUserId,
          has_app_access: true,
          app_access_enabled_at: new Date().toISOString(),
          app_access_enabled_by: ctx.user.id,
        })
        .eq('id', driverId)
        .eq('company_id', companyId);
      
      if (driverUpdateError) {
        logger.error('[createDriverAccount] Erreur mise à jour driver:', driverUpdateError);
        // Rollback complet
        await adminClient.auth.admin.deleteUser(newUserId);
        throw new Error('Erreur liaison conducteur : ' + driverUpdateError.message);
      }
      
      logger.debug('[createDriverAccount] Succès:', { driverId: driverId.slice(0, 8), userId: newUserId.slice(0, 8) });
      
      revalidatePath('/drivers');
      revalidatePath(`/drivers/${driverId}`);
      
      return {
        success: true,
        data: {
          userId: newUserId,
          message: 'Compte conducteur créé avec succès',
        },
      };
      
    } catch (error) {
      logger.error('[createDriverAccount] Erreur:', error);
      throw error;
    }
  });

// ============================================================================
// ACTION : Révoquer un compte conducteur (désactiver/ban)
// ============================================================================

export const revokeDriverAccount = authActionClient
  .schema(revokeDriverAccountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { driverId, companyId } = parsedInput;
    
    // 1. Vérifier les permissions
    const isAuthorized = await verifyAdminOrDirector(ctx.user.id, companyId);
    if (!isAuthorized) {
      throw new Error('Permission refusée — rôle Admin ou Director requis');
    }
    
    const adminClient = createAdminClient();
    
    try {
      // 2. Récupérer le conducteur et son user_id
      const { data: driver, error: driverError } = await adminClient
        .from('drivers')
        .select('id, user_id, has_app_access')
        .eq('id', driverId)
        .eq('company_id', companyId)
        .single();
      
      if (driverError || !driver) {
        throw new Error('Conducteur non trouvé');
      }
      
      if (!driver.user_id) {
        throw new Error('Ce conducteur n\'a pas de compte application');
      }
      
      if (!driver.has_app_access) {
        throw new Error('L\'accès de ce conducteur est déjà révoqué');
      }
      
      // 3. Désactiver le compte auth (ban pour 10 ans = désactivé de facto)
      const { error: banError } = await adminClient.auth.admin.updateUserById(
        driver.user_id,
        { ban_duration: '87600h' } // 10 ans
      );
      
      if (banError) {
        logger.error('[revokeDriverAccount] Erreur ban:', banError);
        throw new Error('Erreur lors de la révocation : ' + banError.message);
      }
      
      // 4. Mettre à jour la table drivers
      const { error: updateError } = await adminClient
        .from('drivers')
        .update({
          has_app_access: false,
          // On garde user_id pour l'historique
        })
        .eq('id', driverId);
      
      if (updateError) {
        logger.error('[revokeDriverAccount] Erreur update driver:', updateError);
        throw new Error('Erreur mise à jour : ' + updateError.message);
      }
      
      // 5. Désactiver le profil
      await adminClient
        .from('profiles')
        .update({ is_active: false })
        .eq('id', driver.user_id);
      
      logger.debug('[revokeDriverAccount] Succès:', driverId.slice(0, 8));
      
      revalidatePath('/drivers');
      revalidatePath(`/drivers/${driverId}`);
      
      return {
        success: true,
        data: {
          message: 'Accès révoqué avec succès',
        },
      };
      
    } catch (error) {
      logger.error('[revokeDriverAccount] Erreur:', error);
      throw error;
    }
  });

// ============================================================================
// ACTION : Réinitialiser le mot de passe d'un conducteur
// ============================================================================

export const resetDriverPassword = authActionClient
  .schema(resetDriverPasswordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { driverId, companyId, newPassword } = parsedInput;
    
    // 1. Vérifier les permissions
    const isAuthorized = await verifyAdminOrDirector(ctx.user.id, companyId);
    if (!isAuthorized) {
      throw new Error('Permission refusée — rôle Admin ou Director requis');
    }
    
    const adminClient = createAdminClient();
    
    try {
      // 2. Récupérer le conducteur
      const { data: driver, error: driverError } = await adminClient
        .from('drivers')
        .select('id, user_id, has_app_access')
        .eq('id', driverId)
        .eq('company_id', companyId)
        .single();
      
      if (driverError || !driver) {
        throw new Error('Conducteur non trouvé');
      }
      
      if (!driver.user_id) {
        throw new Error('Ce conducteur n\'a pas de compte application');
      }
      
      // 3. Réinitialiser le mot de passe
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        driver.user_id,
        { password: newPassword }
      );
      
      if (updateError) {
        logger.error('[resetDriverPassword] Erreur:', updateError);
        throw new Error('Erreur lors de la réinitialisation : ' + updateError.message);
      }
      
      logger.debug('[resetDriverPassword] Succès:', driverId.slice(0, 8));
      
      return {
        success: true,
        data: {
          message: 'Mot de passe réinitialisé avec succès',
        },
      };
      
    } catch (error) {
      logger.error('[resetDriverPassword] Erreur:', error);
      throw error;
    }
  });

// ============================================================================
// ACTION : Réactiver un compte conducteur (après révocation)
// ============================================================================

export const reactivateDriverAccount = authActionClient
  .schema(revokeDriverAccountSchema) // Même schéma
  .action(async ({ parsedInput, ctx }) => {
    const { driverId, companyId } = parsedInput;
    
    const isAuthorized = await verifyAdminOrDirector(ctx.user.id, companyId);
    if (!isAuthorized) {
      throw new Error('Permission refusée');
    }
    
    const adminClient = createAdminClient();
    
    try {
      const { data: driver, error: driverError } = await adminClient
        .from('drivers')
        .select('id, user_id')
        .eq('id', driverId)
        .eq('company_id', companyId)
        .single();
      
      if (driverError || !driver?.user_id) {
        throw new Error('Conducteur ou compte non trouvé');
      }
      
      // Lever le ban
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(
        driver.user_id,
        { ban_duration: '0s' } // Débannir
      );
      
      if (unbanError) {
        throw new Error('Erreur réactivation : ' + unbanError.message);
      }
      
      // Réactiver dans drivers
      await adminClient
        .from('drivers')
        .update({ has_app_access: true })
        .eq('id', driverId);
      
      // Réactiver le profil
      await adminClient
        .from('profiles')
        .update({ is_active: true })
        .eq('id', driver.user_id);
      
      revalidatePath('/drivers');
      revalidatePath(`/drivers/${driverId}`);
      
      return {
        success: true,
        data: { message: 'Compte réactivé avec succès' },
      };
      
    } catch (error) {
      logger.error('[reactivateDriverAccount] Erreur:', error);
      throw error;
    }
  });
