/**
 * API pour créer le SuperAdmin
 * À utiliser une seule fois pour créer l'utilisateur SuperAdmin
 * 
 * ⚠️ NÉCESSITE UN HEADER DE SÉCURITÉ: X-Setup-Secret
 * La valeur doit correspondre à la variable d'environnement SUPERADMIN_SETUP_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperadminEmail, getSuperadminSetupSecret, isValidSetupSecret } from '@/lib/superadmin';

export async function POST(request: NextRequest) {
  try {
    // 🔐 VÉRIFICATION DU SECRET DE SÉCURITÉ
    const setupSecret = request.headers.get('X-Setup-Secret');
    
    if (!setupSecret) {
      console.error('❌ Tentative de création SuperAdmin sans secret');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Header X-Setup-Secret manquant' },
        { status: 401 }
      );
    }

    if (!isValidSetupSecret(setupSecret)) {
      console.error('❌ Tentative de création SuperAdmin avec secret invalide');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Secret invalide' },
        { status: 401 }
      );
    }

    // Récupérer les credentials depuis les variables d'environnement
    const superadminEmail = getSuperadminEmail();
    const superadminPassword = getSuperadminSetupSecret();
    
    if (!superadminPassword) {
      return NextResponse.json(
        { error: 'Configuration error', message: 'SUPERADMIN_SETUP_SECRET non configuré' },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    // 1. Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des utilisateurs', details: listError.message },
        { status: 500 }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === superadminEmail.toLowerCase());

    if (existingUser) {
      return NextResponse.json({
        message: 'Le SuperAdmin existe déjà',
        email: superadminEmail,
        userId: existingUser.id,
      });
    }

    // 2. Créer l'utilisateur
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: superadminEmail,
      password: superadminPassword,
      email_confirm: true, // Email déjà confirmé
      user_metadata: {
        role: 'SUPERADMIN',
        first_name: 'Super',
        last_name: 'Admin',
      },
    });

    if (createError) {
      return NextResponse.json(
        { error: 'Erreur lors de la création', details: createError.message },
        { status: 500 }
      );
    }

    // 3. Créer le profil associé
    if (newUser.user) {
      await supabase.from('profiles').insert({
        id: newUser.user.id,
        email: superadminEmail,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'ADMIN',
        company_id: null, // Pas de company pour le SuperAdmin
      });
    }

    // SuperAdmin créé avec succès

    return NextResponse.json({
      success: true,
      message: 'SuperAdmin créé avec succès',
      email: superadminEmail,
      userId: newUser.user?.id,
    });

  } catch (error: any) {
    console.error('Error creating superadmin:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}

// GET pour vérifier si le SuperAdmin existe (nécessite aussi le secret)
export async function GET(request: NextRequest) {
  try {
    // 🔐 VÉRIFICATION DU SECRET (même pour GET)
    const setupSecret = request.headers.get('X-Setup-Secret');
    
    if (!setupSecret || !isValidSetupSecret(setupSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Header X-Setup-Secret invalide ou manquant' },
        { status: 401 }
      );
    }

    const superadminEmail = getSuperadminEmail();
    const supabase = createAdminClient();

    const { data: existingUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json(
        { error: 'Erreur', details: error.message },
        { status: 500 }
      );
    }

    const superAdmin = existingUsers.users.find(u => u.email?.toLowerCase() === superadminEmail.toLowerCase());

    if (superAdmin) {
      return NextResponse.json({
        exists: true,
        email: superadminEmail,
        userId: superAdmin.id,
        createdAt: superAdmin.created_at,
      });
    }

    return NextResponse.json({
      exists: false,
      email: superadminEmail,
      message: 'Le SuperAdmin n\'existe pas encore. Utilisez POST pour le créer.',
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
