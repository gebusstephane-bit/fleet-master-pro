/**
 * Configuration Stripe - FleetMaster Pro
 * Plans: Starter (0€) → Basic (29€) → Pro (49€) → Enterprise (sur devis)
 * 
 * Compatibilité: Les anciens plans lowercase (starter, pro, business) sont mappés
 * sur les nouveaux plans uppercase.
 */

// Nouveaux plans (UPPERCASE)
export const STRIPE_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    priceYearly: 0,
    vehicleLimit: 1,
    userLimit: 1,
    stripePriceId: null, // Gratuit, pas de Stripe
    features: [
      '1 véhicule',
      '1 utilisateur',
      'QR Inspections',
      'Gestion véhicule basique',
      'Support email 72h',
    ],
    disabledFeatures: [
      'Maintenance workflow',
      'Optimisation tournées',
      'IA Prédictive',
      'Agenda partagé',
      'Analytics',
    ],
    cta: 'Commencer gratuit',
    popular: false,
    // Compatibilité ancien format
    description: 'Parfait pour les auto-entrepreneurs débutant avec 1 véhicule',
    maxVehicles: 1,
    maxDrivers: 1,
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 29,
    priceYearly: 290, // 2 mois offerts
    vehicleLimit: 5,
    userLimit: 2,
    stripePriceId: process.env.NODE_ENV === 'production' 
      ? 'price_1T04DDCXqfkQyBLwoMHj3N5Y'  // ← Remplace par ton vrai ID production
      : '', // ← Remplace par ton vrai ID test
    features: [
      '5 véhicules',
      '2 utilisateurs',
      'QR Inspections',
      'Maintenance workflow complet',
      'Agenda maintenance',
      'Alertes kilométrage/date',
      'Carburant & coûts',
      'Support email 24h',
    ],
    disabledFeatures: [
      'Optimisation tournées',
      'IA Prédictive',
      'Analytics avancés',
    ],
    cta: 'Essayer 14 jours gratuit',
    popular: false,
    // Compatibilité ancien format
    description: 'Idéal pour les petites flottes jusqu\'à 5 véhicules',
    maxVehicles: 5,
    maxDrivers: 2,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 49,
    priceYearly: 490, // 2 mois offerts
    vehicleLimit: 15,
    userLimit: 5,
    stripePriceId: process.env.NODE_ENV === 'production'
      ? 'price_live_XXXXXXXXXXXXXX'  // ← Remplace par ton vrai ID production
      : 'price_1T04DxCXqfkQyBLwk4r84kBB', // ← Remplace par ton vrai ID test
    features: [
      '15 véhicules',
      '5 utilisateurs',
      'Tout du plan Basic',
      'Optimisation algorithmique tournées',
      'IA Prédictive maintenance',
      'Documents réglementaires',
      'Notifications push + SMS',
      'Analytics & rapports avancés',
      'API & Webhooks',
      'Support prioritaire 4h',
    ],
    disabledFeatures: [],
    cta: 'Essayer 14 jours gratuit',
    popular: true,
    // Compatibilité ancien format
    description: 'Pour les PME avec besoins avancés jusqu\'à 15 véhicules',
    maxVehicles: 15,
    maxDrivers: 5,
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    priceYearly: null,
    vehicleLimit: Infinity,
    userLimit: Infinity,
    stripePriceId: null, // Sur devis, pas de checkout auto
    features: [
      'Véhicules illimités',
      'Utilisateurs illimités',
      'Tout du plan Pro',
      'SSO (Google, Microsoft)',
      'Account manager dédié',
      'Formation équipe sur site',
      'SLA 99.9% garanti',
      'Hébergement dédié possible',
      'Support téléphonique 24/7',
    ],
    disabledFeatures: [],
    cta: 'Contacter les ventes',
    popular: false,
    // Compatibilité ancien format  
    description: 'Solution sur mesure pour grandes flottes et exigences spécifiques',
    maxVehicles: 999,
    maxDrivers: 999,
  },
} as const;

// Anciens plans (lowercase) pour compatibilité - mappés sur les nouveaux
export const SUBSCRIPTION_PLANS: Record<string, typeof STRIPE_PLANS['STARTER']> = {
  starter: STRIPE_PLANS.STARTER,
  pro: STRIPE_PLANS.PRO,
  business: STRIPE_PLANS.PRO, // business → PRO pour migration
  basic: STRIPE_PLANS.BASIC,
  enterprise: STRIPE_PLANS.ENTERPRISE,
};

export type PlanType = keyof typeof STRIPE_PLANS;

// Features par plan pour vérification côté serveur
export const PLAN_FEATURES = {
  STARTER: [
    'vehicles:read', 'vehicles:create', 'vehicles:update',
    'inspections:create', 'inspections:read',
    'profile:read', 'profile:update',
  ],
  BASIC: [
    'vehicles:read', 'vehicles:create', 'vehicles:update', 'vehicles:delete',
    'drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete',
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:workflow',
    'fuel:read', 'fuel:create',
    'inspections:create', 'inspections:read',
    'alerts:email',
    'agenda:read', 'agenda:create',
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
    'documents:read', 'documents:create',
  ],
  ENTERPRISE: [
    '*', // Tout est autorisé
  ],
};

// Vérifier si une feature est disponible pour un plan
export function hasFeature(plan: PlanType | string, feature: string): boolean {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  if (normalizedPlan === 'ENTERPRISE') return true;
  return PLAN_FEATURES[normalizedPlan]?.includes(feature) || false;
}

// Obtenir les limites d'un plan
export function getPlanLimits(plan: PlanType | string) {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  return {
    vehicles: STRIPE_PLANS[normalizedPlan]?.vehicleLimit ?? 1,
    users: STRIPE_PLANS[normalizedPlan]?.userLimit ?? 1,
  };
}

// Vérifier si on peut upgrader
export function canUpgrade(from: PlanType | string, to: PlanType | string): boolean {
  const hierarchy = ['STARTER', 'BASIC', 'PRO', 'ENTERPRISE'];
  const normalizedFrom = from.toUpperCase();
  const normalizedTo = to.toUpperCase();
  return hierarchy.indexOf(normalizedTo) > hierarchy.indexOf(normalizedFrom);
}

// URL de checkout Stripe
export function getCheckoutUrl(plan: PlanType | string, companyId: string): string {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  if (normalizedPlan === 'STARTER' || normalizedPlan === 'ENTERPRISE') {
    return ''; // Pas de checkout pour Starter (gratuit) ou Enterprise (sur devis)
  }
  
  const priceId = STRIPE_PLANS[normalizedPlan]?.stripePriceId;
  if (!priceId) return '';
  
  return `/api/stripe/checkout?priceId=${priceId}&companyId=${companyId}`;
}

// Prix affiché formaté
export function formatPrice(cents: number | null): string {
  if (cents === null) return 'Sur devis';
  if (cents === 0) return 'Gratuit';
  return `${(cents / 100).toFixed(0)}€`;
}

// Prix mensuel affiché
export function getMonthlyPrice(plan: PlanType | string): string {
  const normalizedPlan = plan.toUpperCase() as PlanType;
  const price = STRIPE_PLANS[normalizedPlan]?.priceMonthly;
  return formatPrice(price ? price * 100 : null);
}

// Obtenir un plan par son ID (compatible lowercase/uppercase)
export function getPlanById(planId: string): typeof STRIPE_PLANS['STARTER'] | null {
  // Essayer d'abord en uppercase
  const upperId = planId.toUpperCase() as PlanType;
  if (STRIPE_PLANS[upperId]) return STRIPE_PLANS[upperId];
  
  // Sinon essayer dans SUBSCRIPTION_PLANS (lowercase)
  return SUBSCRIPTION_PLANS[planId.toLowerCase()] || null;
}
