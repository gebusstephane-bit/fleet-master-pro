-- =====================================================
-- FIX COMPLET: Alignement ID avec toutes les FK
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
    
    RAISE NOTICE 'Mise à jour: % -> %', old_id, new_id;

    -- 1. user_appearance_settings
    UPDATE user_appearance_settings SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'user_appearance_settings: OK';

    -- 2. push_subscriptions
    UPDATE push_subscriptions SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'push_subscriptions: OK';

    -- 3. activity_logs
    UPDATE activity_logs SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'activity_logs: OK';

    -- 4. dashboards
    UPDATE dashboards SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'dashboards: OK';
    
    -- 5. Notifications (toutes les tables)
    UPDATE notifications SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'notifications: OK';
    
    UPDATE notification_preferences SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'notification_preferences: OK';
    
    UPDATE notification_settings SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'notification_settings: OK';
    
    -- 6. user_sessions
    UPDATE user_sessions SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'user_sessions: OK';
    
    -- 7. user_activity
    UPDATE user_activity SET user_id = new_id WHERE user_id = old_id;
    RAISE NOTICE 'user_activity: OK';
    
    -- 8. maintenance_records (requested_by)
    UPDATE maintenance_records SET requested_by = new_id WHERE requested_by = old_id;
    RAISE NOTICE 'maintenance_records: OK';
    
    -- 9. inspections (created_by)
    UPDATE inspections SET created_by = new_id WHERE created_by = old_id;
    RAISE NOTICE 'inspections: OK';
    
    -- 10. vehicles (créé/modifié par)
    UPDATE vehicles SET created_by = new_id WHERE created_by = old_id;
    UPDATE vehicles SET updated_by = new_id WHERE updated_by = old_id;
    RAISE NOTICE 'vehicles: OK';

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
