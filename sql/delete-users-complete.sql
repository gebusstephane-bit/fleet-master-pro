-- ============================================================
-- SUPPRESSION COMPLÈTE - 2 USERS TEST + TOUTES LEURS DONNÉES
-- gebus.emma@gmail.com + fleet.master.contact@gmail.com
-- ============================================================

-- ============================================================
-- ÉTAPE 0: RÉCUPÉRER LES COMPANY_ID AVANT SUPPRESSION
-- ============================================================
DO $$
DECLARE
    company_id_1 UUID;
    company_id_2 UUID;
    old_id_1 UUID := '8d29c266-4da4-4140-9e76-8e1161b81320';
    old_id_2 UUID := 'dced169e-76d7-44bf-88da-82ded5f5fb05';
BEGIN
    SELECT company_id INTO company_id_1 FROM profiles WHERE id = old_id_1;
    SELECT company_id INTO company_id_2 FROM profiles WHERE id = old_id_2;
    
    RAISE NOTICE 'Company ID gebus.emma: %', company_id_1;
    RAISE NOTICE 'Company ID fleet.master: %', company_id_2;
END $$;

-- ============================================================
-- ÉTAPE 1: SUPPRESSION DES DONNÉES DANS L'ORDRE (FILLES D'ABORD)
-- ============================================================

-- 1.1 Tables avec FK user_id vers profiles
DELETE FROM user_appearance_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM push_subscriptions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM activity_logs WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM dashboards WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notifications WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notification_preferences WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM notification_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM user_sessions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM user_activity WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- 1.2 Tables avec FK vers profiles (autres colonnes)
-- Mettre à NULL pour éviter les violations FK
UPDATE maintenance_records SET requested_by = NULL WHERE requested_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE inspections SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE inspections SET validated_by = NULL WHERE validated_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE vehicles SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE vehicles SET updated_by = NULL WHERE updated_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
UPDATE drivers SET created_by = NULL WHERE created_by IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- ÉTAPE 2: SUPPRESSION DES AUTH.IDENTITIES ET AUTH.USERS
-- ============================================================
DELETE FROM auth.identities WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM auth.users WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- ÉTAPE 3: SUPPRESSION DES PROFILES
-- ============================================================
DELETE FROM profiles WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');

-- ============================================================
-- ÉTAPE 4: SUPPRESSION DES COMPANIES (si elles n'ont plus d'autres users)
-- ============================================================
-- Récupérer les company_id avant suppression
DO $$
DECLARE
    company_id_1 UUID := 'ea41ff8c-3aee-41f7-9537-c5282c7dc0e2';  -- Remplacer par le vrai ID
    company_id_2 UUID := '30123528-9e4e-4b34-804c-4f63a691be72';  -- Remplacer par le vrai ID
    count_1 INT;
    count_2 INT;
BEGIN
    -- Compter les users restants par company
    SELECT COUNT(*) INTO count_1 FROM profiles WHERE company_id = company_id_1;
    SELECT COUNT(*) INTO count_2 FROM profiles WHERE company_id = company_id_2;
    
    RAISE NOTICE 'Users restants company 1: %', count_1;
    RAISE NOTICE 'Users restants company 2: %', count_2;
    
    -- Si 0 users, supprimer la company
    IF count_1 = 0 THEN
        DELETE FROM companies WHERE id = company_id_1;
        RAISE NOTICE 'Company 1 supprimée';
    END IF;
    
    IF count_2 = 0 THEN
        DELETE FROM companies WHERE id = company_id_2;
        RAISE NOTICE 'Company 2 supprimée';
    END IF;
END $$;

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================

SELECT 'VÉRIFICATION SUPPRESSION' as etape;

-- Vérifier que les users sont bien supprimés
SELECT 
    'Auth users restants' as check_type,
    COUNT(*) as count
FROM auth.users 
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')

UNION ALL

-- Vérifier que les profiles sont supprimés
SELECT 
    'Profiles restants',
    COUNT(*)
FROM profiles 
WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')

UNION ALL

-- Vérifier les companies restantes
SELECT 
    'Companies avec ces emails',
    COUNT(*)
FROM companies c
WHERE c.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');

-- ============================================================
-- RÉSULTAT ATTENDU: Tous les counts = 0
-- ============================================================
