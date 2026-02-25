/**
 * API pour créer le SuperAdmin
 * À utiliser une seule fois pour créer l'utilisateur SuperAdmin
 *
 * ⚠️  NÉCESSITE UN HEADER DE SÉCURITÉ: X-Setup-Secret
 * La valeur doit correspondre à la variable d'environnement SUPERADMIN_SETUP_SECRET
 *
 * 🔒 SÉCURITÉ:
 * - Vérification du secret via crypto.timingSafeEqual() (protection timing attack)
 * - Rate limiting: max 3 tentatives / heure par IP (via middleware + Redis)
 * - Logging Sentry sur chaque tentative (succès et échec)
 * - Authentification SuperAdmin requise pour les accès ultérieurs
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSuperadminEmail,
  getSuperadminSetupSecret,
} from "@/lib/superadmin";
import * as Sentry from "@sentry/nextjs";
import { timingSafeEqual } from "crypto";
import { logger } from '@/lib/logger';

/**
 * Vérifie le secret de manière constant-time (protection timing attack)
 * @param providedSecret - Le secret fourni dans le header
 * @returns boolean - true si le secret est valide
 */
function verifySecretConstantTime(providedSecret: string | null): boolean {
  const expectedSecret = getSuperadminSetupSecret();

  if (!providedSecret || !expectedSecret) {
    return false;
  }

  // Normaliser les longueurs pour éviter les fuites via longueur
  const maxLength = Math.max(providedSecret.length, expectedSecret.length);

  // Padding avec des zéros pour avoir la même longueur
  const providedPadded = providedSecret.padEnd(maxLength, "\0");
  const expectedPadded = expectedSecret.padEnd(maxLength, "\0");

  try {
    return timingSafeEqual(
      Buffer.from(providedPadded),
      Buffer.from(expectedPadded)
    );
  } catch {
    return false;
  }
}

/**
 * Récupère l'IP du client pour logging
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  try {
    // 🔐 VÉRIFICATION DU SECRET DE SÉCURITÉ (timing-safe)
    const setupSecret = request.headers.get("X-Setup-Secret");

    if (!setupSecret) {
      // Logger dans Sentry
      Sentry.captureMessage("Tentative création SuperAdmin sans secret", {
        level: "warning",
        tags: { endpoint: "create-superadmin", result: "missing_secret" },
        extra: { ip },
      });

      logger.error(`❌ [SECURITY] Tentative création SuperAdmin sans secret: IP=${ip}`);
      return NextResponse.json(
        { error: "Unauthorized", message: "Header X-Setup-Secret manquant" },
        { status: 401 }
      );
    }

    if (!verifySecretConstantTime(setupSecret)) {
      // Logger dans Sentry
      Sentry.captureMessage("Tentative création SuperAdmin avec secret invalide", {
        level: "warning",
        tags: { endpoint: "create-superadmin", result: "invalid_secret" },
        extra: { ip },
      });

      logger.error(`❌ [SECURITY] Tentative création SuperAdmin avec secret invalide: IP=${ip}`);
      return NextResponse.json(
        { error: "Unauthorized", message: "Secret invalide" },
        { status: 401 }
      );
    }

    // ✅ Secret valide - continuer
    const superadminEmail = getSuperadminEmail();
    const superadminPassword = getSuperadminSetupSecret();

    if (!superadminPassword) {
      Sentry.captureMessage("SUPERADMIN_SETUP_SECRET non configuré", {
        level: "error",
        tags: { endpoint: "create-superadmin", result: "config_error" },
      });

      return NextResponse.json(
        {
          error: "Configuration error",
          message: "SUPERADMIN_SETUP_SECRET non configuré",
        },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    // 1. Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      Sentry.captureException(listError, {
        tags: { endpoint: "create-superadmin", step: "list_users" },
        extra: { ip },
      });

      return NextResponse.json(
        {
          error: "Erreur lors de la vérification des utilisateurs",
          details: listError.message,
        },
        { status: 500 }
      );
    }

    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === superadminEmail.toLowerCase()
    );

    if (existingUser) {
      // Logger la tentative de création alors que le SuperAdmin existe
      Sentry.captureMessage("Tentative création SuperAdmin alors qu'il existe déjà", {
        level: "info",
        tags: { endpoint: "create-superadmin", result: "already_exists" },
        extra: { ip, userId: existingUser.id },
      });

      return NextResponse.json({
        message: "Le SuperAdmin existe déjà",
        email: superadminEmail,
        userId: existingUser.id,
      });
    }

    // 2. Créer l'utilisateur
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: superadminEmail,
        password: superadminPassword,
        email_confirm: true, // Email déjà confirmé
        user_metadata: {
          role: "SUPERADMIN",
          first_name: "Super",
          last_name: "Admin",
        },
      });

    if (createError) {
      Sentry.captureException(createError, {
        tags: { endpoint: "create-superadmin", step: "create_user" },
        extra: { ip },
      });

      return NextResponse.json(
        {
          error: "Erreur lors de la création",
          details: createError.message,
        },
        { status: 500 }
      );
    }

    // 3. Créer le profil associé
    if (newUser.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: newUser.user.id,
        email: superadminEmail,
        first_name: "Super",
        last_name: "Admin",
        role: "ADMIN",
        company_id: null, // Pas de company pour le SuperAdmin
      });

      if (profileError) {
        Sentry.captureException(profileError, {
          tags: { endpoint: "create-superadmin", step: "create_profile" },
          extra: { ip, userId: newUser.user.id },
        });

        // On continue malgré l'erreur de profil - l'utilisateur est créé
        logger.warn("⚠️  Profil non créé, mais utilisateur SuperAdmin créé", { error: profileError instanceof Error ? profileError.message : String(profileError) });
      }
    }

    // ✅ Succès - Logger dans Sentry
    Sentry.captureMessage("SuperAdmin créé avec succès", {
      level: "info",
      tags: { endpoint: "create-superadmin", result: "success" },
      extra: { ip, userId: newUser.user?.id },
    });

    logger.info(`✅ [SECURITY] SuperAdmin créé avec succès: IP=${ip}`);

    return NextResponse.json({
      success: true,
      message: "SuperAdmin créé avec succès",
      email: superadminEmail,
      userId: newUser.user?.id,
    });
  } catch (error: any) {
    // Logger l'erreur dans Sentry
    Sentry.captureException(error, {
      tags: { endpoint: "create-superadmin", result: "exception" },
      extra: { ip },
    });

    logger.error("Error creating superadmin", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}

// GET pour vérifier si le SuperAdmin existe (nécessite aussi le secret)
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);

  try {
    // 🔐 VÉRIFICATION DU SECRET (même pour GET)
    const setupSecret = request.headers.get("X-Setup-Secret");

    if (!verifySecretConstantTime(setupSecret)) {
      Sentry.captureMessage("Tentative GET SuperAdmin avec secret invalide", {
        level: "warning",
        tags: { endpoint: "create-superadmin", method: "GET", result: "invalid_secret" },
        extra: { ip },
      });

      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Header X-Setup-Secret invalide ou manquant",
        },
        { status: 401 }
      );
    }

    const superadminEmail = getSuperadminEmail();
    const supabase = createAdminClient();

    const { data: existingUsers, error } = await supabase.auth.admin.listUsers();

    if (error) {
      Sentry.captureException(error, {
        tags: { endpoint: "create-superadmin", method: "GET", step: "list_users" },
        extra: { ip },
      });

      return NextResponse.json(
        { error: "Erreur", details: error.message },
        { status: 500 }
      );
    }

    const superAdmin = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === superadminEmail.toLowerCase()
    );

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
      message: "Le SuperAdmin n'existe pas encore. Utilisez POST pour le créer.",
    });
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { endpoint: "create-superadmin", method: "GET", result: "exception" },
      extra: { ip },
    });

    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
