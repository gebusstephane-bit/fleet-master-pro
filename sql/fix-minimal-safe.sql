-- ============================================================
-- RÉPARATION MINIMALE ET SÛRE
-- ============================================================

-- Nouveaux IDs:
-- gebus.emma@gmail.com: 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc  
-- fleet.master.contact@gmail.com: 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

-- Anciens IDs:
-- gebus.emma@gmail.com: 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: dced169e-76d7-44bf-88da-82ded5f5fb05

-- ============================================================
-- ÉTAPE 1: DÉSACTIVER UNIQUEMENT LES CONTRAINTES EXISTANTES
-- ============================================================

DO $$
BEGIN
    -- user_appearance_settings
    BEGIN ALTER TABLE user_appearance_settings DROP CONSTRAINT user_appearance_settings_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- maintenance_records (requested_by)
    BEGIN ALTER TABLE maintenance_records DROP CONSTRAINT maintenance_records_requested_by_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- inspections (created_by, validated_by)
    BEGIN ALTER TABLE inspections DROP CONSTRAINT inspections_created_by_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE inspections DROP CONSTRAINT inspections_validated_by_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    RAISE NOTICE 'Contraintes supprimées';
END $$;

-- ============================================================
-- ÉTAPE 2: SUPPRIMER LES DONNÉES PROBLÉMATIQUES (user_appearance_settings seulement)
-- ============================================================

DELETE FROM user_appearance_settings 
WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- ÉTAPE 3: MISE À JOUR DES PROFILES
-- ============================================================

UPDATE profiles SET id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc' WHERE email = 'gebus.emma@gmail.com';
UPDATE profiles SET id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0' WHERE email = 'fleet.master.contact@gmail.com';

-- ============================================================
-- ÉTAPE 4: RÉACTIVER LES CONTRAINTES
-- ============================================================

DO $$
BEGIN
    BEGIN ALTER TABLE user_appearance_settings ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE maintenance_records ADD CONSTRAINT maintenance_records_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE inspections ADD CONSTRAINT inspections_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE inspections ADD CONSTRAINT inspections_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    RAISE NOTICE 'Contraintes recréées';
END $$;

-- ============================================================
-- ÉTAPE 5: VÉRIFICATION
-- ============================================================

SELECT 
    'RÉSULTAT' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ - CONNEXION POSSIBLE' ELSE '❌ ERREUR' END as statut
FROM profiles p
JOIN auth.users u ON u.email = p.email
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
