/**
 * API pour créer le SuperAdmin
 * À utiliser une seule fois pour créer l'utilisateur contact@fleet-master.fr
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Email et mot de passe du SuperAdmin
const SUPERADMIN_EMAIL = 'contact@fleet-master.fr';
const SUPERADMIN_PASSWORD = 'Emilie57';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // 1. Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des utilisateurs', details: listError.message },
        { status: 500 }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email === SUPERADMIN_EMAIL);

    if (existingUser) {
      return NextResponse.json({
        message: 'Le SuperAdmin existe déjà',
        email: SUPERADMIN_EMAIL,
        userId: existingUser.id,
      });
    }

    // 2. Créer l'utilisateur
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
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
        email: SUPERADMIN_EMAIL,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'ADMIN',
        company_id: null, // Pas de company pour le SuperAdmin
      });
    }

    return NextResponse.json({
      success: true,
      message: 'SuperAdmin créé avec succès',
      email: SUPERADMIN_EMAIL,
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

// GET pour vérifier si le SuperAdmin existe
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: existingUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json(
        { error: 'Erreur', details: error.message },
        { status: 500 }
      );
    }

    const superAdmin = existingUsers.users.find(u => u.email === SUPERADMIN_EMAIL);

    if (superAdmin) {
      return NextResponse.json({
        exists: true,
        email: SUPERADMIN_EMAIL,
        userId: superAdmin.id,
        createdAt: superAdmin.created_at,
      });
    }

    return NextResponse.json({
      exists: false,
      email: SUPERADMIN_EMAIL,
      message: 'Le SuperAdmin n\'existe pas encore. Utilisez POST pour le créer.',
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
