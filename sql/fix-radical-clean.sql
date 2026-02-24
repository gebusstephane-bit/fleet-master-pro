-- ============================================================
-- RÉPARATION RADICALE - SUPPRESSION DES DONNÉES LIÉES
-- ============================================================

-- Nouveaux IDs:
-- gebus.emma@gmail.com: 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc
-- fleet.master.contact@gmail.com: 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

-- Anciens IDs:
-- gebus.emma@gmail.com: 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: dced169e-76d7-44bf-88da-82ded5f5fb05

-- ============================================================
-- ÉTAPE 1: DÉSACTIVER TOUTES LES FK
-- ============================================================
ALTER TABLE IF EXISTS user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;
ALTER TABLE IF EXISTS activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE IF EXISTS maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_requested_by_fkey;
ALTER TABLE IF EXISTS inspections DROP CONSTRAINT IF EXISTS inspections_created_by_fkey;
ALTER TABLE IF EXISTS inspections DROP CONSTRAINT IF EXISTS inspections_validated_by_fkey;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_created_by_fkey;
ALTER TABLE IF EXISTS vehicles DROP CONSTRAINT IF EXISTS vehicles_updated_by_fkey;
ALTER TABLE IF EXISTS drivers DROP CONSTRAINT IF EXISTS drivers_created_by_fkey;
ALTER TABLE IF EXISTS dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- ============================================================
-- ÉTAPE 2: SUPPRIMER TOUTES LES DONNÉES LIÉES AUX ANCIENS IDs
-- ============================================================

-- Supprimer les entrées qui vont causer des problèmes
DELETE FROM user_appearance_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM activity_logs WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM dashboards WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notifications WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notification_preferences WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notification_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM user_sessions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM user_activity WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM push_subscriptions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- Pour les tables avec SET NULL, on met à NULL au lieu de supprimer
UPDATE maintenance_records SET requested_by = NULL WHERE requested_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE inspections SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE inspections SET validated_by = NULL WHERE validated_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE vehicles SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE vehicles SET updated_by = NULL WHERE updated_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE drivers SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- ÉTAPE 3: MISE À JOUR DES PROFILES (maintenant sans obstacles)
-- ============================================================
UPDATE profiles SET id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE email = 'gebus.emma@gmail.com';
UPDATE profiles SET id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE email = 'fleet.master.contact@gmail.com';

-- ============================================================
-- ÉTAPE 4: RÉACTIVER LES CONTRAINTES FK
-- ============================================================
ALTER TABLE IF EXISTS user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS maintenance_records ADD CONSTRAINT maintenance_records_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS inspections ADD CONSTRAINT inspections_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS inspections ADD CONSTRAINT inspections_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS vehicles ADD CONSTRAINT vehicles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS drivers ADD CONSTRAINT drivers_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS dashboards ADD CONSTRAINT dashboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- ÉTAPE 5: RECRÉER DES DONNÉES PAR DÉFAUT (optionnel)
-- ============================================================

-- Recréer des entrées vides dans user_appearance_settings si nécessaire
INSERT INTO user_appearance_settings (user_id, theme, language, sidebar_collapsed, created_at, updated_at)
SELECT id, 'dark', 'fr', false, NOW(), NOW()
FROM profiles
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- ÉTAPE 6: VÉRIFICATION FINALE
-- ============================================================
SELECT 
    'ALIGNEMENT' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ PARFAIT - CONNEXION POSSIBLE' ELSE '❌ ERREUR' END as statut
FROM profiles p
JOIN auth.users u ON u.email = p.email
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
