/**
 * Configuration partagée pour les documents conducteurs.
 * Importable depuis les composants client ET les server actions.
 * NE PAS ajouter 'use server' ni 'use client' ici.
 */

export const DOCUMENT_TYPES = [
  'permis',
  'carte_conducteur',
  'fco',
  'fimo',
  'visite_medicale',
  'adr',
  'qi',
  'autre',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  permis:           'Permis de conduire',
  carte_conducteur: 'Carte conducteur numérique',
  fco:              'FCO — Formation Continue Obligatoire',
  fimo:             'FIMO — Formation Initiale',
  visite_medicale:  'Visite médicale',
  adr:              'Certificat ADR',
  qi:               'Qualification Initiale (QI)',
  autre:            'Autre document',
};

/** Types pour lesquels la date d'expiration est pertinente */
export const TYPES_WITH_EXPIRY: DocumentType[] = [
  'permis',
  'carte_conducteur',
  'fco',
  'visite_medicale',
  'adr',
];

/** Types pour lesquels recto/verso s'applique */
export const TYPES_WITH_SIDES: DocumentType[] = [
  'permis',
  'carte_conducteur',
  'adr',
];

export const SIDES = ['recto', 'verso', 'complet'] as const;
export type DocumentSide = (typeof SIDES)[number];

export const SIDE_LABELS: Record<DocumentSide, string> = {
  recto:   'Recto (face avant)',
  verso:   'Verso (face arrière)',
  complet: 'Document complet (PDF)',
};
