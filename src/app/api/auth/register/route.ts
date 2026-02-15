/**
 * API Route pour l'inscription - PLAN GRATUIT UNIQUEMENT
 * 
 * Pour les plans payants, voir : /api/stripe/webhook (création différée)
 * 
 * Ce fichier ne gère QUE les inscriptions gratuites (starter).
 * Les plans payants créent une session Stripe AVANT création user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/config';

interface RegisterRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  siret: string;
  plan: 'starter' | 'pro' | 'business';
}

// Plans gratuits (pas de paiement requis)
const FREE_PLANS = ['starter'];

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { userId, email, firstName, lastName, phone, companyName, siret, plan } = body;

    // Vérifier que c'est bien un plan gratuit
    if (!FREE_PLANS.includes(plan.toLowerCase())) {
      return NextResponse.json(
        { 
          error: 'Plan payant détecté. Utilisez le flux Stripe Checkout.',
          redirectToStripe: true 
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Créer l'entreprise avec statut ACTIF (gratuit)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        siret,
        address: '',
        postal_code: '',
        city: '',
        country: 'France',
        phone,
        email,
        subscription_plan: plan,
        subscription_status: 'active', // ✅ Gratuit = actif immédiatement
        max_vehicles: SUBSCRIPTION_PLANS[plan]?.maxVehicles || 1,
        max_drivers: SUBSCRIPTION_PLANS[plan]?.maxDrivers || 1,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'entreprise' },
        { status: 500 }
      );
    }

    // 2. Créer le profil utilisateur
    const { error: userError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'ADMIN',
      company_id: company.id,
    });

    if (userError) {
      console.error('Error creating user:', userError);
      // Rollback
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'utilisateur' },
        { status: 500 }
      );
    }

    // 3. Créer l'abonnement gratuit
    await supabaseAdmin.from('subscriptions').insert({
      company_id: company.id,
      plan: 'STARTER',
      status: 'ACTIVE',
      vehicle_limit: SUBSCRIPTION_PLANS[plan]?.maxVehicles || 1,
      user_limit: SUBSCRIPTION_PLANS[plan]?.maxDrivers || 1,
      features: SUBSCRIPTION_PLANS[plan]?.features || [],
    });

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      companyId: company.id,
      requiresPayment: false,
      plan: plan,
    });

  } catch (error: any) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
