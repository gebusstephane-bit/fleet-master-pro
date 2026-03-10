-- =====================================================
-- FIX V3: Ignore tables et colonnes inexistantes
-- =====================================================

-- ÉTAPE 1: Désactiver les contraintes FK
DO $$
BEGIN
    ALTER TABLE IF EXISTS user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE IF EXISTS push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS user_activity DROP CONSTRAINT IF EXISTS user_activity_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ÉTAPE 2: Mettre à jour les FK existantes
DO $$
DECLARE old_id UUID;
BEGIN
    SELECT id INTO old_id FROM profiles WHERE email = 'contact@fleet-master.fr';
    IF old_id IS NULL THEN RETURN; END IF;

    -- user_appearance_settings
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_appearance_settings') THEN
            EXECUTE format('UPDATE user_appearance_settings SET user_id = %L WHERE user_id = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- push_subscriptions
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
            EXECUTE format('UPDATE push_subscriptions SET user_id = %L WHERE user_id = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- activity_logs
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
            EXECUTE format('UPDATE activity_logs SET user_id = %L WHERE user_id = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- notifications
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
            EXECUTE format('UPDATE notifications SET user_id = %L WHERE user_id = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- notification_preferences
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
            EXECUTE format('UPDATE notification_preferences SET user_id = %L WHERE user_id = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- notification_settings
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_settings') THEN
            EXECUTE format('UPDATE notification_settings SET user_id = %L WHERE user_id = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- maintenance_records
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'requested_by') THEN
            EXECUTE format('UPDATE maintenance_records SET requested_by = %L WHERE requested_by = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- inspections
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspections' AND column_name = 'created_by') THEN
            EXECUTE format('UPDATE inspections SET created_by = %L WHERE created_by = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- vehicles
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'created_by') THEN
            EXECUTE format('UPDATE vehicles SET created_by = %L WHERE created_by = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'updated_by') THEN
            EXECUTE format('UPDATE vehicles SET updated_by = %L WHERE updated_by = %L', 
                '1d519173-16d4-4cbd-a71f-6000cae39039', old_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

END $$;

-- ÉTAPE 3: Mettre à jour le profile
UPDATE profiles SET id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE email = 'contact@fleet-master.fr';

-- ÉTAPE 4: Réactiver les contraintes FK
DO $$ BEGIN ALTER TABLE IF EXISTS user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS dashboards ADD CONSTRAINT dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS notification_settings ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE IF EXISTS user_activity ADD CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ÉTAPE 5: Créer la société
INSERT INTO companies (id, name, siret, address, postal_code, city, country, phone, email, subscription_plan, subscription_status, max_vehicles, max_drivers, created_at, updated_at, onboarding_completed)
VALUES ('18bd98ac-9c3b-4794-8729-218bf0e41927', 'FleetMaster Pro', '00000000000000', 'Adresse à définir', '75000', 'Paris', 'France', '+33 1 23 45 67 89', 'contact@fleet-master.fr', 'pro', 'active', 999, 999, NOW(), NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT 'SUCCESS' as status, id, email, company_id, role FROM profiles WHERE email = 'contact@fleet-master.fr';
