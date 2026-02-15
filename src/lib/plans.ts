// src/lib/plans.ts - VERSION HARDCODÉE (fonctionne immédiatement)

export const PLANS = {
  essential: {
    id: 'essential',
    name: 'Essential',
    priceMonthly: 29,
    priceYearly: 290,
    priceId: 'price_1T16Qc2S7pahLrnmcxhOm73Z', // ← ID Stripe Essential
    priceIdYearly: 'price_1T16Qc2S7pahLrnmcxhOm73Z', // Même ID si pas d'annuel
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
    priceId: 'price_1T16T52S7pahLrnmtBhKKRYj', // ← ID Stripe Pro
    priceIdYearly: 'price_1T16T52S7pahLrnmtBhKKRYj',
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
    priceId: 'price_1T16UD2S7pahLrnmZOWa0c1g', // ← ID Stripe Unlimited
    priceIdYearly: 'price_1T16UD2S7pahLrnmZOWa0c1g',
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
