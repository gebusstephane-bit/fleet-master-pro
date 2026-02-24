-- =====================================================
-- FIX V2: Ignore les tables inexistantes
-- =====================================================

-- ÉTAPE 1: Désactiver les contraintes FK (avec IF EXISTS)
DO $$
BEGIN
    ALTER TABLE IF EXISTS user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;
    ALTER TABLE IF EXISTS push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
    ALTER TABLE IF EXISTS activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    ALTER TABLE IF EXISTS dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey;
    ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
    ALTER TABLE IF EXISTS notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey;
    ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
    ALTER TABLE IF EXISTS user_activity DROP CONSTRAINT IF EXISTS user_activity_user_id_fkey;
END $$;

-- ÉTAPE 2: Mettre à jour les FK existantes uniquement
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_appearance_settings') THEN
        UPDATE user_appearance_settings SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
        UPDATE push_subscriptions SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        UPDATE activity_logs SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboards') THEN
        UPDATE dashboards SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        UPDATE notifications SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        UPDATE notification_preferences SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_settings') THEN
        UPDATE notification_settings SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        UPDATE user_sessions SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity') THEN
        UPDATE user_activity SET user_id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE user_id = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
        UPDATE maintenance_records SET requested_by = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE requested_by = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections') THEN
        UPDATE inspections SET created_by = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE created_by = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
        UPDATE vehicles SET created_by = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE created_by = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
        UPDATE vehicles SET updated_by = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE updated_by = (SELECT id FROM profiles WHERE email = 'contact@fleet-master.fr');
    END IF;
END $$;

-- ÉTAPE 3: Mettre à jour le profile
UPDATE profiles SET id = '1d519173-16d4-4cbd-a71f-6000cae39039' WHERE email = 'contact@fleet-master.fr';

-- ÉTAPE 4: Réactiver les contraintes FK (si tables existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_appearance_settings') THEN
        ALTER TABLE user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
        ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboards') THEN
        ALTER TABLE dashboards ADD CONSTRAINT dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_settings') THEN
        ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity') THEN
        ALTER TABLE user_activity ADD CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ÉTAPE 5: Créer la société
INSERT INTO companies (id, name, siret, address, postal_code, city, country, phone, email, subscription_plan, subscription_status, max_vehicles, max_drivers, created_at, updated_at, onboarding_completed)
VALUES ('18bd98ac-9c3b-4794-8729-218bf0e41927', 'FleetMaster Pro', '00000000000000', 'Adresse à définir', '75000', 'Paris', 'France', '+33 1 23 45 67 89', 'contact@fleet-master.fr', 'pro', 'active', 999, 999, NOW(), NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT 'SUCCESS' as status, id, email, company_id, role FROM profiles WHERE email = 'contact@fleet-master.fr';
