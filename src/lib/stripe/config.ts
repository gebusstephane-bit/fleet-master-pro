/**
 * Configuration Stripe - FleetMaster Pro
 * 
 * 3 plans payants uniquement (ZERO gratuit) :
 * - Essential : 29€/mois - 3 véhicules
 * - Pro : 49€/mois - 15 véhicules
 * - Unlimited : 129€/mois - Véhicules illimités
 * 
 * Variables d'environnement requises :
 * - STRIPE_PRICE_ID_ESSENTIAL
 * - STRIPE_PRICE_ID_PRO
 * - STRIPE_PRICE_ID_UNLIMITED
 */

// 3 Plans payants (UPPERCASE)
export const STRIPE_PLANS = {
  ESSENTIAL: {
    id: 'essential',
    name: 'Essential',
    priceMonthly: 29,
    priceYearly: 290, // 2 mois offerts
    vehicleLimit: 3,
    userLimit: 2,
    stripePriceId: process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    features: [
      '3 véhicules maximum',
      '2 utilisateurs',
      'Support email (48h)',
      'Tableau de bord',
      'Maintenance basique',
      'QR Codes inspections',
    ],
    disabledFeatures: [
      'API',
      'Rapports avancés',
      'Optimisation tournées',
      'IA Prédictive',
    ],
    cta: 'Choisir Essential',
    popular: false,
    description: 'Idéal pour démarrer',
    maxVehicles: 3,
    maxDrivers: 2,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 49,
    priceYearly: 490, // 2 mois offerts
    vehicleLimit: 15,
    userLimit: 5,
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO || '',
    features: [
      '15 véhicules maximum',
      '5 utilisateurs',
      'Support prioritaire (24h)',
      'API d\'accès',
      'Rapports avancés',
      'Optimisation tournées',
      'IA Prédictive maintenance',
      'Notifications push/SMS',
    ],
    disabledFeatures: [],
    cta: 'Choisir Pro',
    popular: true, // Mis en avant
    description: 'Pour les PME',
    maxVehicles: 15,
    maxDrivers: 5,
  },
  UNLIMITED: {
    id: 'unlimited',
    name: 'Unlimited',
    priceMonthly: 129,
    priceYearly: 1290, // 2 mois offerts
    vehicleLimit: 999,
    userLimit: 999,
    stripePriceId: process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    features: [
      'Véhicules illimités',
      'Utilisateurs illimités',
      'Support dédié 24/7',
      'Personnalisation complète',
      'API illimitée',
      'Account manager',
      'Formation incluse',
      'SLA 99.9%',
    ],
    disabledFeatures: [],
    cta: 'Choisir Unlimited',
    popular: false,
    description: 'Grandes flottes',
    maxVehicles: 999,
    maxDrivers: 999,
  },
} as const;

// Mapping pour compatibilité (anciens plans → nouveaux)
export const SUBSCRIPTION_PLANS: Record<string, typeof STRIPE_PLANS['ESSENTIAL']> = {
  essential: STRIPE_PLANS.ESSENTIAL,
  starter: STRIPE_PLANS.ESSENTIAL,    // Migration
  basic: STRIPE_PLANS.ESSENTIAL,      // Migration
  pro: STRIPE_PLANS.PRO,
  business: STRIPE_PLANS.PRO,         // Migration
  unlimited: STRIPE_PLANS.UNLIMITED,
  enterprise: STRIPE_PLANS.UNLIMITED, // Migration
};

// Plans actifs pour itération (dans l'ordre d'affichage)
export const ACTIVE_PLANS = ['ESSENTIAL', 'PRO', 'UNLIMITED'] as const;

export type PlanType = keyof typeof STRIPE_PLANS;

// Features par plan
export const PLAN_FEATURES = {
  ESSENTIAL: [
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'drivers:read', 'drivers:create',
    'inspections:create', 'inspections:read',
    'maintenance:read', 'maintenance:create',
    'profile:read', 'profile:update',
  ],
  PRO: [
    'vehicles:read', 'vehicles:create', 'vehicles:update', 'vehicles:delete',
    'drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete',
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:workflow',
    'fuel:read', 'fuel:create',
    'inspections:create', 'inspections:read',
    'routes:read', 'routes:create', 'routes:update', 'routes:optimize',
    'ai:predictions',
    'analytics:read',
    'alerts:email', 'alerts:push', 'alerts:sms',
    'agenda:read', 'agenda:create',
    'api:access',
  ],
  UNLIMITED: [
    '*', // Tout est autorisé
  ],
};

// Vérifier si une feature est disponible
export function hasFeature(plan: PlanType | string, feature: string): boolean {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  if (normalizedPlan === 'UNLIMITED') return true;
  return PLAN_FEATURES[normalizedPlan]?.includes(feature) || false;
}

// Obtenir les limites d'un plan
export function getPlanLimits(plan: PlanType | string) {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  return {
    vehicles: STRIPE_PLANS[normalizedPlan]?.vehicleLimit ?? 3,
    users: STRIPE_PLANS[normalizedPlan]?.userLimit ?? 2,
  };
}

// Vérifier si on peut upgrader
export function canUpgrade(from: PlanType | string, to: PlanType | string): boolean {
  const hierarchy = ['ESSENTIAL', 'PRO', 'UNLIMITED'];
  const normalizedFrom = from.toUpperCase();
  const normalizedTo = to.toUpperCase();
  return hierarchy.indexOf(normalizedTo) > hierarchy.indexOf(normalizedFrom);
}

// Obtenir un plan par son ID
export function getPlanById(planId: string): typeof STRIPE_PLANS['ESSENTIAL'] | null {
  const upperId = planId.toUpperCase() as PlanType;
  if (STRIPE_PLANS[upperId]) return STRIPE_PLANS[upperId];
  return SUBSCRIPTION_PLANS[planId.toLowerCase()] || null;
}

// Format prix
export function formatPrice(price: number | null): string {
  if (price === null) return 'Sur devis';
  return `${price}€`;
}

// Prix mensuel
export function getMonthlyPrice(plan: PlanType | string): string {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  const price = STRIPE_PLANS[normalizedPlan]?.priceMonthly;
  return formatPrice(price);
}
