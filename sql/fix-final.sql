-- =====================================================
-- FIX FINAL: Nettoyage des FK orphelines + Alignement ID
-- =====================================================

DO $$
DECLARE
    old_id UUID;
    new_id UUID := '1d519173-16d4-4cbd-a71f-6000cae39039'::UUID;
BEGIN
    -- Récupérer l'ancien ID
    SELECT id INTO old_id FROM profiles WHERE email = 'contact@fleet-master.fr';
    
    IF old_id IS NULL THEN
        RAISE EXCEPTION 'Profile non trouvé';
    END IF;
    
    IF old_id = new_id THEN
        RAISE NOTICE 'ID déjà aligné';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Nettoyage FK orphelines puis mise à jour: % -> %', old_id, new_id;

    -- NETTOYAGE: Supprimer les entrées orphelines dans user_appearance_settings
    -- (lignes qui référencent des user_id qui n'existent pas dans profiles)
    DELETE FROM user_appearance_settings 
    WHERE user_id = new_id 
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
    RAISE NOTICE 'user_appearance_settings: orphelines supprimées';

    -- 1. user_appearance_settings
    BEGIN
        UPDATE user_appearance_settings SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'user_appearance_settings: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'user_appearance_settings: table inexistante';
    END;

    -- 2. push_subscriptions
    BEGIN
        DELETE FROM push_subscriptions WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE push_subscriptions SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'push_subscriptions: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'push_subscriptions: table inexistante';
    END;

    -- 3. activity_logs
    BEGIN
        DELETE FROM activity_logs WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE activity_logs SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'activity_logs: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'activity_logs: table inexistante';
    END;

    -- 4. dashboards
    BEGIN
        DELETE FROM dashboards WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE dashboards SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'dashboards: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'dashboards: table inexistante';
    END;
    
    -- 5. Notifications
    BEGIN
        DELETE FROM notifications WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE notifications SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'notifications: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'notifications: table inexistante';
    END;
    
    BEGIN
        DELETE FROM notification_preferences WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE notification_preferences SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'notification_preferences: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'notification_preferences: table inexistante';
    END;
    
    BEGIN
        DELETE FROM notification_settings WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE notification_settings SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'notification_settings: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'notification_settings: table inexistante';
    END;
    
    -- 6. user_sessions
    BEGIN
        DELETE FROM user_sessions WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE user_sessions SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'user_sessions: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'user_sessions: table inexistante';
    END;
    
    -- 7. user_activity
    BEGIN
        DELETE FROM user_activity WHERE user_id = new_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = new_id);
        UPDATE user_activity SET user_id = new_id WHERE user_id = old_id;
        RAISE NOTICE 'user_activity: OK';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'user_activity: table inexistante';
    END;
    
    -- 8. maintenance_records (requested_by)
    BEGIN
        UPDATE maintenance_records SET requested_by = new_id WHERE requested_by = old_id;
        RAISE NOTICE 'maintenance_records: OK';
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        RAISE NOTICE 'maintenance_records: table/colonne inexistante';
    END;
    
    -- 9. inspections (created_by)
    BEGIN
        UPDATE inspections SET created_by = new_id WHERE created_by = old_id;
        RAISE NOTICE 'inspections: OK';
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        RAISE NOTICE 'inspections: table/colonne inexistante';
    END;
    
    -- 10. vehicles
    BEGIN
        UPDATE vehicles SET created_by = new_id WHERE created_by = old_id;
        RAISE NOTICE 'vehicles created_by: OK';
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        RAISE NOTICE 'vehicles created_by: table/colonne inexistante';
    END;
    
    BEGIN
        UPDATE vehicles SET updated_by = new_id WHERE updated_by = old_id;
        RAISE NOTICE 'vehicles updated_by: OK';
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        RAISE NOTICE 'vehicles updated_by: table/colonne inexistante';
    END;

    -- FIN: Mettre à jour le profile
    UPDATE profiles SET id = new_id WHERE id = old_id;
    RAISE NOTICE 'profile: OK - ID aligné';
    
END $$;

-- Créer la société si elle n'existe pas
INSERT INTO companies (id, name, siret, address, postal_code, city, country, phone, email, subscription_plan, subscription_status, max_vehicles, max_drivers, created_at, updated_at, onboarding_completed)
VALUES ('18bd98ac-9c3b-4794-8729-218bf0e41927', 'FleetMaster Pro', '00000000000000', 'Adresse à définir', '75000', 'Paris', 'France', '+33 1 23 45 67 89', 'contact@fleet-master.fr', 'pro', 'active', 999, 999, NOW(), NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- Vérification finale
SELECT 'SUCCESS' as status, id, email, company_id, role FROM profiles WHERE email = 'contact@fleet-master.fr';
