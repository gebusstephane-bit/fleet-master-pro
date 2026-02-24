-- ============================================================
-- RÉPARATION ULTRA COMPLÈTE - TOUTES LES TABLES
-- ============================================================

-- Nouveaux IDs:
-- gebus.emma@gmail.com: 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc
-- fleet.master.contact@gmail.com: 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

-- Anciens IDs:
-- gebus.emma@gmail.com: 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: dced169e-76d7-44bf-88da-82ded5f5fb05

-- ============================================================
-- ÉTAPE 1: DÉSACTIVER TOUTES LES FK (toutes les tables)
-- ============================================================

-- Tables avec FK vers profiles.id
ALTER TABLE IF EXISTS user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;
ALTER TABLE IF EXISTS push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE IF EXISTS activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE IF EXISTS dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE IF EXISTS notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey;
ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS user_activity DROP CONSTRAINT IF EXISTS user_activity_user_id_fkey;

-- Tables avec FK vers profiles.id (autres colonnes)
ALTER TABLE IF EXISTS maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_requested_by_fkey;
ALTER TABLE IF EXISTS inspections DROP CONSTRAINT IF EXISTS inspections_created_by_fkey;
ALTER TABLE IF EXISTS inspections DROP CONSTRAINT IF EXISTS inspections_validated_by_fkey;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_created_by_fkey;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_updated_by_fkey;
ALTER TABLE IF EXISTS drivers DROP CONSTRAINT IF EXISTS drivers_created_by_fkey;
ALTER TABLE IF EXISTS activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- ============================================================
-- ÉTAPE 2: MISE À JOUR DES PROFILES
-- ============================================================

UPDATE profiles SET id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE email = 'gebus.emma@gmail.com';
UPDATE profiles SET id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE email = 'fleet.master.contact@gmail.com';

-- ============================================================
-- ÉTAPE 3: MISE À JOUR DE TOUTES LES TABLES (boucle DO)
-- ============================================================

DO $$
DECLARE
    old_id_1 UUID := '8d29c266-4da4-4140-9e76-8e1161b81320';
    new_id_1 UUID := '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc';
    old_id_2 UUID := 'dced169e-76d7-44bf-88da-82ded5f5fb05';
    new_id_2 UUID := '9f2e3fd4-1f66-4db2-a342-a4c099a613f0';
BEGIN
    -- user_appearance_settings
    BEGIN UPDATE user_appearance_settings SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE user_appearance_settings SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- push_subscriptions
    BEGIN UPDATE push_subscriptions SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE push_subscriptions SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- activity_logs
    BEGIN UPDATE activity_logs SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE activity_logs SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- dashboards
    BEGIN UPDATE dashboards SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE dashboards SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- notifications
    BEGIN UPDATE notifications SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE notifications SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- notification_preferences
    BEGIN UPDATE notification_preferences SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE notification_preferences SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- notification_settings
    BEGIN UPDATE notification_settings SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE notification_settings SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- user_sessions
    BEGIN UPDATE user_sessions SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE user_sessions SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- user_activity
    BEGIN UPDATE user_activity SET user_id = new_id_1 WHERE user_id = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE user_activity SET user_id = new_id_2 WHERE user_id = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- maintenance_records
    BEGIN UPDATE maintenance_records SET requested_by = new_id_1 WHERE requested_by = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE maintenance_records SET requested_by = new_id_2 WHERE requested_by = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- inspections
    BEGIN UPDATE inspections SET created_by = new_id_1 WHERE created_by = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE inspections SET created_by = new_id_2 WHERE created_by = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE inspections SET validated_by = new_id_1 WHERE validated_by = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE inspections SET validated_by = new_id_2 WHERE validated_by = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- vehicles
    BEGIN UPDATE vehicles SET created_by = new_id_1 WHERE created_by = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE vehicles SET created_by = new_id_2 WHERE created_by = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE vehicles SET updated_by = new_id_1 WHERE updated_by = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE vehicles SET updated_by = new_id_2 WHERE updated_by = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- drivers
    BEGIN UPDATE drivers SET created_by = new_id_1 WHERE created_by = old_id_1; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE drivers SET created_by = new_id_2 WHERE created_by = old_id_2; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    RAISE NOTICE 'Mise à jour de toutes les tables terminée';
END $$;

-- ============================================================
-- ÉTAPE 4: RÉACTIVER LES FK PRINCIPALES
-- ============================================================

ALTER TABLE IF EXISTS user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS maintenance_records ADD CONSTRAINT maintenance_records_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS inspections ADD CONSTRAINT inspections_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- ÉTAPE 5: VÉRIFICATION
-- ============================================================

SELECT 
    'ALIGNEMENT' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ PARFAIT' ELSE '❌ ERREUR' END as statut
FROM profiles p
JOIN auth.users u ON u.email = p.email
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
