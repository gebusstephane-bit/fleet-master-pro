/**
 * Webhook Stripe - FLUX TRANSACTIONNEL RGPD COMPLIANT + IDEMPOTENCE
 *
 * Gère les événements de paiement avec garantie d'idempotence:
 * - Vérifie dans webhook_events si l'événement a déjà été traité
 * - Utilise l'ID unique Stripe (evt_xxx) comme clé de déduplication
 * - Gère les race conditions via contrainte UNIQUE PostgreSQL
 *
 * SECURITY :
 * - Utilise setup_token pour récupérer les données sensibles (jamais dans Stripe)
 * - RGPD Article 32 : Les données sensibles ne transitent pas par des tiers (Stripe)
 * - Idempotence : Évite les doublons d'abonnement sur retry Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSensitiveRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { logger } from "@/lib/logger";
import {
  stripe,
  isStripeConfigured,
  isWebhookConfigured,
} from "@/lib/stripe/stripe";
import {
  checkEventIdempotence,
  updateEventStatus,
} from "@/lib/stripe/webhook-utils";
import {
  handleNewRegistration,
  handleSubscriptionUpdate,
} from "@/lib/stripe/handlers/checkout-session";
import {
  handlePaymentSuccess,
  handlePaymentFailed,
} from "@/lib/stripe/handlers/invoice";
import {
  handleSubscriptionCanceled,
  handleSubscriptionUpdated,
} from "@/lib/stripe/handlers/subscription";
import { handleTrialWillEnd } from "@/lib/stripe/handlers/trial";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// Handler principal (protégé par rate limiting et idempotence)
async function handler(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Vérifier Stripe configuré
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    if (!isWebhookConfigured()) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 503 }
      );
    }

    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature" },
        { status: 400 }
      );
    }

    let event: import("stripe").Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid signature";
      logger.error("Webhook signature verification failed", { errorMessage });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ============================================================================
    // 🔐 VÉRIFICATION IDEMPOTENCE (avant tout traitement)
    // ============================================================================
    const { isNew, existingCreatedAt } = await checkEventIdempotence(
      supabase,
      event.id,
      event.type,
      event
    );

    if (!isNew) {
      // Event déjà traité, on retourne 200 immédiatement (pas d'erreur pour Stripe)
      logger.info(`Event ${event.id} ignoré (déjà traité)`);
      return NextResponse.json({
        received: true,
        idempotent: true,
        previously_processed_at: existingCreatedAt,
      });
    }

    // Event nouveau, on continue le traitement
    logger.info(`Traitement webhook`, { eventId: event.id, eventType: event.type });

    try {
      switch (event.type) {
        // ============================================
        // CRITIQUE : Création du compte après paiement
        // ============================================
        case "checkout.session.completed": {
          const session = event.data.object as import("stripe").Stripe.Checkout.Session;

          // Vérification d'idempotence métier : déjà traité pour ce customer ?
          // (double sécurité avec la table webhook_events)
          const stripeCustomerId = session.customer as string;
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id, company_id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();

          if (existingSub) {
            // Webhook déjà traité pour ce customer, ignoré
            logger.info(`Customer a déjà un abonnement`, { stripeCustomerId });
            break;
          }

          // Vérifier si c'est une inscription (pas un upgrade)
          // Utiliser les métadonnées de la session ou de la subscription
          const sessionMetadata: Record<string, string | null | undefined> =
            session.metadata || {};
          const isRegistration = sessionMetadata.registration_pending === "true";

          if (!isRegistration) {
            // C'est un upgrade existant, gérer normalement
            await handleSubscriptionUpdate(supabase, session);
            break;
          }

          // NOUVELLE INSCRIPTION : Créer l'utilisateur
          await handleNewRegistration(supabase, session);
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as import("stripe").Stripe.Invoice;
          await handlePaymentSuccess(supabase, invoice);
          break;
        }

        case "invoice.payment_failed": {
          const failedInvoice = event.data.object as import("stripe").Stripe.Invoice;
          await handlePaymentFailed(supabase, failedInvoice);
          break;
        }

        case "customer.subscription.deleted": {
          const deletedSub = event.data.object as import("stripe").Stripe.Subscription;
          await handleSubscriptionCanceled(supabase, deletedSub);
          break;
        }

        case "customer.subscription.updated": {
          const updatedSub = event.data.object as import("stripe").Stripe.Subscription;
          await handleSubscriptionUpdated(supabase, updatedSub);
          break;
        }

        case "customer.subscription.trial_will_end": {
          const trialSub = event.data.object as import("stripe").Stripe.Subscription;
          await handleTrialWillEnd(supabase, trialSub);
          break;
        }

        default:
          logger.info(`Unhandled event type`, { eventType: event.type });
      }

      // Mettre à jour le statut de succès
      const duration = Date.now() - startTime;
      await updateEventStatus(supabase, event.id, {
        processing_duration_ms: duration,
        processing_error: null,
      });

      return NextResponse.json({ received: true });
    } catch (processingError) {
      // Mettre à jour le statut d'erreur
      const duration = Date.now() - startTime;
      await updateEventStatus(supabase, event.id, {
        processing_duration_ms: duration,
        processing_error:
          processingError instanceof Error
            ? processingError.message
            : "Unknown error",
      });

      throw processingError;
    }
  } catch (error) {
    logger.error("Webhook error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Handler avec rate limiting intégré (50 requêtes par minute par IP)
// Note: Le webhook utilise déjà la vérification de signature Stripe comme protection
async function handlerWithRateLimit(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : realIP || "unknown";

  const rateLimitResult = await checkSensitiveRateLimit(`webhook:${ip}`);

  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Trop de requêtes. Réessayez plus tard.",
        retryAfter: rateLimitResult.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitResult.retryAfter || 60),
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  }

  return handler(request);
}

export const POST = handlerWithRateLimit;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
