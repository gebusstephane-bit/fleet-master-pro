-- ============================================
-- FIX FINAL: Correction du trigger maintenance
-- À exécuter manuellement dans Supabase Dashboard si nécessaire
-- ============================================

-- Supprimer le trigger problématique
DROP TRIGGER IF EXISTS tr_log_maintenance ON maintenance_records;

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS tr_log_maintenance_created() CASCADE;

-- Recréer la fonction corrigée (avec NEW.type au lieu de NEW.service_type)
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

-- Recréer le trigger
CREATE TRIGGER tr_log_maintenance
    AFTER INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION tr_log_maintenance_created();

-- Vérification
SELECT 'Trigger tr_log_maintenance corrigé avec succès!' as status;
