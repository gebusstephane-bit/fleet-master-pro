'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mapping des plans vers les variables d'environnement Stripe
const PLAN_PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  ESSENTIAL: {
    monthly: process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
    yearly: process.env.STRIPE_PRICE_ID_ESSENTIAL_YEARLY || process.env.STRIPE_PRICE_ID_ESSENTIAL || '',
  },
  PRO: {
    monthly: process.env.STRIPE_PRICE_ID_PRO || '',
    yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY || process.env.STRIPE_PRICE_ID_PRO || '',
  },
  UNLIMITED: {
    monthly: process.env.STRIPE_PRICE_ID_UNLIMITED || '',
    yearly: process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY || process.env.STRIPE_PRICE_ID_UNLIMITED || '',
  },
};

// Schémas
const upgradeSchema = z.object({
  plan: z.enum(['ESSENTIAL', 'PRO', 'UNLIMITED']),
  yearly: z.boolean().default(false),
});

// Récupérer l'abonnement de l'entreprise
export const getCompanySubscription = authActionClient
  .action(async ({ ctx }) => {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (error) {
      throw new Error('Abonnement non trouvé');
    }
    
    return { success: true, data };
  });

// Vérifier les limites actuelles
export const checkSubscriptionLimits = authActionClient
  .action(async ({ ctx }) => {
    const supabase = createAdminClient();
    
    // Récupérer l'abonnement avec les compteurs
    const { data: sub } = await supabase
      .from('company_subscription' as any)
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (!sub) {
      throw new Error('Abonnement non trouvé');
    }
    
    return {
      success: true,
      data: {
        plan: (sub as any).plan,
        vehicleLimit: (sub as any).vehicle_limit,
        vehicleCount: (sub as any).current_vehicle_count,
        canAddVehicle: (sub as any).can_add_vehicle,
        userLimit: (sub as any).user_limit,
        userCount: (sub as any).current_user_count,
        canAddUser: (sub as any).can_add_user,
        periodEnd: (sub as any).current_period_end,
      }
    };
  });

// Créer une session de checkout Stripe
export const createCheckoutSession = authActionClient
  .schema(upgradeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { plan, yearly } = parsedInput;
    const supabase = createAdminClient();
    
    // Récupérer l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, email')
      .eq('id', ctx.user.company_id)
      .single();
    
    if (!company) {
      throw new Error('Entreprise non trouvée');
    }
    
    // Récupérer ou créer le customer Stripe
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', company.id)
      .single();
    
    let customerId = subscription?.stripe_customer_id;
    
    if (!customerId) {
      // Créer un customer Stripe
      const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
      
      const customer = await stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: {
          company_id: company.id,
        },
      } as any);
      
      customerId = customer.id;
      
      // Sauvegarder le customer_id
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('company_id', company.id);
    }
    
    // Créer la session de checkout
    const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
    
    const planConfig = PLAN_PRICE_IDS[plan];
    const priceId = yearly ? planConfig.yearly : planConfig.monthly;
    
    if (!priceId) {
      throw new Error('Price ID non configuré pour ce plan');
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          company_id: company.id,
          plan_type: plan,
        },
        trial_period_days: 14,
      },
    });
    
    return { success: true, url: session.url };
  });

// Créer une demande Enterprise (sur devis) - devient demande Unlimited
export const requestEnterpriseQuote = authActionClient
  .schema(z.object({
    message: z.string().min(10),
    phone: z.string().optional(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const { message, phone } = parsedInput;
    const supabase = createAdminClient();
    
    // Récupérer les infos de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, email, siret')
      .eq('id', ctx.user.company_id)
      .single();
    
    if (!company) {
      throw new Error('Entreprise non trouvée');
    }
    
    // Envoyer email à l'équipe commerciale
    const { sendEmail } = await import('@/lib/email');
    
    await sendEmail({
      to: 'sales@fleetmaster.pro',
      subject: `Demande de devis Unlimited - ${company.name}`,
      html: `
        <h2>Nouvelle demande de devis Unlimited</h2>
        <p><strong>Entreprise:</strong> ${company.name}</p>
        <p><strong>Email:</strong> ${company.email}</p>
        <p><strong>SIRET:</strong> ${company.siret || 'Non renseigné'}</p>
        ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ''}
        <p><strong>Message:</strong></p>
        <blockquote>${message}</blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/companies/${company.id}">Voir la fiche entreprise</a></p>
      `,
    });
    
    // Créer une notification interne
    await supabase.from('notifications').insert({
      company_id: company.id,
      type: 'UNLIMITED_QUOTE_REQUEST',
      title: 'Demande de devis Unlimited',
      message: `Demande envoyée par ${company.name}`,
      read: false,
    } as any);
    
    revalidatePath('/settings/billing');
    
    return { success: true, message: 'Votre demande a été envoyée. Notre équipe vous contactera sous 24h.' };
  });

// Annuler l'abonnement
export const cancelSubscription = authActionClient
  .action(async ({ ctx }) => {
    const supabase = createAdminClient();
    
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, plan')
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (!sub?.stripe_subscription_id) {
      throw new Error('Aucun abonnement actif à annuler');
    }
    
    // Annuler chez Stripe
    const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
    
    await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    
    // Mettre à jour en base (le webhook confirmera, mais on prépare)
    await supabase
      .from('subscriptions')
      .update({
        status: 'CANCELED',
        canceled_at: new Date().toISOString(),
      })
      .eq('company_id', ctx.user.company_id);
    
    revalidatePath('/settings/billing');
    
    return { success: true, message: 'Abonnement annulé. Vous resterez sur le plan actuel jusqu\'à la fin de la période.' };
  });
