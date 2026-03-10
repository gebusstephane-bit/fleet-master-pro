-- ============================================================
-- MISE À JOUR DES PROFILES AVEC NOUVEAUX IDs (avec FK)
-- ============================================================

-- Les nouveaux IDs depuis le Dashboard:
-- gebus.emma@gmail.com: 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc
-- fleet.master.contact@gmail.com: 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

-- Anciens IDs:
-- gebus.emma@gmail.com: 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: dced169e-76d7-44bf-88da-82ded5f5fb05

-- 1. Mise à jour des FK AVANT les profiles
UPDATE user_appearance_settings 
SET user_id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc'
WHERE user_id = '8d29c266-4da4-4140-9e76-8e1161b81320';

UPDATE user_appearance_settings 
SET user_id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0'
WHERE user_id = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- 2. Mise à jour des profiles
UPDATE profiles 
SET id = '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc'
WHERE email = 'gebus.emma@gmail.com';

UPDATE profiles 
SET id = '9f2e3fd4-1f66-4db2-a342-a4c099a613f0'
WHERE email = 'fleet.master.contact@gmail.com';

-- 3. Vérification finale
SELECT 
    'ALIGNEMENT' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ' ELSE '❌ ERREUR' END as statut
FROM profiles p
JOIN auth.users u ON u.email = p.email
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
