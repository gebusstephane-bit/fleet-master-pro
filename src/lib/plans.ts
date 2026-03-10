/**
 * Configuration centralisée des plans d'abonnement FleetMaster Pro
 * Source de vérité unique pour les limites, prix et features
 */

// ============================================
// TYPES
// ============================================

export type PlanType = 'ESSENTIAL' | 'PRO' | 'UNLIMITED';
export type PlanFeature = 
  | 'api_access' 
  | 'ai_assistant' 
  | 'webhooks' 
  | 'advanced_reports' 
  | 'compliance_basic'
  | 'compliance_advanced'
  | 'priority_support'
  | 'dedicated_manager';

export interface PlanConfig {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  priceId: string;
  priceIdYearly: string;
  maxVehicles: number;
  maxUsers: number;
  maxDrivers: number; // Alias pour compatibilité
  features: string[]; // Features pour l'affichage UI
  featureFlags: PlanFeature[]; // Features techniques
  description: string;
  popular: boolean;
  cta: string;
}

// ============================================
// CONSTANTES DES PLANS
// ============================================

/**
 * Limites par plan selon la nouvelle grille tarifaire :
 * - ESSENTIAL: 29€/mois - 5 véhicules / 10 users
 * - PRO: 49€/mois - 20 véhicules / 50 users  
 * - UNLIMITED: 129€/mois - illimité
 */
export const PLAN_LIMITS: Record<PlanType, { vehicleLimit: number; userLimit: number }> = {
  ESSENTIAL: { vehicleLimit: 5, userLimit: 10 },
  PRO: { vehicleLimit: 20, userLimit: 50 },
  UNLIMITED: { vehicleLimit: 999999, userLimit: 999999 },
};

/**
 * Prix mensuels par plan
 */
export const PLAN_PRICES: Record<PlanType, { monthly: number; yearly: number }> = {
  ESSENTIAL: { monthly: 29, yearly: 290 }, // ~17% de réduction
  PRO: { monthly: 49, yearly: 490 },
  UNLIMITED: { monthly: 129, yearly: 1290 },
};

/**
 * Features techniques par plan
 * - api_access: Accès API publique
 * - ai_assistant: Assistant IA réglementaire
 * - webhooks: Webhooks personnalisés
 * - advanced_reports: Rapports avancés
 * - compliance_basic: Conformité de base
 * - compliance_advanced: Conformité avancée
 * - priority_support: Support prioritaire
 * - dedicated_manager: Account manager dédié
 */
export const PLAN_FEATURES: Record<PlanType, PlanFeature[]> = {
  ESSENTIAL: ['compliance_basic'],
  PRO: ['compliance_basic', 'webhooks', 'advanced_reports', 'priority_support'],
  UNLIMITED: [
    'compliance_basic', 
    'compliance_advanced', 
    'api_access', 
    'ai_assistant', 
    'webhooks', 
    'advanced_reports', 
    'priority_support', 
    'dedicated_manager'
  ],
};

/**
 * Mapping des Price IDs Stripe vers les plans
 * Les variables d'environnement doivent être définies dans .env.local
 */
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanType> = {
  // Variables d'environnement essentielles
  [process.env.STRIPE_PRICE_ID_ESSENTIAL || '']: 'ESSENTIAL',
  [process.env.STRIPE_PRICE_ID_ESSENTIAL_YEARLY || '']: 'ESSENTIAL',
  [process.env.STRIPE_PRICE_ID_PRO || '']: 'PRO',
  [process.env.STRIPE_PRICE_ID_PRO_YEARLY || '']: 'PRO',
  [process.env.STRIPE_PRICE_ID_UNLIMITED || '']: 'UNLIMITED',
  [process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY || '']: 'UNLIMITED',
};

// ============================================
// CONFIG COMPLÈTE DES PLANS (pour UI)
// ============================================

export const PLANS: Record<string, PlanConfig> = {
  essential: {
    id: 'essential',
    name: 'Essential',
    priceMonthly: PLAN_PRICES.ESSENTIAL.monthly,
    priceYearly: PLAN_PRICES.ESSENTIAL.yearly,
    priceId: process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_ESSENTIAL_YEARLY || process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    maxVehicles: PLAN_LIMITS.ESSENTIAL.vehicleLimit,
    maxUsers: PLAN_LIMITS.ESSENTIAL.userLimit,
    maxDrivers: PLAN_LIMITS.ESSENTIAL.userLimit, // Alias
    features: [
      `${PLAN_LIMITS.ESSENTIAL.vehicleLimit} véhicules maximum`,
      `${PLAN_LIMITS.ESSENTIAL.userLimit} utilisateurs`,
      'Support email (48h)',
      'Tableau de bord',
      'Maintenance basique',
      'QR Codes inspections',
      'Conformité de base',
    ],
    featureFlags: PLAN_FEATURES.ESSENTIAL,
    description: 'Idéal pour démarrer',
    popular: false,
    cta: 'Commencer avec Essential',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: PLAN_PRICES.PRO.monthly,
    priceYearly: PLAN_PRICES.PRO.yearly,
    priceId: process.env.STRIPE_PRICE_ID_PRO || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY || process.env.STRIPE_PRICE_ID_PRO || '',
    maxVehicles: PLAN_LIMITS.PRO.vehicleLimit,
    maxUsers: PLAN_LIMITS.PRO.userLimit,
    maxDrivers: PLAN_LIMITS.PRO.userLimit, // Alias
    features: [
      `${PLAN_LIMITS.PRO.vehicleLimit} véhicules maximum`,
      `${PLAN_LIMITS.PRO.userLimit} utilisateurs`,
      'Support prioritaire (24h)',
      'Webhooks personnalisés',
      'Rapports avancés',
      'Optimisation tournées',
      'IA Prédictive maintenance',
      'Notifications push/SMS',
    ],
    featureFlags: PLAN_FEATURES.PRO,
    description: 'Pour les PME',
    popular: true,
    cta: 'Choisir le plan Pro',
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    priceMonthly: PLAN_PRICES.UNLIMITED.monthly,
    priceYearly: PLAN_PRICES.UNLIMITED.yearly,
    priceId: process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY || process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    maxVehicles: PLAN_LIMITS.UNLIMITED.vehicleLimit,
    maxUsers: PLAN_LIMITS.UNLIMITED.userLimit,
    maxDrivers: PLAN_LIMITS.UNLIMITED.userLimit, // Alias
    features: [
      'Véhicules illimités',
      'Utilisateurs illimités',
      'API publique complète',
      'Assistant IA réglementaire',
      'Support dédié 24/7',
      'Personnalisation complète',
      'Account manager',
      'Formation incluse',
      'SLA 99.9%',
    ],
    featureFlags: PLAN_FEATURES.UNLIMITED,
    description: 'Grandes flottes',
    popular: false,
    cta: 'Contacter pour Unlimited',
  },
} as const;

// ============================================
// HELPERS
// ============================================

export type PlanId = keyof typeof PLANS;

// Plans actifs (pour itération)
export const ACTIVE_PLANS: PlanId[] = ['essential', 'pro', 'unlimited'];

/**
 * Vérifie si un plan possède une feature spécifique
 * @param plan - Le plan à vérifier (ESSENTIAL, PRO, UNLIMITED)
 * @param feature - La feature recherchée
 * @returns boolean
 */
export function planHasFeature(plan: PlanType | string, feature: PlanFeature): boolean {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  if (!PLAN_FEATURES[normalizedPlan]) return false;
  return PLAN_FEATURES[normalizedPlan].includes(feature);
}

/**
 * Vérifie si une limite est atteinte
 * @param plan - Le plan de l'utilisateur
 * @param limitType - Type de limite ('vehicle' | 'user')
 * @param currentCount - Nombre actuel
 * @returns { reached: boolean; limit: number; remaining: number }
 */
export function checkLimit(
  plan: PlanType | string, 
  limitType: 'vehicle' | 'user', 
  currentCount: number
): { reached: boolean; limit: number; remaining: number } {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  const limits = PLAN_LIMITS[normalizedPlan];
  
  if (!limits) {
    return { reached: true, limit: 0, remaining: 0 };
  }
  
  const limit = limitType === 'vehicle' ? limits.vehicleLimit : limits.userLimit;
  const remaining = Math.max(0, limit - currentCount);
  
  return {
    reached: currentCount >= limit,
    limit,
    remaining,
  };
}

/**
 * Vérifie si on peut ajouter un élément (véhicule ou utilisateur)
 * Alias pour checkLimit
 */
export function canAddItem(
  plan: PlanType | string,
  itemType: 'vehicle' | 'user',
  currentCount: number
): boolean {
  return !checkLimit(plan, itemType, currentCount).reached;
}

/**
 * Récupère le plan depuis un price ID Stripe
 * @param priceId - L'ID du prix Stripe
 * @returns PlanType | null
 */
export function getPlanFromPriceId(priceId: string): PlanType | null {
  return STRIPE_PRICE_TO_PLAN[priceId] || null;
}

/**
 * Récupère les limites d'un plan
 * @param plan - Le plan
 * @returns { vehicleLimit: number; userLimit: number }
 */
export function getPlanLimits(plan: PlanType | string): { vehicleLimit: number; userLimit: number } {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  return PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.ESSENTIAL;
}

// ============================================
// HELPERS UI
// ============================================

/**
 * Récupérer un plan par son ID
 */
export function getPlan(planId: string): PlanConfig | null {
  return PLANS[planId as PlanId] || null;
}

/**
 * Vérifier si un plan existe
 */
export function isValidPlan(planId: string): boolean {
  return planId in PLANS;
}

/**
 * Mapper les anciens plans sur les nouveaux (compatibilité)
 */
export function mapOldPlanToNew(oldPlan: string): PlanId {
  const mapping: Record<string, PlanId> = {
    'starter': 'essential',
    'basic': 'essential',
    'business': 'pro',
    'enterprise': 'unlimited',
  };
  return mapping[oldPlan.toLowerCase()] || 'essential';
}

/**
 * Formater un prix
 */
export function formatPrice(price: number): string {
  return `${price}€`;
}

/**
 * Calculer l'économie annuelle
 */
export function getYearlySavings(planId: PlanId): number {
  const plan = PLANS[planId];
  return (plan.priceMonthly * 12) - plan.priceYearly;
}

/**
 * Récupérer le priceId Stripe avec vérification
 */
export function getStripePriceId(planId: PlanId, yearly: boolean = false): string {
  const plan = PLANS[planId];
  const priceId = yearly ? plan.priceIdYearly : plan.priceId;
  
  if (!priceId) {
    throw new Error(`Price ID manquant pour le plan ${planId} (${yearly ? 'annuel' : 'mensuel'})`);
  }
  
  return priceId;
}

// ============================================
// VÉRIFICATION CONFIGURATION (mode serveur)
// ============================================

if (typeof window === 'undefined') {
  const requiredEnvVars = [
    'STRIPE_PRICE_ID_ESSENTIAL',
    'STRIPE_PRICE_ID_PRO',
    'STRIPE_PRICE_ID_UNLIMITED',
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ ERREUR: Variables d\'environnement Stripe manquantes:', missing);
  }
}
