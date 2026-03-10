/**
 * CRON JOB — Nettoyage des données expirées
 *
 * Exécution  : tous les jours à 2h du matin (configuré dans vercel.json)
 * Sécurité   : header x-cron-secret ou query param ?secret=
 *
 * Nettoyages effectués :
 *   - pending_registrations expirées (> expires_at)
 *
 * Test local :
 *   GET http://localhost:3000/api/cron/cleanup?secret=fleet_cron_2026_secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================================
// CONFIGURATION
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function GET(request: NextRequest) {
  // --- Authentification cron ---
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const stats = {
    pending_registrations_deleted: 0,
    errors: [] as string[],
    timestamp: new Date().toISOString(),
  };

  try {
    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Nettoyage des pending_registrations expirées
    // ═══════════════════════════════════════════════════════════════
    
    try {
      const { data: deletedRows, error: deleteError } = await supabase
        .from('pending_registrations' as any)
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (deleteError) {
        const errorMsg = `Erreur nettoyage pending_registrations: ${deleteError.message}`;
        logger.error(errorMsg);
        stats.errors.push(errorMsg);
      } else {
        stats.pending_registrations_deleted = deletedRows?.length || 0;
        logger.info(`[Cleanup] ${stats.pending_registrations_deleted} pending_registrations supprimées`);
      }
    } catch (err: any) {
      const errorMsg = `Exception pending_registrations: ${err instanceof Error ? err.message : String(err)}`;
      logger.error(errorMsg);
      stats.errors.push(errorMsg);
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 2: Futur nettoyage d'autres tables (à ajouter ici)
    // ═══════════════════════════════════════════════════════════════
    // Exemples futurs :
    // - notifications lues de plus de 90 jours
    // - logs de sessions expirées
    // - fichiers temporaires

    logger.info('Cron cleanup completed', stats);

    return NextResponse.json({
      success: true,
      ...stats,
    });

  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('Cron cleanup fatal error', { error: errorMsg });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cron job failed', 
        details: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
