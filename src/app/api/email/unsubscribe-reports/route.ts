/**
 * Unsubscribe from weekly AI fleet reports.
 * GET ?company_id=xxx → sets report_unsubscribed = true
 * Returns a simple HTML confirmation page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('company_id');

  if (!companyId) {
    return new NextResponse(htmlPage('Lien invalide', 'Le lien de désabonnement est incomplet.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const admin = createAdminClient();

    await (admin as any)
      .from('companies')
      .update({ report_unsubscribed: true })
      .eq('id', companyId);

    logger.info('[Unsubscribe] Company unsubscribed from weekly reports', {
      companyId: companyId.substring(0, 8),
    });

    return new NextResponse(
      htmlPage(
        'Désabonnement confirmé',
        'Vous ne recevrez plus les rapports hebdomadaires IA de FleetMaster Pro.<br><br>Vous pouvez vous réabonner à tout moment depuis les paramètres de votre compte.'
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    logger.error('[Unsubscribe] Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(
      htmlPage('Erreur', 'Une erreur est survenue. Veuillez réessayer.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — FleetMaster Pro</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:400px;background:#ffffff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">${title}</h1>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${message}</p>
  </div>
</body>
</html>`;
}
