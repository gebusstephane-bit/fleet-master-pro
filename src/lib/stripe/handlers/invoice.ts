/**
 * Handlers Stripe — événements invoice
 * - handlePaymentSuccess : invoice.payment_succeeded
 * - handlePaymentFailed  : invoice.payment_failed
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/client";
import { paymentFailedEmailTemplate, paymentFailedEmailText } from "@/lib/email/templates/payment-failed";

export async function handlePaymentSuccess(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: import("stripe").Stripe.Invoice
) {
  const subscriptionId =
    typeof (invoice as unknown as { subscription?: string }).subscription === "string"
      ? (invoice as unknown as { subscription: string }).subscription
      : null;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subData = subscription as unknown as import("stripe").Stripe.Subscription;

  // UPDATE = idempotent (même résultat si appelé plusieurs fois)
  await supabase
    .from("subscriptions")
    .update({
      status: "ACTIVE",
      current_period_start: new Date(
        (subData as unknown as { current_period_start: number }).current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        (subData as unknown as { current_period_end: number }).current_period_end * 1000
      ).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  // Mettre à jour companies aussi
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (sub?.company_id) {
    await supabase
      .from("companies")
      .update({
        subscription_status: "active",
      })
      .eq("id", sub.company_id);
  }

  // Payment succeeded
}

export async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: import("stripe").Stripe.Invoice
) {
  const subscriptionId =
    typeof (invoice as unknown as { subscription?: string }).subscription === "string"
      ? (invoice as unknown as { subscription: string }).subscription
      : null;
  if (!subscriptionId) return;

  // UPDATE = idempotent (même résultat si appelé plusieurs fois)
  await supabase
    .from("subscriptions")
    .update({
      status: "PAST_DUE",
    })
    .eq("stripe_subscription_id", subscriptionId);

  // Mettre à jour companies
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (sub?.company_id) {
    await supabase
      .from("companies")
      .update({
        subscription_status: "unpaid",
      })
      .eq("id", sub.company_id);

    // Récupérer l'admin de l'entreprise pour lui envoyer l'alerte
    const { data: company } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", sub.company_id)
      .single();

    const { data: admin } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("company_id", sub.company_id)
      .eq("role", "ADMIN")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const recipientEmail = admin?.email || company?.email;

    if (recipientEmail && company?.name) {
      const inv = invoice as unknown as {
        amount_due?: number;
        currency?: string;
        next_payment_attempt?: number | null;
      };
      const nextRetry = inv.next_payment_attempt
        ? new Date(inv.next_payment_attempt * 1000).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : undefined;

      try {
        await sendEmail({
          to: recipientEmail,
          subject: `⚠️ Échec de paiement — abonnement Fleet-Master`,
          html: paymentFailedEmailTemplate({
            companyName: company.name,
            adminFirstName: admin?.first_name ?? undefined,
            amount: inv.amount_due,
            currency: inv.currency,
            nextRetryDate: nextRetry,
          }),
          text: paymentFailedEmailText({
            companyName: company.name,
            adminFirstName: admin?.first_name ?? undefined,
          }),
        });
        logger.info(`Email échec paiement envoyé à ${recipientEmail} (company: ${sub.company_id})`);
      } catch (emailError) {
        logger.error("Erreur envoi email échec paiement:", emailError);
      }
    }
  }

  // Payment failed
}
