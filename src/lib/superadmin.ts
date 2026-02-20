/**
 * Utilitaire SuperAdmin - Centralisation de la configuration
 * 
 * Ce module centralise l'accès aux informations du SuperAdmin
 * pour éviter les hardcodages et faciliter la maintenance sécurisée.
 */

/**
 * Récupère l'email du SuperAdmin depuis les variables d'environnement
 * @returns string - L'email du SuperAdmin
 * @throws Error si la variable d'environnement n'est pas définie
 */
export function getSuperadminEmail(): string {
  const email = process.env.SUPERADMIN_EMAIL;
  
  if (!email) {
    // Fallback pour la compatibilité (à supprimer en production)
    console.warn('⚠️ SUPERADMIN_EMAIL non défini, utilisation valeur par défaut');
    return 'contact@fleet-master.fr';
  }
  
  return email;
}

/**
 * Vérifie si un email correspond au SuperAdmin
 * @param email - L'email à vérifier
 * @returns boolean - true si c'est le SuperAdmin
 */
export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const superadminEmail = getSuperadminEmail();
  return email.toLowerCase() === superadminEmail.toLowerCase();
}

/**
 * Récupère le secret de setup pour créer le superadmin
 * @returns string | undefined - Le secret ou undefined
 */
export function getSuperadminSetupSecret(): string | undefined {
  return process.env.SUPERADMIN_SETUP_SECRET;
}

/**
 * Vérifie si le secret de setup est valide
 * @param providedSecret - Le secret fourni
 * @returns boolean - true si le secret est valide
 */
export function isValidSetupSecret(providedSecret: string | null): boolean {
  if (!providedSecret) return false;
  
  const expectedSecret = getSuperadminSetupSecret();
  
  // Si pas de secret configuré, refuser par défaut (sauf en dev sans config)
  if (!expectedSecret) {
    console.error('❌ SUPERADMIN_SETUP_SECRET non configuré');
    return false;
  }
  
  // Comparaison constant-time pour éviter les attaques timing
  try {
    // Utiliser une comparaison simple mais sûre
    if (providedSecret.length !== expectedSecret.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < providedSecret.length; i++) {
      result |= providedSecret.charCodeAt(i) ^ expectedSecret.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
