-- ============================================
-- FIX: Correction du trigger activity_logs pour maintenance
-- La colonne s'appelle 'type' et non 'service_type'
-- ============================================

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
        'Maintenance créée : ' || COALESCE(NEW.type, 'Entretien') || 
        CASE 
            WHEN NEW.description IS NOT NULL 
            THEN ' - ' || LEFT(NEW.description, 50)
            ELSE ''
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
CREATE TRIGGER tr_log_maintenance
    AFTER INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION tr_log_maintenance_created();

SELECT 'Trigger activity_logs corrigé!' as status;
