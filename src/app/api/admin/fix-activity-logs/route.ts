import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const FIX_SQL = `
-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS tr_log_maintenance ON maintenance_records;

-- Recréer la fonction avec le bon nom de colonne
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
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER tr_log_maintenance
    AFTER INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION tr_log_maintenance_created();
`;

export async function POST() {
  try {
    const supabase = createAdminClient();
    
    // Désactiver le trigger problématique d'abord
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: `DROP TRIGGER IF EXISTS tr_log_maintenance ON maintenance_records;`
    });
    
    if (disableError) {
      console.log('Could not disable trigger:', disableError);
    }
    
    // Essayer d'appliquer le fix complet
    const { error } = await supabase.rpc('exec_sql', { sql: FIX_SQL });
    
    if (error) {
      console.error('Fix error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        note: 'Le trigger a été désactivé pour permettre les créations de maintenance'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Trigger activity_logs corrigé!' 
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
    message: 'POST pour appliquer le fix du trigger activity_logs',
    problem: 'Le trigger tr_log_maintenance référence NEW.service_type au lieu de NEW.type',
    solution: 'Cette API corrige le trigger'
  });
}
