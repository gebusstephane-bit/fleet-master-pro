/**
 * Tests E2E — Sécurité du webhook Stripe
 *
 * Couvre :
 * - Webhook checkout.session.completed avec signature valide → 200
 * - Webhook sans header stripe-signature → 400
 * - Webhook avec signature invalide → 400
 *
 * Stratégie :
 * - Tests purement API (pas de browser) via APIRequestContext
 * - Génération de signatures HMAC-SHA256 identique à Stripe
 * - Tests skippés si Stripe n'est pas configuré (CI sans secrets)
 *
 * Variables d'env nécessaires pour les tests positifs :
 * - STRIPE_SECRET_KEY    : clé Stripe test (sk_test_...)
 * - STRIPE_WEBHOOK_SECRET : secret webhook test (whsec_...)
 */

import { test, expect, APIRequestContext, request } from '@playwright/test';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WEBHOOK_URL = '/api/stripe/webhook';

const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

const isStripeConfigured = Boolean(stripeKey) && Boolean(webhookSecret);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Construit le header `stripe-signature` à partir du payload et du secret,
 * en reproduisant exactement le schéma de signature Stripe :
 *   t=<timestamp>,v1=HMAC_SHA256("<timestamp>.<payload>", secret)
 */
function buildStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Construit un payload Stripe minimal pour checkout.session.completed.
 * Les champs idempotency-critiques sont générés avec un ID aléatoire.
 */
function buildCheckoutPayload(): string {
  const eventId = `evt_test_${crypto.randomBytes(8).toString('hex')}`;
  const customerId = `cus_test_${crypto.randomBytes(8).toString('hex')}`;

  const event = {
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: `cs_test_${crypto.randomBytes(8).toString('hex')}`,
        object: 'checkout.session',
        customer: customerId,
        subscription: `sub_test_${crypto.randomBytes(8).toString('hex')}`,
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          // Pas de registration_pending : sera traité comme upgrade
        },
      },
    },
    api_version: '2023-10-16',
  };

  return JSON.stringify(event);
}

// ---------------------------------------------------------------------------
// Fixture : contexte API partagé pour toute la suite
// ---------------------------------------------------------------------------

let apiContext: APIRequestContext;

test.beforeAll(async () => {
  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000';
  apiContext = await request.newContext({ baseURL });
});

test.afterAll(async () => {
  await apiContext.dispose();
});

// ---------------------------------------------------------------------------
// Tests de sécurité (rejet sans signature valide)
// ---------------------------------------------------------------------------

test.describe('Webhook Stripe — rejet des requêtes non signées', () => {
  /**
   * Sans header stripe-signature, la route doit refuser avec 400.
   * Si Stripe n'est pas configuré elle renvoie 503 — dans les deux cas
   * ce n'est pas 200 : le webhook ne doit PAS être traité.
   */
  test('sans header stripe-signature → non-200 (400 si configuré)', async () => {
    const payload = buildCheckoutPayload();

    const response = await apiContext.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        // Pas de stripe-signature
      },
    });

    // Sécurité fondamentale : jamais de 200 sans signature
    expect(response.status()).not.toBe(200);

    if (isStripeConfigured) {
      // Avec Stripe configuré, on attend précisément 400
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/signature|missing/i);
    } else {
      // Sans Stripe configuré, on attend 503 (endpoint désactivé)
      expect([400, 503]).toContain(response.status());
    }
  });

  test('avec signature invalide → non-200 (400 si configuré)', async () => {
    const payload = buildCheckoutPayload();

    const response = await apiContext.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=9999999999,v1=invalidsignaturehex0000000000000',
      },
    });

    // Sécurité fondamentale : jamais de 200 avec une fausse signature
    expect(response.status()).not.toBe(200);

    if (isStripeConfigured) {
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/signature|invalid/i);
    } else {
      expect([400, 503]).toContain(response.status());
    }
  });
});

// ---------------------------------------------------------------------------
// Test positif (payload valide + signature correcte)
// Skippé si les secrets Stripe ne sont pas configurés
// ---------------------------------------------------------------------------

test.describe('Webhook Stripe — traitement d\'un event valide', () => {
  test.skip(
    !isStripeConfigured,
    'Skippé : STRIPE_SECRET_KEY et/ou STRIPE_WEBHOOK_SECRET non définis'
  );

  test('checkout.session.completed avec signature valide → 200', async () => {
    const payload = buildCheckoutPayload();
    const signature = buildStripeSignature(payload, webhookSecret);

    const response = await apiContext.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });

    // La route retourne 200 avec received: true (ou idempotent: true si déjà traité)
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.received).toBe(true);
  });

  test('même event renvoyé deux fois → idempotence garantie (200 les deux fois)', async () => {
    const payload = buildCheckoutPayload();

    // Premier envoi
    const sig1 = buildStripeSignature(payload, webhookSecret);
    const res1 = await apiContext.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sig1,
      },
    });
    expect(res1.status()).toBe(200);

    // Deuxième envoi du même event (Stripe retries)
    // On doit reconstruire la signature avec un nouveau timestamp
    // mais le même payload (même event.id → idempotent)
    const sig2 = buildStripeSignature(payload, webhookSecret);
    const res2 = await apiContext.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sig2,
      },
    });

    // L'idempotence garantit également un 200 (pas d'erreur sur doublon)
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    // Le deuxième traitement renvoie idempotent: true
    expect(body2.received).toBe(true);
    expect(body2.idempotent).toBe(true);
  });
});
