/**
 * Handlers Stripe — événements customer.subscription
 * - handleSubscriptionCanceled : customer.subscription.deleted
 * - handleSubscriptionUpdated  : customer.subscription.updated
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { PlanType } from "@/lib/plans";
import { WEBHOOK_PLAN_LIMITS } from "@/lib/stripe/webhook-utils";

/**
 * Mappe le statut Stripe vers nos statuts internes.
 * - `sub`     : enum UPPERCASE de la table `subscriptions`
 * - `company` : convention lowercase lue par le middleware sur `companies`
 *
 * Sécurité : SEULS les statuts délinquants bloquent. Tout statut sain ou
 * inconnu retombe sur `ACTIVE`/`active` → jamais de blocage accidentel d'un
 * client légitime (règle : l'utilisateur ne doit voir aucun problème).
 */
function mapStripeSubscriptionStatus(stripeStatus: string): {
  sub: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID";
  company: string;
} {
  switch (stripeStatus) {
    case "past_due":
      return { sub: "PAST_DUE", company: "past_due" };
    case "unpaid":
      return { sub: "UNPAID", company: "unpaid" };
    case "paused":
      return { sub: "PAST_DUE", company: "past_due" };
    case "canceled":
      return { sub: "CANCELED", company: "canceled" };
    case "incomplete_expired":
      return { sub: "CANCELED", company: "canceled" };
    case "trialing":
      return { sub: "TRIALING", company: "trialing" };
    // active, incomplete, et tout statut inconnu → accès conservé
    default:
      return { sub: "ACTIVE", company: "active" };
  }
}

export async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof createAdminClient>,
  deletedSub: import("stripe").Stripe.Subscription
) {
  // L'abonnement est annulé - L'accès est bloqué jusqu'à réabonnement
  // UPDATE = idempotent (même résultat si appelé plusieurs fois)
  await supabase
    .from("subscriptions")
    .update({
      status: "CANCELED",
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_end: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", deletedSub.id);

  // Mettre à jour companies - bloquer l'accès
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", deletedSub.id)
    .single();

  if (sub?.company_id) {
    await supabase
      .from("companies")
      .update({
        subscription_status: "canceled", // Bloque l'accès au dashboard
      })
      .eq("id", sub.company_id);
  }

  logger.info(`Subscription canceled, access blocked`);
}

export async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  updatedSub: import("stripe").Stripe.Subscription
) {
  const priceId = updatedSub.items.data[0].price.id;
  let plan: PlanType = "ESSENTIAL";

  // Mapping des price IDs vers les plans
  const essentialPriceId = process.env.STRIPE_PRICE_ID_ESSENTIAL;
  const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
  const unlimitedPriceId = process.env.STRIPE_PRICE_ID_UNLIMITED;

  if (priceId === essentialPriceId || priceId.includes("essential")) plan = "ESSENTIAL";
  else if (priceId === proPriceId || priceId.includes("pro")) plan = "PRO";
  else if (priceId === unlimitedPriceId || priceId.includes("unlimited"))
    plan = "UNLIMITED";

  // Statut réel Stripe → nos statuts (ne plus forcer 'active' : un client
  // past_due/unpaid/canceled doit être bloqué par le middleware)
  const status = mapStripeSubscriptionStatus(updatedSub.status);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", updatedSub.id)
    .single();

  if (sub?.company_id) {
    // UPDATE = idempotent (même résultat si appelé plusieurs fois)
    await supabase
      .from("subscriptions")
      .update({
        plan: plan,
        status: status.sub,
        vehicle_limit: WEBHOOK_PLAN_LIMITS[plan].maxVehicles,
        user_limit: WEBHOOK_PLAN_LIMITS[plan].maxDrivers,
        features: WEBHOOK_PLAN_LIMITS[plan].features,
        current_period_start: new Date(
          (updatedSub as unknown as { current_period_start: number }).current_period_start *
            1000
        ).toISOString(),
        current_period_end: new Date(
          (updatedSub as unknown as { current_period_end: number }).current_period_end * 1000
        ).toISOString(),
      })
      .eq("stripe_subscription_id", updatedSub.id);

    // La table companies est synchronisée via trigger (LOWER(status)), mais on
    // écrit la MÊME valeur pour garantir la cohérence quel que soit l'ordre.
    await supabase
      .from("companies")
      .update({
        subscription_plan: plan, // Format UPPERCASE (ESSENTIAL, PRO, UNLIMITED)
        subscription_status: status.company,
        max_vehicles: WEBHOOK_PLAN_LIMITS[plan].maxVehicles,
        max_drivers: WEBHOOK_PLAN_LIMITS[plan].maxDrivers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.company_id);
  }

  logger.info(`Subscription updated`, { plan, status: status.sub });
}
