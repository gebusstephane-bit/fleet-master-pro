/**
 * Configuration des types de véhicules détaillés par activité de transport
 * Ces types enrichissent le formulaire de création de véhicule
 * tout en mappant vers les types existants dans la base de données
 */

import type { TransportActivity } from '@/actions/company-activities';

// Types de base toujours présents quelle que soit l'activité
export const BASE_VEHICLE_TYPES = [
  { value: 'VOITURE', label: '🚗 Voiture', dbType: 'VOITURE' as const },
  { value: 'FOURGON', label: '🚐 Fourgon', dbType: 'FOURGON' as const },
  { value: 'TRACTEUR_ROUTIER', label: '🚜 Tracteur Routier', dbType: 'TRACTEUR_ROUTIER' as const },
] as const;

// Types spécifiques pour chaque activité
export const ACTIVITY_VEHICLE_TYPES: Record<TransportActivity, VehicleTypeOption[]> = {
  MARCHANDISES_GENERALES: [
    // Porteurs (PL)
    { value: 'PL_TAUTLINER', label: '🚛 Porteur Tautliner (rideaux)', dbType: 'POIDS_LOURD', description: 'Rideaux coulissants' },
    { value: 'PL_FOURGON_SEC', label: '📦 Porteur Fourgon sec', dbType: 'POIDS_LOURD', description: 'Plis, messagerie' },
    { value: 'PL_SAVOYARDE', label: '🚛 Porteur Savoyarde', dbType: 'POIDS_LOURD', description: 'Bâché avec ridelles' },
    { value: 'PL_PLATEAU', label: '📋 Porteur Plateau', dbType: 'POIDS_LOURD', description: 'Avec ou sans grue' },
    { value: 'PL_PLATEAU_GRUE', label: '🏗️ Porteur Plateau avec grue', dbType: 'POIDS_LOURD', description: 'Grue de manutention' },
    // Semi-remorques
    { value: 'SEMI_TAUTLINER', label: '🚛 Semi Tautliner', dbType: 'TRACTEUR_ROUTIER', description: 'Standard, Méga, City' },
    { value: 'SEMI_FOURGON', label: '📦 Semi Fourgon sec', dbType: 'TRACTEUR_ROUTIER', description: 'Messagerie' },
    { value: 'SEMI_SAVOYARDE', label: '🚛 Semi Savoyarde', dbType: 'TRACTEUR_ROUTIER', description: 'Bâché ridelles' },
    { value: 'SEMI_PLATEAU', label: '📋 Semi Plateau', dbType: 'TRACTEUR_ROUTIER', description: 'Droit ou extensible' },
    // Remorques
    { value: 'REMORQUE_TAUTLINER', label: '🚛 Remorque Tautliner', dbType: 'REMORQUE', description: 'Rideaux coulissants' },
    { value: 'REMORQUE_FOURGON', label: '📦 Remorque Fourgon', dbType: 'REMORQUE', description: 'Fourgon sec' },
    { value: 'REMORQUE_PLATEAU', label: '📋 Remorque Plateau', dbType: 'REMORQUE', description: 'Plateau ridelles' },
    { value: 'REMORQUE_ESSIEUX_CENTRAUX', label: '🚛 Remorque essieux centraux', dbType: 'REMORQUE', description: 'Train double/tandem' },
    { value: 'REMORQUE_CHANTIER', label: '🏗️ Remorque Chantier', dbType: 'REMORQUE', description: 'Conditions sévères, hors route' },
    { value: 'REMORQUE_PORTE_CONTENEUR', label: '📦 Remorque Porte-conteneur', dbType: 'REMORQUE', description: 'Twistlocks, verrous tournants' },
  ],
  
  FRIGORIFIQUE: [
    // Porteurs frigo
    { value: 'PL_FRIGO_CAISSE', label: '❄️ Porteur Frigorifique', dbType: 'POIDS_LOURD_FRIGO', description: 'Caisse isolée + groupe froid' },
    { value: 'PL_FRIGO_HAYON', label: '❄️🔄 Porteur Frigo hayon', dbType: 'POIDS_LOURD_FRIGO', description: 'Hayon rabattable ou rétractable' },
    // Semi-remorques frigo
    { value: 'SEMI_FRIGO_MONO', label: '❄️ Semi Frigo mono-temp', dbType: 'TRACTEUR_ROUTIER', description: 'Mono-température' },
    { value: 'SEMI_FRIGO_MULTI', label: '❄️🌡️ Semi Frigo multi-temp', dbType: 'TRACTEUR_ROUTIER', description: 'Bi ou multi-températures' },
    { value: 'SEMI_FRIGO_PENDERIE', label: '🥩 Semi Frigo penderie', dbType: 'TRACTEUR_ROUTIER', description: 'Viande en carcasse' },
    { value: 'SEMI_FRIGO_DOUBLE_PLANCHER', label: '❄️📦 Semi Frigo double étage', dbType: 'TRACTEUR_ROUTIER', description: 'Double plancher' },
    // Remorques frigo
    { value: 'REMORQUE_FRIGO_MONO', label: '❄️ Remorque Frigo', dbType: 'REMORQUE_FRIGO', description: 'Mono-température' },
    { value: 'REMORQUE_FRIGO_MULTI', label: '❄️🌡️ Remorque Frigo multi', dbType: 'REMORQUE_FRIGO', description: 'Multi-températures' },
  ],
  
  ADR_CITERNE: [
    // Porteurs citerne
    { value: 'PL_CITERNE_DISTRIB', label: '⛽ Porteur Citerne distribution', dbType: 'POIDS_LOURD', description: 'Fioul, 19T ou 26T, volucompteur' },
    { value: 'PL_HYDROCUREUR', label: '🧪 Porteur Hydrocureur', dbType: 'POIDS_LOURD', description: 'Déchets dangereux' },
    // Semi-remorques citerne
    { value: 'SEMI_CITERNE_HYDROCARBURES', label: '⛽ Semi Citerne Hydrocarbures', dbType: 'TRACTEUR_ROUTIER', description: 'Compartimentée' },
    { value: 'SEMI_CITERNE_CHIMIQUE', label: '🧪 Semi Citerne Chimique', dbType: 'TRACTEUR_ROUTIER', description: 'Inox, calorifugée ou chauffée' },
    { value: 'SEMI_CITERNE_GAZ', label: '🔥 Semi Citerne Gaz', dbType: 'TRACTEUR_ROUTIER', description: 'GPL, cryogénique' },
    { value: 'SEMI_CITERNE_PULVERULENTE', label: '💨 Semi Citerne Pulvérulente', dbType: 'TRACTEUR_ROUTIER', description: 'Matières dangereuses en poudre' },
  ],
  
  CONVOI_EXCEPTIONNEL: [
    // Tracteurs lourds
    { value: 'TRACTEUR_LESTE_6X4', label: '🏗️ Tracteur lourd 6x4', dbType: 'TRACTEUR_ROUTIER', description: 'Avec lest' },
    { value: 'TRACTEUR_LESTE_8X4', label: '🏗️ Tracteur lourd 8x4', dbType: 'TRACTEUR_ROUTIER', description: 'Avec lest' },
    // Semi-remorques spéciales
    { value: 'SEMI_PORTE_CHAR', label: '🏗️ Semi Porte-char', dbType: 'TRACTEUR_ROUTIER', description: 'Surbaissée, extra-surbaissée' },
    { value: 'SEMI_EXTENSIBLE', label: '📏 Semi Extensible', dbType: 'TRACTEUR_ROUTIER', description: 'Plateau à tiroirs' },
    { value: 'SEMI_MODULAIRE', label: '🔧 Semi Modulaire', dbType: 'TRACTEUR_ROUTIER', description: 'Lignes d\'essieux couplables' },
    { value: 'SEMI_EXTRA_PLATE', label: '📦 Semi Extra-plate', dbType: 'TRACTEUR_ROUTIER', description: 'Pour cuves ou pièces industrielles' },
  ],
  
  ANIMAUX_VIVANTS: [
    // Porteurs bétaillère
    { value: 'PL_BETAILLERE_1_PONT', label: '🐄 Porteur Bétaillère 1 pont', dbType: 'POIDS_LOURD', description: 'Pont arrière hydraulique' },
    { value: 'PL_BETAILLERE_2_PONTS', label: '🐄🐄 Porteur Bétaillère 2 ponts', dbType: 'POIDS_LOURD', description: '2 ponts de chargement' },
    // Semi-remorques bétaillère
    { value: 'SEMI_BETAILLERE_1_PONT', label: '🐄 Semi Bétaillère 1 pont', dbType: 'TRACTEUR_ROUTIER', description: '1 étage de chargement' },
    { value: 'SEMI_BETAILLERE_2_PONTS', label: '🐄🐄 Semi Bétaillère 2 ponts', dbType: 'TRACTEUR_ROUTIER', description: '2 étages de chargement' },
    { value: 'SEMI_BETAILLERE_3_PONTS', label: '🐄🐄🐄 Semi Bétaillère 3 ponts', dbType: 'TRACTEUR_ROUTIER', description: '3 étages de chargement' },
    { value: 'SEMI_BETAILLERE_4_PONTS', label: '🐄🐄🐄🐄 Semi Bétaillère 4 ponts', dbType: 'TRACTEUR_ROUTIER', description: '4 étages de chargement' },
    { value: 'SEMI_BETAILLERE_COL_CYGN', label: '🦢 Semi Bétaillère col de cygne', dbType: 'TRACTEUR_ROUTIER', description: 'Optimisé hauteur' },
  ],
  
  // Cas par défaut (même que MARCHANDISES_GENERALES)
  ADR_COLIS: [
    { value: 'PL_TAUTLINER_ADR', label: '⚠️🚛 Porteur Tautliner ADR', dbType: 'POIDS_LOURD', description: 'Matières dangereuses en colis' },
    { value: 'PL_FOURGON_ADR', label: '⚠️📦 Porteur Fourgon ADR', dbType: 'POIDS_LOURD', description: 'Colis ADR' },
    { value: 'SEMI_TAUTLINER_ADR', label: '⚠️🚛 Semi Tautliner ADR', dbType: 'TRACTEUR_ROUTIER', description: 'Colis ADR' },
    { value: 'SEMI_FOURGON_ADR', label: '⚠️📦 Semi Fourgon ADR', dbType: 'TRACTEUR_ROUTIER', description: 'Colis ADR' },
  ],
  
  BENNE_TRAVAUX_PUBLICS: [
    // Porteurs TP
    { value: 'PL_BENNE_TP', label: '🏗️ Porteur Benne TP', dbType: 'POIDS_LOURD', description: 'Matériaux construction' },
    { value: 'PL_AMPLIROLL', label: '🔄 Porteur Ampliroll', dbType: 'POIDS_LOURD', description: 'Avec bras hydraulique' },
    { value: 'PL_BENNE_GRUE', label: '🏗️🦾 Porteur Benne avec grue', dbType: 'POIDS_LOURD', description: 'Benne + grue de chargement' },
    // Semi-remorques TP
    { value: 'SEMI_BENNE_TP', label: '🏗️ Semi Benne TP', dbType: 'TRACTEUR_ROUTIER', description: 'Benne chantier' },
    { value: 'SEMI_PORTE_ENGINS', label: '🚜 Semi Porte-engins', dbType: 'TRACTEUR_ROUTIER', description: 'Transport engins TP' },
    // Remorques TP
    { value: 'REMORQUE_BENNE_TP', label: '🏗️ Remorque Benne TP', dbType: 'REMORQUE', description: 'Benne chantier, conditions difficiles' },
    { value: 'REMORQUE_AMPLIROLL', label: '🔄 Remorque Ampliroll', dbType: 'REMORQUE', description: 'Bras hydraulique, container' },
  ],
};

// Type pour les options de véhicules
export interface VehicleTypeOption {
  value: string;
  label: string;
  dbType: 'VOITURE' | 'FOURGON' | 'POIDS_LOURD' | 'POIDS_LOURD_FRIGO' | 'TRACTEUR_ROUTIER' | 'REMORQUE' | 'REMORQUE_FRIGO';
  description?: string;
}

/**
 * Récupère la liste des types de véhicules pour une activité donnée
 * Combine toujours les types de base + les types spécifiques à l'activité
 */
export function getVehicleTypesForActivity(activity: TransportActivity | null | undefined): VehicleTypeOption[] {
  // Types de base toujours présents
  const baseTypes: VehicleTypeOption[] = [
    { value: 'VOITURE', label: '🚗 Voiture', dbType: 'VOITURE' },
    { value: 'FOURGON', label: '🚐 Fourgon', dbType: 'FOURGON' },
    { value: 'TRACTEUR_ROUTIER', label: '🚜 Tracteur Routier', dbType: 'TRACTEUR_ROUTIER' },
  ];
  
  // Si pas d'activité spécifiée, retourner les types de base + marchandises générales
  if (!activity) {
    return [...baseTypes, ...ACTIVITY_VEHICLE_TYPES.MARCHANDISES_GENERALES];
  }
  
  // Récupérer les types spécifiques à l'activité
  const specificTypes = ACTIVITY_VEHICLE_TYPES[activity] || ACTIVITY_VEHICLE_TYPES.MARCHANDISES_GENERALES;
  
  // Combiner base + spécifiques (éviter les doublons)
  const baseValues = new Set(baseTypes.map(t => t.value));
  const filteredSpecific = specificTypes.filter(t => !baseValues.has(t.value));
  
  return [...baseTypes, ...filteredSpecific];
}

/**
 * Récupère tous les types de véhicules (pour admin ou multi-activités)
 */
export function getAllVehicleTypes(): VehicleTypeOption[] {
  const allTypes = new Map<string, VehicleTypeOption>();
  
  // Ajouter tous les types de toutes les activités
  Object.values(ACTIVITY_VEHICLE_TYPES).forEach(types => {
    types.forEach(type => {
      if (!allTypes.has(type.value)) {
        allTypes.set(type.value, type);
      }
    });
  });
  
  // Ajouter les types de base
  getVehicleTypesForActivity(null).forEach(type => {
    if (!allTypes.has(type.value)) {
      allTypes.set(type.value, type);
    }
  });
  
  return Array.from(allTypes.values());
}

/**
 * Récupère le type DB (pour la base de données) à partir du type détaillé
 */
export function getDbTypeFromDetailedType(detailedType: string): VehicleTypeOption['dbType'] {
  // Chercher dans toutes les activités
  for (const types of Object.values(ACTIVITY_VEHICLE_TYPES)) {
    const found = types.find(t => t.value === detailedType);
    if (found) return found.dbType;
  }
  
  // Types de base
  const baseFound = BASE_VEHICLE_TYPES.find(t => t.value === detailedType);
  if (baseFound) return baseFound.dbType;
  
  // Fallback sur le type lui-même si c'est déjà un type DB valide
  const validDbTypes = ['VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO', 'TRACTEUR_ROUTIER', 'REMORQUE', 'REMORQUE_FRIGO'];
  if (validDbTypes.includes(detailedType)) {
    return detailedType as VehicleTypeOption['dbType'];
  }
  
  // Fallback par défaut
  return 'POIDS_LOURD';
}

/**
 * Détermine si un type de véhicule nécessite un champ de conformité spécifique
 * basé sur l'activité de l'entreprise
 */
export function requiresFieldForActivity(
  field: 'ADR_CERT' | 'ADR_EQUIPEMENT' | 'ETANCHEITE' | 'HYDRAULIQUE' | 'VGP' | 'ATP' | 'DDPP',
  activity: TransportActivity | null | undefined
): boolean {
  if (!activity) return false;
  
  const fieldRequirements: Record<string, TransportActivity[]> = {
    'ADR_CERT': ['ADR_COLIS', 'ADR_CITERNE'],
    'ADR_EQUIPEMENT': ['ADR_COLIS', 'ADR_CITERNE'],
    'ETANCHEITE': ['ADR_CITERNE'],
    'HYDRAULIQUE': ['ADR_CITERNE'],
    'VGP': ['BENNE_TRAVAUX_PUBLICS'],
    'ATP': ['FRIGORIFIQUE'],
    'DDPP': ['ANIMAUX_VIVANTS'],
  };
  
  const activities = fieldRequirements[field] || [];
  return activities.includes(activity);
}

/**
 * Récupère la description d'un type de véhicule
 */
export function getVehicleTypeDescription(detailedType: string): string | undefined {
  for (const types of Object.values(ACTIVITY_VEHICLE_TYPES)) {
    const found = types.find(t => t.value === detailedType);
    if (found) return found.description;
  }
  return undefined;
}
