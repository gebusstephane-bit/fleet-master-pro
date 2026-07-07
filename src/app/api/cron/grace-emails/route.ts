/**
 * Endpoint ONE-SHOT (déclenché manuellement) — email de fin d'essai / grâce.
 *
 * Envoie un email aux essais GRATUITS expirant bientôt (grâce) les invitant à
 * souscrire avant l'échéance. Après quoi le cron check-trials les bloque.
 *
 * Cible : subscriptions status='TRIALING', sans Stripe, trial_ends_at < +8j.
 * (= la cohorte de grâce ; n'attrape pas les essais frais à 14 jours.)
 *
 * Auth : CRON_SECRET (Authorization: Bearer, x-cron-secret, ou ?secret=).
 * À déclencher UNE FOIS. Idempotent côté effet métier (ré-emaile la cohorte).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function graceEmailHtml(companyName: string, deadline: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleet-master.fr';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #0ea5e9;">Votre période d'essai FleetMaster est terminée</h2>
      <p>Bonjour${companyName ? ` ${companyName}` : ''},</p>
      <p>
        Votre essai gratuit est arrivé à échéance. Pour continuer à utiliser
        FleetMaster <strong>sans interruption</strong>, activez votre abonnement
        avant le <strong>${deadline}</strong>.
      </p>
      <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;">
          Passé ce délai, l'accès sera <strong>suspendu</strong>.
          Vos données restent conservées et seront à nouveau accessibles dès la souscription.
        </p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${appUrl}/pricing"
           style="background:#0ea5e9;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
          Choisir mon abonnement
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;">
        Une question ? Répondez simplement à cet email, notre équipe vous accompagne.
      </p>
    </div>`;
}

export async function GET(request: NextRequest) {
  // Auth CRON_SECRET (4 sources)
  const authHeader = request.headers.get('authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const secret =
    bearerSecret ||
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-vercel-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Cohorte de grâce : essais gratuits expirant sous 8 jours
  const { data: subs, error: subErr } = await admin
    .from('subscriptions')
    .select('company_id, trial_ends_at')
    .eq('status', 'TRIALING')
    .is('stripe_customer_id', null)
    .lt('trial_ends_at', cutoff);

  if (subErr) {
    logger.error('[grace-emails] Erreur lecture subscriptions', new Error(subErr.message));
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'Aucune société en grâce' });
  }

  const byCompany = new Map<string, string | null>();
  for (const s of subs) byCompany.set(s.company_id, s.trial_ends_at);

  // 2. Emails des sociétés
  const { data: companies, error: compErr } = await admin
    .from('companies')
    .select('id, name, email')
    .in('id', Array.from(byCompany.keys()));

  if (compErr) {
    logger.error('[grace-emails] Erreur lecture companies', new Error(compErr.message));
    return NextResponse.json({ error: compErr.message }, { status: 500 });
  }

  let sent = 0;
  const failures: string[] = [];

  for (const c of companies || []) {
    if (!c.email) continue;
    const rawDeadline = byCompany.get(c.id);
    const deadline = rawDeadline
      ? new Date(rawDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'prochainement';
    try {
      const res = await sendEmail({
        to: c.email,
        subject: 'Votre essai FleetMaster est terminé — activez votre abonnement',
        html: graceEmailHtml(c.name || '', deadline),
      });
      if (res?.success) sent++;
      else failures.push(c.email);
    } catch (e) {
      failures.push(c.email);
      logger.error('[grace-emails] Envoi échoué', e instanceof Error ? e : new Error(String(e)));
    }
  }

  logger.info(`[grace-emails] ${sent} email(s) envoyé(s), ${failures.length} échec(s)`);
  return NextResponse.json({
    success: true,
    sent,
    failures: failures.length > 0 ? failures : undefined,
    total: companies?.length ?? 0,
  });
}

// Autoriser aussi POST (déclenchement manuel)
export const POST = GET;
