/**
 * ENDPOINT TEMPORAIRE - Réinitialisation mot de passe via Admin API
 * Protégé par SUPERADMIN_SETUP_SECRET
 * À supprimer après usage ou garder pour le support
 *
 * 🔒 SÉCURITÉ:
 * - Vérification du secret via crypto.timingSafeEqual() (protection timing attack)
 * - Rate limiting: max 3 tentatives / heure par IP (via middleware)
 * - Authentification SuperAdmin requise (via middleware)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual } from "crypto";
import { logger } from '@/lib/logger';

/**
 * Vérifie le secret de manière constant-time (protection timing attack).
 *
 * Sécurité (M3) : utilise un secret DÉDIÉ `ADMIN_RESET_SECRET` s'il est défini,
 * sinon retombe sur `SUPERADMIN_SETUP_SECRET` (rétrocompatible). Définir
 * ADMIN_RESET_SECRET dissocie ce endpoint du secret de setup superadmin : une
 * fuite de SUPERADMIN_SETUP_SECRET ne permet alors plus de reset arbitraire.
 *
 * @param providedSecret - Le secret fourni dans le header
 * @returns boolean - true si le secret est valide
 */
function verifySecretConstantTime(providedSecret: string | null): boolean {
  const expectedSecret =
    process.env.ADMIN_RESET_SECRET || process.env.SUPERADMIN_SETUP_SECRET;

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

export async function POST(request: NextRequest) {
  // 🔐 VÉRIFICATION DU SECRET (protection timing attack)
  const secret = request.headers.get("x-admin-secret");

  if (!verifySecretConstantTime(secret)) {
    // Logger la tentative échouée (sans le secret)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    logger.warn(`[SECURITY] Tentative accès non autorisé reset-user-password: IP=${ip}`);

    return NextResponse.json(
      { error: "Unauthorized", message: "Secret invalide ou manquant" },
      { status: 401 }
    );
  }

  const { email, newPassword } = await request.json();

  if (!email || !newPassword) {
    return NextResponse.json(
      { error: "email and newPassword required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Trouver l'utilisateur par email
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json(
      { error: listError.message },
      { status: 500 }
    );
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Mettre à jour le mot de passe
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      password: newPassword,
    }
  );

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  // Logger le succès (sans données sensibles)
  logger.info(`[SECURITY] Mot de passe réinitialisé pour: ${email}`);

  return NextResponse.json({
    success: true,
    message: `Password updated for ${email}`,
  });
}

export const dynamic = "force-dynamic";
