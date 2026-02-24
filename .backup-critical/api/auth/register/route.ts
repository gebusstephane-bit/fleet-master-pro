/**
 * API Route pour l'inscription - EARLY ADOPTERS UNIQUEMENT
 * 
 * Pour les inscriptions normales (payantes), voir : /api/stripe/webhook (création différée)
 * 
 * Ce fichier ne gère QUE les early adopters (inscription gratuite).
 * Les utilisateurs normaux doivent passer par Stripe Checkout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS } from '@/lib/plans';

interface RegisterRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  siret: string;
  planType: 'essential' | 'pro' | 'unlimited';
  isEarlyAdopter?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { userId, email, firstName, lastName, phone, companyName, siret, planType, isEarlyAdopter } = body;

    // Vérifier que c'est bien un early adopter
    if (!isEarlyAdopter) {
      return NextResponse.json(
        { 
          error: 'Inscription payante requise. Utilisez le flux Stripe Checkout.',
          redirectToStripe: true 
        },
        { status: 400 }
      );
    }

    const plan = PLANS[planType as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan invalide' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Créer l'entreprise avec statut ACTIF (early adopter)
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
        subscription_plan: planType,
        subscription_status: 'active', // ✅ Early adopter = actif immédiatement
        max_vehicles: plan.maxVehicles,
        max_drivers: plan.maxDrivers,
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

    // 3. Créer l'abonnement
    await (supabaseAdmin as any).from('subscriptions').insert({
      company_id: company.id,
      plan: planType.toUpperCase() as any,
      status: 'ACTIVE' as any,
      vehicle_limit: plan.maxVehicles,
      user_limit: plan.maxDrivers,
      features: plan.features as any,
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      companyId: company.id,
      requiresPayment: false,
      plan: planType,
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
