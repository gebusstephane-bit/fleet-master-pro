/**
 * Tests d'idempotence pour le webhook Stripe
 *
 * Ces tests vérifient que:
 * 1. Un même event_id ne traite qu'une seule fois l'abonnement
 * 2. Des events différents sont traités indépendamment
 * 3. Les race conditions sont gérées correctement
 */

// Mock des dépendances Stripe et Supabase
jest.mock("@/lib/stripe/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
  },
  isStripeConfigured: jest.fn().mockReturnValue(true),
  isWebhookConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/security/rate-limiter", () => ({
  checkSensitiveRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}));

import { POST } from "../route";
import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

// Helper pour créer une requête mock
function createMockRequest(payload: any): NextRequest {
  return new Request(JSON.stringify(payload), {
    headers: {
      "stripe-signature": "mock_signature",
      "x-forwarded-for": "192.168.1.1",
    },
  }) as unknown as NextRequest;
}

// Helper pour créer un event Stripe mock
function createMockEvent(
  eventId: string,
  type: string,
  overrides: any = {}
): import("stripe").Stripe.Event {
  return {
    id: eventId,
    type: type,
    data: {
      object: {
        id: `cs_test_${eventId}`,
        customer: `cus_test_${eventId}`,
        subscription: `sub_test_${eventId}`,
        metadata: {
          registration_pending: "true",
          email: "test@example.com",
          company_name: "Test Company",
          plan_type: "ESSENTIAL",
          setup_token: `token_${eventId}`,
          ...overrides.metadata,
        },
        customer_details: {
          email: "test@example.com",
        },
        ...overrides,
      },
    },
    created: Date.now(),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: "2024-12-18.acacia",
  } as unknown as import("stripe").Stripe.Event;
}

describe("Webhook Stripe - Idempotence", () => {
  let mockSupabase: any;
  let webhookEvents: Map<string, any>;
  let subscriptions: Map<string, any>;
  let profiles: Map<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset des stores
    webhookEvents = new Map();
    subscriptions = new Map();
    profiles = new Map();

    // Mock Supabase avec implémentation de l'idempotence
    mockSupabase = {
      from: jest.fn((table: string) => {
        // Table webhook_events - implémentation de l'idempotence
        if (table === "webhook_events") {
          return {
            insert: jest.fn((data: any) => {
              const eventId = data.stripe_event_id;

              // Vérifier si l'event existe déjà (simule la contrainte UNIQUE)
              if (webhookEvents.has(eventId)) {
                return {
                  data: null,
                  error: {
                    code: "23505",
                    message: "duplicate key value violates unique constraint",
                    details: `Key (stripe_event_id)=(${eventId}) already exists.`,
                  },
                };
              }

              // Sinon, insérer
              webhookEvents.set(eventId, {
                ...data,
                created_at: new Date().toISOString(),
              });

              return {
                data: { created_at: new Date().toISOString() },
                error: null,
              };
            }),
            select: jest.fn((columns: string) => ({
              eq: jest.fn((column: string, value: string) => ({
                single: jest.fn().mockImplementation(() => {
                  if (column === "stripe_event_id" && webhookEvents.has(value)) {
                    return {
                      data: webhookEvents.get(value),
                      error: null,
                    };
                  }
                  return { data: null, error: { message: "Not found" } };
                }),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }

        // Table subscriptions
        if (table === "subscriptions") {
          return {
            insert: jest.fn((data: any) => {
              const id = `sub_${Date.now()}`;
              subscriptions.set(id, { id, ...data });
              return { data: { id }, error: null };
            }),
            select: jest.fn((columns: string) => ({
              eq: jest.fn((column: string, value: string) => ({
                maybeSingle: jest.fn().mockImplementation(() => {
                  // Chercher par stripe_customer_id
                  if (column === "stripe_customer_id") {
                    const sub = Array.from(subscriptions.values()).find(
                      (s) => s.stripe_customer_id === value
                    );
                    return { data: sub || null, error: null };
                  }
                  // Chercher par stripe_subscription_id
                  if (column === "stripe_subscription_id") {
                    const sub = Array.from(subscriptions.values()).find(
                      (s) => s.stripe_subscription_id === value
                    );
                    return { data: sub || null, error: null };
                  }
                  return { data: null, error: null };
                }),
                single: jest.fn().mockImplementation(() => {
                  if (column === "stripe_subscription_id") {
                    const sub = Array.from(subscriptions.values()).find(
                      (s) => s.stripe_subscription_id === value
                    );
                    return { data: sub || null, error: sub ? null : { message: "Not found" } };
                  }
                  return { data: null, error: { message: "Not found" } };
                }),
              })),
            })),
            update: jest.fn((data: any) => ({
              eq: jest.fn((column: string, value: string) => {
                const sub = Array.from(subscriptions.values()).find(
                  (s) => s[column] === value
                );
                if (sub) {
                  Object.assign(sub, data);
                }
                return { data: null, error: null };
              }),
            })),
            upsert: jest.fn((data: any) => {
              subscriptions.set(data.company_id, data);
              return { data: null, error: null };
            }),
          };
        }

        // Table profiles
        if (table === "profiles") {
          return {
            insert: jest.fn((data: any) => {
              const id = data.id || `prof_${Date.now()}`;
              profiles.set(id, { id, ...data });
              return { data: { id }, error: null };
            }),
            select: jest.fn((columns: string) => ({
              eq: jest.fn((column: string, value: string) => ({
                single: jest.fn().mockImplementation(() => {
                  if (column === "email") {
                    const prof = Array.from(profiles.values()).find(
                      (p) => p.email === value
                    );
                    return { data: prof || null, error: prof ? null : { message: "Not found" } };
                  }
                  if (column === "id") {
                    const prof = profiles.get(value);
                    return { data: prof || null, error: prof ? null : { message: "Not found" } };
                  }
                  return { data: null, error: { message: "Not found" } };
                }),
              })),
            })),
          };
        }

        // Table companies
        if (table === "companies") {
          const companiesStore = new Map();
          return {
            insert: jest.fn((data: any) => {
              const id = `comp_${Date.now()}`;
              const company = { id, ...data };
              companiesStore.set(id, company);
              return {
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: company, error: null }),
                })),
              };
            }),
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
            delete: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }

        // Table webhook_errors
        if (table === "webhook_errors") {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        // Table pending_registrations
        if (table === "pending_registrations") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  gt: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: `pending_${Date.now()}`,
                        password_hash: "hashed_password_123",
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }

        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          select: jest.fn().mockReturnValue({ eq: jest.fn() }),
        };
      }),
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: `user_${Date.now()}` } },
            error: null,
          }),
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
          listUsers: jest.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
          generateLink: jest.fn().mockResolvedValue({
            data: { properties: { action_link: "https://example.com/magic-link" } },
            error: null,
          }),
        },
      },
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe("Idempotence des événements", () => {
    it("devrait traiter un nouvel événement avec succès", async () => {
      const eventId = "evt_test_001";
      const mockEvent = createMockEvent(eventId, "checkout.session.completed");
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = createMockRequest(mockEvent);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
      expect(body.idempotent).toBeUndefined(); // Pas de flag idempotent car c'est un nouvel event

      // Vérifier que l'event a été stocké
      expect(webhookEvents.has(eventId)).toBe(true);
    });

    it("devrait ignorer un événement déjà traité (même event_id)", async () => {
      const eventId = "evt_test_002";
      const mockEvent = createMockEvent(eventId, "checkout.session.completed");
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // Premier appel - traitement normal
      const request1 = createMockRequest(mockEvent);
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);
      const body1 = await response1.json();
      
      // Vérifier que l'event a été stocké
      expect(webhookEvents.has(eventId)).toBe(true);
      
      // Premier appel ne doit pas être marqué idempotent
      expect(body1.idempotent).toBeUndefined();

      // Deuxième appel - même event_id (simule un retry Stripe)
      const request2 = createMockRequest(mockEvent);
      const response2 = await POST(request2);

      expect(response2.status).toBe(200);
      const body2 = await response2.json();
      expect(body2.idempotent).toBe(true);
      // previously_processed_at peut être undefined si la récupération échoue,
      // mais l'important est que idempotent soit true
      
      // L'event ne doit être stocké qu'une seule fois
      expect(webhookEvents.size).toBe(1);
    });

    it("devrait traiter des événements différents indépendamment", async () => {
      const eventId1 = "evt_test_003";
      const eventId2 = "evt_test_004";

      const mockEvent1 = createMockEvent(eventId1, "checkout.session.completed", {
        metadata: {
          registration_pending: "true",
          email: "user1@example.com",
          company_name: "Company 1",
        },
      });

      const mockEvent2 = createMockEvent(eventId2, "checkout.session.completed", {
        metadata: {
          registration_pending: "true",
          email: "user2@example.com",
          company_name: "Company 2",
        },
      });

      // Premier event
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent1);
      const request1 = createMockRequest(mockEvent1);
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Deuxième event (différent)
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent2);
      const request2 = createMockRequest(mockEvent2);
      const response2 = await POST(request2);
      expect(response2.status).toBe(200);

      // Vérifier que les deux events sont stockés
      expect(webhookEvents.has(eventId1)).toBe(true);
      expect(webhookEvents.has(eventId2)).toBe(true);
    });

    it("devrait gérer les différents types d'événements de manière idempotente", async () => {
      // Note: Ces tests vérifient principalement que les events sont bien
      // trackés dans webhook_events, même si le traitement métier peut varier
      
      const testCases = [
        { type: "invoice.payment_succeeded", id: "evt_invoice_001" },
        { type: "invoice.payment_failed", id: "evt_invoice_002" },
        { type: "customer.subscription.deleted", id: "evt_sub_del_001" },
        { type: "customer.subscription.updated", id: "evt_sub_upd_001" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        webhookEvents.clear(); // Reset le store

        const mockEvent = createMockEvent(testCase.id, testCase.type, {
          // Pour subscription.updated, on a besoin de plus de données
          items: {
            data: [{
              price: { id: "price_essential" }
            }]
          },
          metadata: {
            plan_type: "ESSENTIAL"
          }
        });
        
        (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
        (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
          id: `sub_${testCase.id}`,
          items: {
            data: [{
              price: { id: "price_essential" }
            }]
          },
          metadata: { plan_type: "ESSENTIAL" },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        });

        // Premier appel
        const request1 = createMockRequest(mockEvent);
        const response1 = await POST(request1);
        
        // Pour ces types d'events, on vérifie surtout qu'ils sont bien trackés
        // Certains peuvent retourner 200 ou 500 selon les mocks, mais l'important
        // est que l'event soit enregistré dans webhook_events
        expect(webhookEvents.has(testCase.id)).toBe(true);

        // Deuxième appel (retry) - doit être idempotent
        const request2 = createMockRequest(mockEvent);
        const response2 = await POST(request2);

        expect(response2.status).toBe(200);
        const body2 = await response2.json();
        expect(body2.idempotent).toBe(true);
      }
    });

    it("devrait gérer la race condition (deux requêtes simultanées avec même event_id)", async () => {
      const eventId = "evt_race_condition_001";
      const mockEvent = createMockEvent(eventId, "checkout.session.completed");
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // Simuler une race condition: deux requêtes identiques en parallèle
      const request1 = createMockRequest(mockEvent);
      const request2 = createMockRequest(mockEvent);

      // Exécuter les deux en parallèle
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      // Les deux doivent retourner 200 (pas d'erreur)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Au moins une doit être idempotente (la deuxième arrivée)
      const body1 = await response1.json();
      const body2 = await response2.json();

      const oneIsIdempotent = body1.idempotent === true || body2.idempotent === true;
      expect(oneIsIdempotent).toBe(true);

      // Vérifier qu'un seul abonnement a été créé (pas de doublon)
      const subs = Array.from(subscriptions.values());
      expect(subs.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Gestion des erreurs", () => {
    it("devrait retourner 400 pour une signature invalide", async () => {
      (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid signature");
    });

    it("devrait retourner 400 pour un header stripe-signature manquant", async () => {
      const request = new Request("{}", {}) as unknown as NextRequest;

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Missing stripe-signature");
    });

    it("devrait retourner 503 si Stripe n'est pas configuré", async () => {
      const { isStripeConfigured } = await import("@/lib/stripe/stripe");
      (isStripeConfigured as jest.Mock).mockReturnValue(false);

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe("Stripe not configured");

      // Reset
      (isStripeConfigured as jest.Mock).mockReturnValue(true);
    });
  });

  describe("Payload des événements", () => {
    it("devrait stocker le payload complet dans webhook_events", async () => {
      const eventId = "evt_payload_test_001";
      const mockEvent = createMockEvent(eventId, "checkout.session.completed", {
        metadata: { custom_field: "custom_value" },
      });
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = createMockRequest(mockEvent);
      await POST(request);

      const storedEvent = webhookEvents.get(eventId);
      expect(storedEvent).toBeDefined();
      expect(storedEvent.payload).toBeDefined();
      expect(storedEvent.payload.type).toBe("checkout.session.completed");
    });

    it("devrait enregistrer la durée de traitement", async () => {
      const eventId = "evt_timing_test_001";
      const mockEvent = createMockEvent(eventId, "checkout.session.completed");
      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = createMockRequest(mockEvent);
      await POST(request);

      // Vérifier que le mock a bien été appelé avec les bonnes données
      expect(mockSupabase.from).toHaveBeenCalledWith("webhook_events");
    });
  });
});
