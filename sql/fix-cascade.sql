-- =====================================================
-- FIX CASCADE: Désactivation temporaire des FK + Alignement ID
-- =====================================================

DO $$
DECLARE
    old_id UUID;
    new_id UUID := '1d519173-16d4-4cbd-a71f-6000cae39039'::UUID;
BEGIN
    SELECT id INTO old_id FROM profiles WHERE email = 'contact@fleet-master.fr';
    IF old_id IS NULL THEN RAISE EXCEPTION 'Profile non trouvé'; END IF;
    IF old_id = new_id THEN RAISE NOTICE 'ID déjà aligné'; RETURN; END IF;

    RAISE NOTICE 'Désactivation des contraintes FK...';
    
    -- Désactiver les contraintes FK (elles seront réactivées après)
    ALTER TABLE user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;
    ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
    ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    ALTER TABLE dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey;
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
    ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey;
    ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
    ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_user_id_fkey;
    
    RAISE NOTICE 'Mise à jour des IDs...';

    -- MISE À JOUR des FK
    UPDATE user_appearance_settings SET user_id = new_id WHERE user_id = old_id;
    UPDATE push_subscriptions SET user_id = new_id WHERE user_id = old_id;
    UPDATE activity_logs SET user_id = new_id WHERE user_id = old_id;
    UPDATE dashboards SET user_id = new_id WHERE user_id = old_id;
    UPDATE notifications SET user_id = new_id WHERE user_id = old_id;
    UPDATE notification_preferences SET user_id = new_id WHERE user_id = old_id;
    UPDATE notification_settings SET user_id = new_id WHERE user_id = old_id;
    UPDATE user_sessions SET user_id = new_id WHERE user_id = old_id;
    UPDATE user_activity SET user_id = new_id WHERE user_id = old_id;
    UPDATE maintenance_records SET requested_by = new_id WHERE requested_by = old_id;
    UPDATE inspections SET created_by = new_id WHERE created_by = old_id;
    UPDATE vehicles SET created_by = new_id WHERE created_by = old_id;
    UPDATE vehicles SET updated_by = new_id WHERE updated_by = old_id;

    -- FIN: Mettre à jour le profile
    UPDATE profiles SET id = new_id WHERE id = old_id;
    
    RAISE NOTICE 'Réactivation des contraintes FK...';
    
    -- Réactiver les contraintes FK
    ALTER TABLE user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    ALTER TABLE dashboards ADD CONSTRAINT dashboards_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE user_activity ADD CONSTRAINT user_activity_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Terminé!';
END $$;

-- Créer la société si elle n'existe pas
INSERT INTO companies (id, name, siret, address, postal_code, city, country, phone, email, subscription_plan, subscription_status, max_vehicles, max_drivers, created_at, updated_at, onboarding_completed)
VALUES ('18bd98ac-9c3b-4794-8729-218bf0e41927', 'FleetMaster Pro', '00000000000000', 'Adresse à définir', '75000', 'Paris', 'France', '+33 1 23 45 67 89', 'contact@fleet-master.fr', 'pro', 'active', 999, 999, NOW(), NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- Vérification finale
SELECT 'SUCCESS' as status, id, email, company_id, role FROM profiles WHERE email = 'contact@fleet-master.fr';
