/**
 * API Route pour l'inscription
 * Crée l'entreprise et l'utilisateur en base après auth Supabase
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

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { userId, email, firstName, lastName, phone, companyName, siret, plan } = body;

    // Utiliser le client admin pour bypass RLS
    const supabaseAdmin = createAdminClient();

    // 1. Créer l'entreprise
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
        subscription_status: 'trialing',
        max_vehicles: SUBSCRIPTION_PLANS[plan].maxVehicles,
        max_drivers: SUBSCRIPTION_PLANS[plan].maxDrivers,
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

    // 2. Créer l'utilisateur
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
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'utilisateur' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      companyId: company.id,
    });
  } catch (error: any) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + error.message },
      { status: 500 }
    );
  }
}
