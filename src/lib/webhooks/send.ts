/**
 * Webhook sender — envoie des événements signés HMAC aux endpoints configurés
 */

import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export type WebhookEvent =
  | 'vehicle.created'
  | 'vehicle.updated'
  | 'vehicle.deleted'
  | 'vehicle.regulatory_expired'
  | 'maintenance.created'
  | 'maintenance.completed'
  | 'maintenance.due'
  | 'inspection.completed'
  | 'driver.created'
  | 'driver.updated';

/**
 * Payload pour vehicle.regulatory_expired. Émis quotidiennement par le cron
 * vehicle-documents-check pour chaque véhicule entrant dans le bucket J0
 * (document expiré). Anti-doublon : une fois par expiration via la table
 * document_alert_logs (UNIQUE vehicle_id, document_type, alert_level,
 * expiry_date).
 */
export interface VehicleRegulatoryExpiredPayload {
  vehicleId: string;
  companyId: string;
  registration_number: string;
  expired_document: 'CT' | 'TACHY' | 'ATP' | 'INSURANCE' | 'ADR_CERTIFICATE';
  expiry_date: string; // YYYY-MM-DD
  days_overdue: number;
  alert_level: 'J0';
  vehicle_status: string; // statut FM actuel (non modifié en NIVEAU 2)
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Envoie un événement à tous les webhooks actifs de la company qui souscrivent à cet event.
 * @param companyId  UUID de la company
 * @param event      Nom de l'événement (ex: "vehicle.created")
 * @param data       Payload de l'événement
 */
export async function dispatchWebhook(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  const supabase = createAdminClient();

  const { data: webhooks, error } = await supabase
    .from('webhooks' as any)
    .select('id, url, secret')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .contains('events', [event]);

  if (error || !webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    (webhooks as unknown as Array<{ id: string; url: string; secret: string }>).map(
      async (webhook) => {
        const signature = createHmac('sha256', webhook.secret)
          .update(body)
          .digest('hex');

        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-FleetMaster-Signature': `sha256=${signature}`,
            'X-FleetMaster-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        // Update last triggered
        await supabase
          .from('webhooks' as any)
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', webhook.id);
      }
    )
  );

  // Log any failures (non-blocking)
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(
        `[webhook] Failed to deliver "${event}" to ${(webhooks as any[])[i]?.url}:`,
        result.reason
      );
    }
  });
}
