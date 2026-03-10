/**
 * API pour créer un compte de test (bypass Supabase Auth rate limiting)
 * À utiliser uniquement en développement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  // Vérifier qu'on est en développement
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cette route est désactivée en production' },
      { status: 403 }
    );
  }

  try {
    const { email, password, firstName, lastName, companyName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Créer l'entreprise
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName || 'Mon Entreprise',
        siret: '12345678900012',
        address: '',
        postal_code: '',
        city: '',
        country: 'France',
        phone: '',
        email: email,
        subscription_plan: 'starter',
        subscription_status: 'trialing',
        max_vehicles: 1,
        max_drivers: 1,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company error:', companyError);
      return NextResponse.json(
        { error: 'Erreur création entreprise: ' + companyError.message },
        { status: 500 }
      );
    }

    // 2. Créer l'utilisateur dans Supabase Auth (avec admin bypass)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        first_name: firstName || 'Test',
        last_name: lastName || 'User',
        company_name: companyName || 'Mon Entreprise',
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Erreur création auth: ' + authError.message },
        { status: 500 }
      );
    }

    // 3. Créer le profil
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      email,
      first_name: firstName || 'Test',
      last_name: lastName || 'User',
      role: 'ADMIN',
      company_id: company.id,
      is_active: true,
    });

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json(
        { error: 'Erreur création profil: ' + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: authData.user.id,
        email,
        company_id: company.id,
      },
      credentials: {
        email,
        password,
      }
    });

  } catch (error: any) {
    console.error('Create test user error:', error);
    return NextResponse.json(
      { error: 'Erreur interne: ' + error.message },
      { status: 500 }
    );
  }
}
