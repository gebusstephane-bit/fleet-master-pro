export function getReadableError(error: unknown): string {
  // Gérer les strings directement
  if (typeof error === 'string') {
    const msg = error.toLowerCase();
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return 'Cette valeur existe déjà';
    }
    if (msg.includes('foreign_key')) {
      return 'Impossible de supprimer, des données sont liées';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Connexion impossible, vérifiez votre réseau';
    }
    if (msg.includes('unauthorized') || msg.includes('403')) {
      return "Vous n'avez pas les droits";
    }
    return error || 'Une erreur est survenue. Réessayez.';
  }

  // Gérer les objets Error
  if (!(error instanceof Error)) {
    return 'Une erreur inattendue est survenue';
  }
  
  const msg = error.message.toLowerCase();
  
  if (msg.includes('unique') || msg.includes('duplicate')) {
    return 'Cette valeur existe déjà';
  }
  
  if (msg.includes('foreign_key')) {
    return 'Impossible de supprimer, des données sont liées';
  }
  
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Connexion impossible, vérifiez votre réseau';
  }
  
  if (msg.includes('unauthorized') || msg.includes('403')) {
    return "Vous n'avez pas les droits";
  }
  
  return 'Une erreur est survenue. Réessayez.';
}
