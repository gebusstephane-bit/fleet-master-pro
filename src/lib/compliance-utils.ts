/**
 * Utilitaires pour la gestion de la conformité réglementaire
 * Calcul des statuts d'expiration des documents
 */

export type DocumentStatus = 'valid' | 'warning' | 'expired' | 'missing';

export interface DocumentStatusResult {
  status: DocumentStatus;
  daysRemaining: number | null;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface ComplianceItem {
  name: string;
  expiryDate: string | null | undefined;
}

export interface ComplianceScore {
  score: number;
  totalDocuments: number;
  validDocuments: number;
  warningDocuments: number;
  expiredDocuments: number;
  missingDocuments: number;
}

/**
 * Calcule le statut d'un document selon sa date d'expiration
 * 
 * Règles :
 * - null ou undefined → 'missing' (gris) "Non renseigné"
 * - date passée → 'expired' (rouge) "Expiré depuis X jours"
 * - date dans < 30 jours → 'expired' (rouge) "Expire dans X jours"  
 * - date dans 30-60 jours → 'warning' (orange) "Expire dans X jours"
 * - date dans > 60 jours → 'valid' (vert) "Valide X jours"
 */
export function getDocumentStatus(
  expiryDate: Date | string | null | undefined
): DocumentStatusResult {
  // Cas document non renseigné (null, undefined, ou chaîne vide)
  if (!expiryDate || expiryDate === '') {
    return {
      status: 'missing',
      daysRemaining: null,
      label: 'Non renseigné',
      color: 'slate',
      bgColor: 'bg-slate-500/15',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-500/20',
    };
  }

  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Date passée → Expiré
  if (daysRemaining < 0) {
    return {
      status: 'expired',
      daysRemaining,
      label: `Expiré depuis ${Math.abs(daysRemaining)} j`,
      color: 'red',
      bgColor: 'bg-red-500/15',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/20',
    };
  }

  // Moins de 30 jours → Expiré (critique)
  if (daysRemaining <= 30) {
    return {
      status: 'expired',
      daysRemaining,
      label: `${daysRemaining} j restants`,
      color: 'red',
      bgColor: 'bg-red-500/15',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/20',
    };
  }

  // 30-60 jours → Warning
  if (daysRemaining <= 60) {
    return {
      status: 'warning',
      daysRemaining,
      label: `${daysRemaining} j restants`,
      color: 'amber',
      bgColor: 'bg-amber-500/15',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    };
  }

  // Plus de 60 jours → Valide
  return {
    status: 'valid',
    daysRemaining,
    label: `${daysRemaining} j restants`,
    color: 'emerald',
    bgColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
  };
}

/**
 * Calcule le score de conformité global (0-100)
 */
export function calculateComplianceScore(items: ComplianceItem[]): ComplianceScore {
  if (items.length === 0) {
    return {
      score: 100,
      totalDocuments: 0,
      validDocuments: 0,
      warningDocuments: 0,
      expiredDocuments: 0,
      missingDocuments: 0,
    };
  }

  let validCount = 0;
  let warningCount = 0;
  let expiredCount = 0;
  let missingCount = 0;

  for (const item of items) {
    const status = getDocumentStatus(item.expiryDate).status;
    switch (status) {
      case 'valid':
        validCount++;
        break;
      case 'warning':
        warningCount++;
        break;
      case 'expired':
        expiredCount++;
        break;
      case 'missing':
        missingCount++;
        break;
    }
  }

  // Calcul du score : valide = 100%, warning = 50%, expired/missing = 0%
  const totalScore = (validCount * 100) + (warningCount * 50) + (expiredCount * 0) + (missingCount * 0);
  const score = Math.round(totalScore / items.length);

  return {
    score,
    totalDocuments: items.length,
    validDocuments: validCount,
    warningDocuments: warningCount,
    expiredDocuments: expiredCount,
    missingDocuments: missingCount,
  };
}

/**
 * Calcule les statistiques globales de conformité pour un ensemble de véhicules et conducteurs
 */
export interface GlobalComplianceStats {
  criticalCount: number;     // ≤ 30 jours ou expiré
  warningCount: number;      // 30-60 jours
  missingCount: number;      // Non renseigné
  compliantCount: number;    // > 60 jours
}

export function calculateGlobalStats(params: {
  vehicles: Array<{
    technical_control_date?: string | null;
    technical_control_expiry?: string | null;
    tachy_control_expiry?: string | null;
    tachy_control_date?: string | null;
    atp_expiry?: string | null;
    atp_date?: string | null;
    insurance_expiry?: string | null;
  }>;
  drivers: Array<{
    license_expiry?: string | null;
    driver_card_expiry?: string | null;
    fimo_date?: string | null;
    fimo_expiry?: string | null;
    fcos_expiry?: string | null;
    medical_certificate_expiry?: string | null;
    adr_certificate_expiry?: string | null;
  }>;
}): GlobalComplianceStats {
  let criticalCount = 0;
  let warningCount = 0;
  let missingCount = 0;
  let compliantCount = 0;

  // Fonction helper pour compter un statut
  const countStatus = (date: string | null | undefined) => {
    const result = getDocumentStatus(date);
    switch (result.status) {
      case 'expired':
        criticalCount++;
        break;
      case 'warning':
        warningCount++;
        break;
      case 'missing':
        missingCount++;
        break;
      case 'valid':
        compliantCount++;
        break;
    }
  };

  // Vérifier tous les documents des véhicules
  for (const vehicle of params.vehicles) {
    countStatus(vehicle.technical_control_expiry || vehicle.technical_control_date);
    countStatus(vehicle.tachy_control_expiry || vehicle.tachy_control_date);
    countStatus(vehicle.atp_expiry || vehicle.atp_date);
    countStatus(vehicle.insurance_expiry);
  }

  // Vérifier tous les documents des conducteurs
  for (const driver of params.drivers) {
    countStatus(driver.license_expiry);
    countStatus(driver.driver_card_expiry);
    countStatus(driver.fimo_expiry || driver.fimo_date);
    countStatus(driver.fcos_expiry);
    countStatus(driver.medical_certificate_expiry);
    countStatus(driver.adr_certificate_expiry);
  }

  return {
    criticalCount,
    warningCount,
    missingCount,
    compliantCount,
  };
}

/**
 * Trie les éléments par criticité (les plus critiques en premier)
 */
export function sortByCriticality<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.score - b.score);
}

/**
 * Formate une date pour l'affichage
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Vérifie si un rôle a accès à la page de conformité
 * Accès : Admin, Directeur, Agent de parc
 */
export function hasComplianceAccess(role?: string): boolean {
  const allowedRoles = ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'];
  return allowedRoles.includes(role || '');
}
