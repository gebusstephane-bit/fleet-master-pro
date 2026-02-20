/**
 * Configuration VAPID pour Web Push
 * Les clés doivent être générées une seule fois et stockées dans les env vars.
 * Génération : node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys(),null,2))"
 */

export const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
export const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:contact@fleet-master.fr';

/**
 * Vérifie que les clés VAPID sont configurées (server-side only)
 */
export function assertVapidConfigured(): void {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error(
      '[Push] VAPID keys manquantes. Ajouter NEXT_PUBLIC_VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans .env.local'
    );
  }
}
