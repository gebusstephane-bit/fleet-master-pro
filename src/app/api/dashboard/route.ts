import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from '@/lib/logger';

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Créer un client Supabase avec les cookies de la requête
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {}, // Pas besoin de setter dans une API route GET
          remove() {},
        },
      }
    );
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error("API Dashboard: Non authentifié", { error: authError?.message || 'Unknown auth error' });
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    
    // Récupérer le company_id avec l'admin client (depuis profiles)
    const adminClient = createAdminClient();
    let { data: userData, error: userError } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData?.company_id) {
      logger.error("API Dashboard: Pas de company_id dans profiles", { error: userError?.message || 'Unknown error' });
      // Essayer dans users comme fallback
      const { data: userData2, error: userError2 } = await adminClient
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (userError2 || !userData2?.company_id) {
        logger.error("API Dashboard: Pas de company_id dans users non plus", { error: userError2?.message || 'Unknown error' });
        return NextResponse.json({ error: "Pas de company_id" }, { status: 400 });
      }
      
      userData = userData2 as any;
    }
    
    const companyId = (userData as any).company_id;
    // Company ID récupéré pour le dashboard
    
    const results = {
      vehicles: { total: 0, active: 0 },
      drivers: 0,
      alerts: 0,
      routes: 0
    };
    
    // Véhicules
    const { data: vehicles, error: vError } = await adminClient
      .from("vehicles")
      .select("id, status")
      .eq("company_id", companyId);
    
    if (vError) {
      logger.error("API Dashboard: Erreur véhicules", { error: vError instanceof Error ? vError.message : String(vError) });
    } else {
      (results as any).vehicles.total = vehicles?.length || 0;
      (results as any).vehicles.active = vehicles?.filter(v => v.status === "active").length || 0;
      logger.info("API Dashboard: Véhicules", { total: results.vehicles.total });
    }
    
    // Chauffeurs
    const { data: drivers, error: dError } = await adminClient
      .from("drivers")
      .select("id")
      .eq("company_id", companyId);
    
    if (dError) {
      logger.error("API Dashboard: Erreur chauffeurs", { error: dError instanceof Error ? dError.message : String(dError) });
    } else {
      (results as any).drivers = drivers?.length || 0;
      logger.info("API Dashboard: Chauffeurs", { total: results.drivers });
    }
    
    // Alertes
    const { data: alerts, error: aError } = await adminClient
      .from("alerts")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_read", false);
    
    if (aError) {
      logger.error("API Dashboard: Erreur alertes", { error: aError instanceof Error ? aError.message : String(aError) });
    } else {
      (results as any).alerts = alerts?.length || 0;
    }
    
    // Tournées aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const { data: routes, error: rError } = await adminClient
      .from("routes")
      .select("id")
      .eq("company_id", companyId)
      .eq("route_date", today);
    
    if (rError) {
      logger.error("API Dashboard: Erreur routes", { error: rError instanceof Error ? rError.message : String(rError) });
    } else {
      (results as any).routes = routes?.length || 0;
    }
    
    logger.info("API Dashboard: Résultat", { results });
    return NextResponse.json({ data: results });
    
  } catch (e) {
    logger.error("API Dashboard: Exception", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
