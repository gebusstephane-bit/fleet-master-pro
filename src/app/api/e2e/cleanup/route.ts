/**
 * Route de nettoyage pour les tests E2E — DÉVELOPPEMENT UNIQUEMENT
 *
 * Supprime toutes les données créées par un test d'inscription :
 *   activity_logs → subscriptions → profiles → companies → auth.users
 *
 * SÉCURITÉ : inaccessible en production (vérification NODE_ENV stricte)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Blocage strict en production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email requis' }, { status: 400 });
  }

  console.log('[CLEANUP] Recherche user email:', email);

  const supabase = createAdminClient();

  try {
    // 1. Trouver le profil → récupérer user_id et company_id
    const { data: profile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('email', email)
      .maybeSingle();

    console.log('[CLEANUP] Profile trouvé:', profile, '| Erreur lookup:', profileLookupError);

    if (!profile) {
      console.log('[CLEANUP] Aucun profile trouvé pour', email, '— rien à supprimer');
      return NextResponse.json({ deleted: true, skipped: true });
    }

    const { id: userId, company_id: companyId } = profile;

    // 2. Supprimer dans l'ordre des dépendances FK
    if (companyId) {
      const resLogs = await supabase.from('activity_logs').delete().eq('company_id', companyId);
      console.log('[CLEANUP] Suppression activity_logs pour company_id:', companyId, '| Erreur:', resLogs.error);

      const resSubs = await supabase.from('subscriptions').delete().eq('company_id', companyId);
      console.log('[CLEANUP] Suppression subscriptions pour company_id:', companyId, '| Erreur:', resSubs.error, '| Count:', resSubs.count);
    }

    // 3. Supprimer le profil (avant de supprimer auth.user pour éviter FK)
    const resProfile = await supabase.from('profiles').delete().eq('id', userId);
    console.log('[CLEANUP] Suppression profile id:', userId, '| Erreur:', resProfile.error);

    // 4. Supprimer la company
    if (companyId) {
      const resCompany = await supabase.from('companies').delete().eq('id', companyId);
      console.log('[CLEANUP] Suppression company id:', companyId, '| Erreur:', resCompany.error);
    }

    // 5. Supprimer l'utilisateur Supabase Auth (admin)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    console.log('[CLEANUP] Suppression auth user id:', userId, '| Erreur:', authDeleteError);

    console.log('[CLEANUP] Terminé avec succès pour', email);
    return NextResponse.json({ deleted: true, email, userId, companyId });
  } catch (err: any) {
    console.error('[CLEANUP] Exception non gérée:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Cleanup failed' },
      { status: 500 }
    );
  }
}
