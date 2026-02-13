import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createAdminClient();
    
    // Supprimer TOUS les triggers problématiques sur maintenance_records
    const sql = `
      -- Supprimer le trigger problématique
      DROP TRIGGER IF EXISTS tr_log_maintenance ON maintenance_records;
      
      -- Supprimer aussi l'ancienne fonction si elle existe
      DROP FUNCTION IF EXISTS tr_log_maintenance_created() CASCADE;
      
      -- Recréer une fonction corrigée sans service_type
      CREATE OR REPLACE FUNCTION tr_log_maintenance_created()
      RETURNS TRIGGER AS $$
      DECLARE
          v_company_id UUID;
          v_vehicle_name TEXT;
      BEGIN
          -- Récupérer company_id du véhicule
          SELECT company_id, registration_number 
          INTO v_company_id, v_vehicle_name
          FROM vehicles WHERE id = NEW.vehicle_id;
          
          PERFORM log_activity(
              v_company_id,
              auth.uid(),
              'MAINTENANCE_CREATED',
              'maintenance',
              NEW.id,
              v_vehicle_name,
              'Maintenance créée : ' || COALESCE(NEW.type, 'Entretien')
          );
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Recréer le trigger avec la fonction corrigée
      CREATE TRIGGER tr_log_maintenance
          AFTER INSERT ON maintenance_records
          FOR EACH ROW
          EXECUTE FUNCTION tr_log_maintenance_created();
    `;
    
    // Essayer d'exécuter via RPC exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('exec_sql error:', error);
      
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        message: 'Impossible de modifier les triggers via RPC. Vous devez exécuter la migration SQL manuellement dans le dashboard Supabase.',
        sql_to_execute: sql
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Triggers corrigés avec succès!'
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST pour supprimer/corriger les triggers problématiques',
    problem: 'Le trigger tr_log_maintenance référence NEW.service_type au lieu de NEW.type',
    solution: 'Cette API tente de supprimer et recréer le trigger corrigé'
  });
}
