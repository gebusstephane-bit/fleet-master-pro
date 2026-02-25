/**
 * Server Action: Mise à jour du mot de passe utilisateur
 * 
 * Sécurité:
 * - Validation côté serveur des critères de mot de passe
 * - Vérification que le nouveau mot de passe ≠ ancien mot de passe
 * - Utilisation de supabase.auth.updateUser() avec session active
 */

'use server';

import { createClient } from '@/lib/supabase/server';

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePasswordResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Valide la force du mot de passe selon les critères de sécurité
 * - Minimum 12 caractères
 * - Au moins 1 majuscule
 * - Au moins 1 chiffre
 * - Au moins 1 caractère spécial
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 12 caractères' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un caractère spécial' };
  }

  return { valid: true };
}

/**
 * Met à jour le mot de passe de l'utilisateur connecté
 */
export async function updatePassword(input: UpdatePasswordInput): Promise<UpdatePasswordResult> {
  try {
    // Validation des entrées
    if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
      return { success: false, error: 'Tous les champs sont obligatoires' };
    }

    // Vérification que les mots de passe correspondent
    if (input.newPassword !== input.confirmPassword) {
      return { success: false, error: 'Les nouveaux mots de passe ne correspondent pas' };
    }

    // Vérification que le nouveau mot de passe est différent de l'ancien
    if (input.currentPassword === input.newPassword) {
      return { success: false, error: 'Le nouveau mot de passe doit être différent de l\'ancien' };
    }

    // Validation de la force du mot de passe
    const strengthCheck = validatePasswordStrength(input.newPassword);
    if (!strengthCheck.valid) {
      return { success: false, error: strengthCheck.error };
    }

    // Authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérification de l'ancien mot de passe en essayant de se connecter
    // Cela garantit que l'utilisateur connaît son mot de passe actuel
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: input.currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Mot de passe actuel incorrect' };
    }

    // Mise à jour du mot de passe
    const { error: updateError } = await supabase.auth.updateUser({
      password: input.newPassword,
    });

    if (updateError) {
      console.error('[UpdatePassword] Erreur lors de la mise à jour:', updateError);
      return { 
        success: false, 
        error: updateError.message || 'Erreur lors de la mise à jour du mot de passe' 
      };
    }

    console.info(`[UpdatePassword] Mot de passe mis à jour pour user=${user.id}`);

    return {
      success: true,
      message: 'Votre mot de passe a été mis à jour avec succès',
    };

  } catch (error) {
    console.error('[UpdatePassword] Erreur inattendue:', error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? 'Une erreur est survenue lors de la mise à jour du mot de passe'
          : error.message,
      };
    }

    return { success: false, error: 'Erreur lors de la mise à jour du mot de passe' };
  }
}
