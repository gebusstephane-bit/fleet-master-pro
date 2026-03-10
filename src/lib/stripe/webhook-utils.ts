/**
 * Utilitaires partagés pour le webhook Stripe
 * - WEBHOOK_PLAN_LIMITS : mapping plans → limites
 * - checkEventIdempotence : déduplication via webhook_events
 * - updateEventStatus    : mise à jour durée/erreur après traitement
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { PLAN_LIMITS, PlanType } from "@/lib/plans";

// Type étendu pour inclure webhook_events
export interface ExtendedSupabaseClient
  extends ReturnType<typeof createAdminClient> {
  from(table: "webhook_events"): any;
}

// Mapping des plans vers les limites (utilise la source de vérité centralisée)
export const WEBHOOK_PLAN_LIMITS: Record<
  PlanType,
  { maxVehicles: number; maxDrivers: number; features: string[] }
> = {
  ESSENTIAL: {
    maxVehicles: PLAN_LIMITS.ESSENTIAL.vehicleLimit,
    maxDrivers: PLAN_LIMITS.ESSENTIAL.userLimit,
    features: [
      `${PLAN_LIMITS.ESSENTIAL.vehicleLimit} véhicules maximum`,
      `${PLAN_LIMITS.ESSENTIAL.userLimit} utilisateurs`,
      "Support email (48h)",
      "Tableau de bord",
    ],
  },
  PRO: {
    maxVehicles: PLAN_LIMITS.PRO.vehicleLimit,
    maxDrivers: PLAN_LIMITS.PRO.userLimit,
    features: [
      `${PLAN_LIMITS.PRO.vehicleLimit} véhicules maximum`,
      `${PLAN_LIMITS.PRO.userLimit} utilisateurs`,
      "Support prioritaire (24h)",
      "Webhooks personnalisés",
      "Rapports avancés",
    ],
  },
  UNLIMITED: {
    maxVehicles: PLAN_LIMITS.UNLIMITED.vehicleLimit,
    maxDrivers: PLAN_LIMITS.UNLIMITED.userLimit,
    features: [
      "Véhicules illimités",
      "Utilisateurs illimités",
      "API publique complète",
      "Assistant IA réglementaire",
      "Support dédié 24/7",
      "Account manager",
    ],
  },
};

/**
 * Vérifie si un événement Stripe a déjà été traité (idempotence)
 * @returns true si l'événement est nouveau, false si déjà traité
 */
export async function checkEventIdempotence(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
  eventType: string,
  payload: any
): Promise<{ isNew: boolean; existingCreatedAt?: string }> {
  const db = supabase as ExtendedSupabaseClient;

  try {
    // Tentative d'insertion avec ON CONFLICT pour gérer les race conditions
    const { error } = await db.from("webhook_events").insert({
      stripe_event_id: eventId,
      event_type: eventType,
      payload: payload,
      processed_at: new Date().toISOString(),
    });

    if (error) {
      // Vérifier si c'est une violation de contrainte unique (event déjà existant)
      if (
        error.code === "23505" || // PostgreSQL unique_violation
        error.message?.includes("duplicate") ||
        error.message?.includes("unique constraint")
      ) {
        // Récupérer l'event existant pour logging
        const { data: existingEvents } = await db
          .from("webhook_events")
          .select("created_at")
          .eq("stripe_event_id", eventId);

        const existingCreatedAt = existingEvents?.[0]?.created_at;
        logger.info(`Event ${eventId} déjà traité`, { existingCreatedAt });
        return { isNew: false, existingCreatedAt };
      }

      // Autre erreur, on la remonte
      throw error;
    }

    // Insertion réussie, c'est un nouvel event
    return { isNew: true };
  } catch (error) {
    logger.error(
      "Erreur lors de la vérification idempotence",
      error instanceof Error ? error : new Error(String(error))
    );
    // En cas d'erreur inattendue, on considère que c'est un doublon pour être sûr
    return { isNew: false };
  }
}

/**
 * Met à jour l'event comme traité avec succès ou erreur
 */
export async function updateEventStatus(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
  updates: {
    processing_duration_ms?: number;
    processing_error?: string | null;
    retry_count?: number;
  }
): Promise<void> {
  const db = supabase as ExtendedSupabaseClient;

  try {
    await db
      .from("webhook_events")
      .update(updates)
      .eq("stripe_event_id", eventId);
  } catch (error) {
    // Ne pas faire échouer le webhook si la mise à jour du statut échoue
    logger.error(
      "Erreur mise à jour statut webhook",
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
