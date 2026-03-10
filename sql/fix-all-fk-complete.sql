-- ============================================================
-- RÉPARATION COMPLÈTE - DÉSACTIVATION DE TOUTES LES FK
-- ============================================================

-- Nouveaux IDs:
-- gebus.emma@gmail.com: 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc
-- fleet.master.contact@gmail.com: 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

-- Anciens IDs:
-- gebus.emma@gmail.com: 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: dced169e-76d7-44bf-88da-82ded5f5fb05

-- ============================================================
-- ÉTAPE 1: DÉSACTIVER TOUTES LES CONTRAINTES FK VERS PROFILES
-- ============================================================

-- user_appearance_settings
ALTER TABLE IF EXISTS user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;

-- push_subscriptions
ALTER TABLE IF EXISTS push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- activity_logs  
ALTER TABLE IF EXISTS activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- notifications
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- notification_preferences
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

-- notification_settings
ALTER TABLE IF EXISTS notification_settings DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey;

-- user_sessions
ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- user_activity
ALTER TABLE IF EXISTS user_activity DROP CONSTRAINT IF EXISTS user_activity_user_id_fkey;

-- maintenance_records (requested_by)
ALTER TABLE IF EXISTS maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_requested_by_fkey;

-- inspections (created_by)
ALTER TABLE IF EXISTS inspections DROP CONSTRAINT IF EXISTS inspections_created_by_fkey;

-- vehicles (created_by, updated_by)
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_created_by_fkey;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_updated_by_fkey;

-- dashboards
ALTER TABLE IF EXISTS dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey;

-- ============================================================
-- ÉTAPE 2: MISE À JOUR DES PROFILES
-- ============================================================

UPDATE profiles SET id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE email = 'gebus.emma@gmail.com';
UPDATE profiles SET id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE email = 'fleet.master.contact@gmail.com';

-- ============================================================
-- ÉTAPE 3: MISE À JOUR DE TOUTES LES TABLES LIÉES
-- ============================================================

-- user_appearance_settings
UPDATE user_appearance_settings SET user_id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE user_id = '8d29c266-4da4-4140-9e76-8e1161b81320';
UPDATE user_appearance_settings SET user_id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE user_id = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- maintenance_records (requested_by)
UPDATE maintenance_records SET requested_by = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE requested_by = '8d29c266-4da4-4140-9e76-8e1161b81320';
UPDATE maintenance_records SET requested_by = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE requested_by = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- inspections (created_by)
UPDATE inspections SET created_by = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE created_by = '8d29c266-4da4-4140-9e76-8e1161b81320';
UPDATE inspections SET created_by = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE created_by = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- vehicles (created_by, updated_by)
UPDATE vehicles SET created_by = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE created_by = '8d29c266-4da4-4140-9e76-8e1161b81320';
UPDATE vehicles SET created_by = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE created_by = 'dced169e-76d7-44bf-88da-82ded5f5fb05';
UPDATE vehicles SET updated_by = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE updated_by = '8d29c266-4da4-4140-9e76-8e1161b81320';
UPDATE vehicles SET updated_by = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE updated_by = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- ============================================================
-- ÉTAPE 4: RÉACTIVER LES CONTRAINTES FK
-- ============================================================

ALTER TABLE IF EXISTS user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS maintenance_records ADD CONSTRAINT maintenance_records_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS inspections ADD CONSTRAINT inspections_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT vehicles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- ÉTAPE 5: VÉRIFICATION FINALE
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
