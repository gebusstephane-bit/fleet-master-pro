// src/lib/plans.ts - VERSION AVEC VARIABLES D'ENVIRONNEMENT

// Récupération dynamique des IDs Stripe depuis les variables d'environnement
// Les variables doivent être définies dans .env.local

const getEnvPriceId = (plan: 'essential' | 'pro' | 'unlimited', type: 'monthly' | 'yearly'): string => {
  const envVarName = `STRIPE_PRICE_ID_${plan.toUpperCase()}${type === 'yearly' ? '_YEARLY' : ''}`;
  const value = process.env[envVarName];
  
  if (!value) {
    console.error(`❌ ERREUR: Variable d'environnement manquante: ${envVarName}`);
    console.error('Vérifiez votre fichier .env.local');
    return '';
  }
  
  return value;
};

export const PLANS = {
  essential: {
    id: 'essential',
    name: 'Essential',
    priceMonthly: 29,
    priceYearly: 290,
    priceId: process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_ESSENTIAL_YEARLY || process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    maxVehicles: 3,
    maxDrivers: 2,
    features: [
      '3 véhicules maximum',
      '2 utilisateurs',
      'Support email (48h)',
      'Tableau de bord',
      'Maintenance basique',
      'QR Codes inspections',
    ],
    description: 'Idéal pour démarrer',
    popular: false,
    cta: 'Commencer avec Essential',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 49,
    priceYearly: 490,
    priceId: process.env.STRIPE_PRICE_ID_PRO || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY || process.env.STRIPE_PRICE_ID_PRO || '',
    maxVehicles: 15,
    maxDrivers: 5,
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
    description: 'Pour les PME',
    popular: true,
    cta: 'Choisir le plan Pro',
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    priceMonthly: 129,
    priceYearly: 1290,
    priceId: process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    priceIdYearly: process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY || process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    maxVehicles: 999,
    maxDrivers: 999,
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
    description: 'Grandes flottes',
    popular: false,
    cta: 'Contacter pour Unlimited',
  },
} as const;

// Vérification au chargement (mode serveur uniquement)
if (typeof window === 'undefined') {
  const requiredEnvVars = [
    'STRIPE_PRICE_ID_ESSENTIAL',
    'STRIPE_PRICE_ID_PRO',
    'STRIPE_PRICE_ID_UNLIMITED',
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ ERREUR: Variables d\'environnement Stripe manquantes:', missing);
    console.error('Vérifiez votre fichier .env.local');
  } else {
    console.log('✅ Variables d\'environnement Stripe chargées correctement');
  }
}

export type PlanId = keyof typeof PLANS;

// Plans actifs (pour itération)
export const ACTIVE_PLANS = ['essential', 'pro', 'unlimited'] as const;

// Early adopters = comptes gratuits pour lancement
export const EARLY_ADOPTER_EMAILS: string[] = [
  // À remplir manuellement si besoin
];

// Vérifier si un email est early adopter
export function isEarlyAdopter(email: string): boolean {
  return EARLY_ADOPTER_EMAILS.includes(email.toLowerCase());
}

// Récupérer un plan par son ID
export function getPlan(planId: string) {
  return PLANS[planId as PlanId] || null;
}

// Vérifier si un plan existe
export function isValidPlan(planId: string): boolean {
  return planId in PLANS;
}

// Mapper les anciens plans sur les nouveaux (pour compatibilité)
export function mapOldPlanToNew(oldPlan: string): PlanId {
  const mapping: Record<string, PlanId> = {
    'starter': 'essential',
    'basic': 'essential',
    'business': 'pro',
    'enterprise': 'unlimited',
  };
  return mapping[oldPlan.toLowerCase()] || 'essential';
}

// Prix formaté
export function formatPrice(price: number): string {
  return `${price}€`;
}

// Économie annuelle
export function getYearlySavings(planId: PlanId): number {
  const plan = PLANS[planId];
  return (plan.priceMonthly * 12) - plan.priceYearly;
}

// Helper pour obtenir le priceId avec vérification
export function getStripePriceId(planId: PlanId, yearly: boolean = false): string {
  const plan = PLANS[planId];
  const priceId = yearly ? plan.priceIdYearly : plan.priceId;
  
  if (!priceId) {
    throw new Error(`Price ID manquant pour le plan ${planId} (${yearly ? 'annuel' : 'mensuel'})`);
  }
  
  return priceId;
}
