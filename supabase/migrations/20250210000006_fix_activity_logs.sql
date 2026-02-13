-- ============================================
-- FIX ACTIVITY LOGS - Corriger la contrainte CHECK
-- ============================================

-- 1. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;

-- 2. Ajouter une contrainte plus permissive
-- Ou simplement ne pas avoir de contrainte restrictive
-- Option A: Pas de contrainte
-- (ne rien faire, la contrainte est supprimée)

-- Option B: Contrainte avec valeurs communes
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check 
CHECK (action_type IN (
    'VEHICLE_CREATED', 'VEHICLE_UPDATED', 'VEHICLE_DELETED',
    'DRIVER_CREATED', 'DRIVER_UPDATED', 'DRIVER_DELETED',
    'MAINTENANCE_CREATED', 'MAINTENANCE_COMPLETED', 'MAINTENANCE_UPDATED',
    'INSPECTION_CREATED', 'INSPECTION_COMPLETED',
    'ROUTE_CREATED', 'ROUTE_COMPLETED',
    'LOGIN', 'LOGOUT', 'SETTINGS_UPDATED',
    'TEST', 'SYSTEM', 'OTHER'
));

-- 3. Insérer un log de test avec une valeur valide
DO $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM vehicles LIMIT 1;
    SELECT id INTO v_user_id FROM profiles WHERE company_id = v_company_id LIMIT 1;
    
    IF v_company_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO activity_logs (company_id, user_id, action_type, entity_type, entity_name, description)
        VALUES (v_company_id, v_user_id, 'TEST', 'system', 'Setup', 'Configuration dashboard terminée')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✓ Log de test créé';
    END IF;
END $$;

-- 4. Vérification finale
SELECT 'Activity logs corrigé!' as status;
