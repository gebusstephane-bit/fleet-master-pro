-- ============================================================
-- SUPPRESSION COMPLÈTE - 2 USERS TEST
-- gebus.emma@gmail.com + fleet.master.contact@gmail.com
-- ============================================================

-- IDs des users à supprimer
-- gebus.emma@gmail.com: 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: dced169e-76d7-44bf-88da-82ded5f5fb05

-- ============================================================
-- ÉTAPE 1: SUPPRESSION DES DONNÉES LIÉES AUX PROFILES
-- ============================================================

-- Supprimer toutes les entrées liées à ces user_id
DELETE FROM user_appearance_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM push_subscriptions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM activity_logs WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM dashboards WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notifications WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notification_preferences WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notification_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM user_sessions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM user_activity WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- Mettre à NULL les références dans les tables historiques
UPDATE maintenance_records SET requested_by = NULL WHERE requested_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE inspections SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE inspections SET validated_by = NULL WHERE validated_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE vehicles SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE vehicles SET updated_by = NULL WHERE updated_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE drivers SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- ÉTAPE 2: SUPPRESSION AUTH
-- ============================================================
DELETE FROM auth.identities WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM auth.users WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- ÉTAPE 3: SUPPRESSION DES PROFILES
-- ============================================================
DELETE FROM profiles WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 'SUPRESSION TERMINÉE' as status;

-- Vérifier que tout est supprimé
SELECT 
    'Auth users' as type, COUNT(*) as count FROM auth.users WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')
UNION ALL
SELECT 'User appearance', COUNT(*) FROM user_appearance_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- RÉSULTAT ATTENDU: Tous les counts = 0
-- ============================================================
-- ENSUITE: Créer les users via Dashboard Supabase
-- 1. Authentication → Users → Add user
-- 2. Email: gebus.emma@gmail.com / Password: TempPass2026!
-- 3. Email: fleet.master.contact@gmail.com / Password: TempPass2026!
-- ============================================================
