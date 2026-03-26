/**
 * Handler Stripe — customer.subscription.trial_will_end
 * Stripe envoie cet événement 3 jours avant la fin du trial payant.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/client";
import { trialEndingEmailTemplate, trialEndingEmailText } from "@/lib/email/templates/trial-ending";
import { PLAN_PRICES } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";

// Mapping Price ID → plan (depuis les variables d'environnement)
function getPlanFromPriceId(priceId: string): PlanType {
  if (priceId === process.env.STRIPE_PRICE_ID_ESSENTIAL || priceId === process.env.STRIPE_PRICE_ID_ESSENTIAL_YEARLY) return 'ESSENTIAL';
  if (priceId === process.env.STRIPE_PRICE_ID_UNLIMITED || priceId === process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY) return 'UNLIMITED';
  return 'PRO'; // fallback
}

export async function handleTrialWillEnd(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: import("stripe").Stripe.Subscription
) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  if (!customerId) return;

  // 1. Trouver l'entreprise via stripe_customer_id
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id, plan')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!sub?.company_id) {
    logger.warn(`[trial_will_end] Aucune subscription trouvée pour customer ${customerId}`);
    return;
  }

  // 2. Récupérer les infos de l'entreprise et de l'admin
  const [{ data: company }, { data: admin }] = await Promise.all([
    supabase.from('companies').select('name, email').eq('id', sub.company_id).single(),
    supabase.from('profiles').select('email, first_name').eq('company_id', sub.company_id).eq('role', 'ADMIN').order('created_at', { ascending: true }).limit(1).single(),
  ]);

  const recipientEmail = admin?.email || company?.email;
  if (!recipientEmail || !company?.name) {
    logger.warn(`[trial_will_end] Destinataire introuvable pour company ${sub.company_id}`);
    return;
  }

  // 3. Déterminer le plan et le prix
  const subData = subscription as unknown as { items?: { data?: Array<{ price?: { id?: string } }> }; trial_end?: number | null };
  const priceId = subData.items?.data?.[0]?.price?.id ?? '';
  const plan = (sub.plan as PlanType) || getPlanFromPriceId(priceId);
  const planPrice = PLAN_PRICES[plan]?.monthly ?? 49;
  const planName = plan.charAt(0) + plan.slice(1).toLowerCase(); // "Pro", "Essential", "Unlimited"

  const trialEndsAt = subData.trial_end
    ? new Date(subData.trial_end * 1000)
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  const billingUrl = `${appUrl}/dashboard/settings/billing`;

  // 4. Envoyer l'email
  try {
    await sendEmail({
      to: recipientEmail,
      subject: `Votre essai Fleet-Master se termine dans 3 jours`,
      html: trialEndingEmailTemplate({
        firstName: admin?.first_name ?? undefined,
        companyName: company.name,
        trialEndsAt,
        planName,
        planPrice,
        billingUrl,
      }),
      text: trialEndingEmailText({
        companyName: company.name,
        firstName: admin?.first_name ?? undefined,
        trialEndsAt,
        planName,
        planPrice,
        billingUrl,
      }),
    });
    logger.info(`[trial_will_end] Email envoyé à ${recipientEmail} (company: ${sub.company_id})`);
  } catch (emailError) {
    logger.error('[trial_will_end] Erreur envoi email:', emailError);
  }
}
