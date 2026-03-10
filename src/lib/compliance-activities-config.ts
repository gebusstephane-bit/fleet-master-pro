/**
 * Configuration des documents par activité de transport
 * Partagée entre l'interface web et l'export PDF
 */

export type TransportActivity = 
  | 'MARCHANDISES_GENERALES' 
  | 'FRIGORIFIQUE' 
  | 'ADR_COLIS' 
  | 'ADR_CITERNE' 
  | 'CONVOI_EXCEPTIONNEL' 
  | 'BENNE_TRAVAUX_PUBLICS' 
  | 'ANIMAUX_VIVANTS';

export interface DocumentConfig {
  key: 'technical_control_expiry' | 'tachy_control_expiry' | 'atp_expiry' | 'insurance_expiry' | 'adr_certificate_expiry' | 'adr_equipment_expiry';
  fallback: 'technical_control_date' | 'tachy_control_date' | 'atp_date' | null;
  label: string;
  code: string;
  shortLabel: string; // Pour le PDF (en-têtes courts)
}

// Documents par activité spécifique
export const ACTIVITY_DOCUMENTS: Record<TransportActivity, DocumentConfig[]> = {
  // Marchandises générales: CT, Tachy (si PL), Assurance
  MARCHANDISES_GENERALES: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
  // Frigorifique: CT, Tachy (si PL), ATP, Assurance
  FRIGORIFIQUE: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'atp_expiry', fallback: 'atp_date', label: 'ATP (Frigo)', code: 'ATP', shortLabel: 'ATP' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
  // ADR Colis: CT, Tachy (si PL), Certificat ADR, Équipement ADR, Assurance
  // NOTE: PAS d'ATP pour l'ADR !
  ADR_COLIS: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'adr_certificate_expiry', fallback: null, label: 'Certificat ADR', code: 'ADR_CERT', shortLabel: 'CERTIFICAT ADR' },
    { key: 'adr_equipment_expiry', fallback: null, label: 'Équipement ADR', code: 'ADR_EQUIPEMENT', shortLabel: 'EQUIPEMENT ADR' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
  // ADR Citerne: même chose que ADR Colis (PAS d'ATP !)
  ADR_CITERNE: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'adr_certificate_expiry', fallback: null, label: 'Certificat ADR', code: 'ADR_CERT', shortLabel: 'CERTIFICAT ADR' },
    { key: 'adr_equipment_expiry', fallback: null, label: 'Équipement ADR', code: 'ADR_EQUIPEMENT', shortLabel: 'EQUIPEMENT ADR' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
  // Convoi exceptionnel: CT, Tachy, Assurance
  CONVOI_EXCEPTIONNEL: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
  // Benne TP: CT, Tachy, Assurance
  BENNE_TRAVAUX_PUBLICS: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
  // Animaux vivants: CT, Tachy, Assurance
  ANIMAUX_VIVANTS: [
    { key: 'technical_control_expiry', fallback: 'technical_control_date', label: 'Contrôle Technique', code: 'CT', shortLabel: 'CONTROLE TECH.' },
    { key: 'tachy_control_expiry', fallback: 'tachy_control_date', label: 'Tachygraphe', code: 'TACHY', shortLabel: 'TACHYGRAPHE' },
    { key: 'insurance_expiry', fallback: null, label: 'Assurance', code: 'ASSURANCE', shortLabel: 'ASSURANCE' },
  ],
};

/**
 * Détermine les documents à afficher en fonction des activités de l'entreprise
 * @param activities - Liste des activités de l'entreprise
 * @returns Liste des documents à afficher (sans doublons)
 */
export function getDocumentsForActivities(
  activities: Array<{ activity: string; is_primary?: boolean }>
): DocumentConfig[] {
  if (!activities || activities.length === 0) {
    // Par défaut: marchandises générales
    return ACTIVITY_DOCUMENTS.MARCHANDISES_GENERALES;
  }

  // Activité principale en premier
  const primaryActivity = activities.find(a => a.is_primary)?.activity;
  
  // Si plusieurs activités, on merge les documents (sans doublons)
  const allDocs: DocumentConfig[] = [];
  const seenKeys = new Set<string>();
  
  // Ordre: activité principale d'abord, puis les autres
  const activitiesToShow = primaryActivity 
    ? [primaryActivity, ...activities.filter(a => a.activity !== primaryActivity).map(a => a.activity)]
    : activities.map(a => a.activity);

  for (const activity of activitiesToShow) {
    const docs = ACTIVITY_DOCUMENTS[activity as TransportActivity] || ACTIVITY_DOCUMENTS.MARCHANDISES_GENERALES;
    for (const doc of docs) {
      if (!seenKeys.has(doc.key)) {
        seenKeys.add(doc.key);
        allDocs.push(doc);
      }
    }
  }
  
  return allDocs;
}

/**
 * Vérifie si une activité nécessite des documents ADR
 */
export function hasADRActivity(
  activities: Array<{ activity: string }>
): boolean {
  return activities.some(a => 
    a.activity === 'ADR_COLIS' || a.activity === 'ADR_CITERNE'
  );
}

/**
 * Vérifie si une activité nécessite l'ATP
 */
export function needsATP(
  activities: Array<{ activity: string }>
): boolean {
  return activities.some(a => a.activity === 'FRIGORIFIQUE');
}
