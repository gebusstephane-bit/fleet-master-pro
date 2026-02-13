/**
 * Client Stripe initialisé de manière conditionnelle
 * Permet le build sans variables d'environnement Stripe
 */

import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

// Si pas de clé Stripe, on crée un mock pour permettre le build
export const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' })
  : ({
      customers: {
        create: async () => {
          throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
        },
        retrieve: async () => {
          throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
        },
      },
      checkout: {
        sessions: {
          create: async () => {
            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
          },
          retrieve: async () => {
            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
          },
        },
      },
      subscriptions: {
        retrieve: async () => {
          throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
        },
        update: async () => {
          throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
        },
      },
      webhooks: {
        constructEvent: () => {
          throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env variable.');
        },
      },
    } as unknown as Stripe);

// Helper pour vérifier si Stripe est configuré
export const isStripeConfigured = (): boolean => {
  return !!secretKey && secretKey.startsWith('sk_');
};

// Helper pour vérifier la clé webhook
export const isWebhookConfigured = (): boolean => {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
};
