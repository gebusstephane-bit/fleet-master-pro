-- ============================================================
-- RÉPARATION FINALE - LES 2 USERS ORPHELINS
-- fleet.master.contact@gmail.com + gebus.emma@gmail.com
-- ============================================================

-- 1. BACKUP DES 2 PROFILS
CREATE TABLE IF NOT EXISTS backup_profiles_20260221_final AS
SELECT * FROM public.profiles WHERE 1=0;

INSERT INTO backup_profiles_20260221_final
SELECT * FROM public.profiles 
WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320')
ON CONFLICT DO NOTHING;

-- 2. VÉRIFICATION AVANT
SELECT 'AVANT CORRECTION' as etape, * FROM (
    SELECT 
        p.email,
        p.id as profile_id,
        u.id as auth_id,
        CASE 
            WHEN u.id IS NULL THEN '❌ ORPHELIN'
            WHEN u.id = p.id THEN '✅ ALIGNÉ'
            ELSE '⚠️ DIFFÉRENT'
        END as statut
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320')
) t;

-- 3. PRÉPARATION
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supprimer les anciens auth.users si existent (par email)
DELETE FROM auth.users WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 4. CRÉATION USER 1: fleet.master.contact@gmail.com
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    'dced169e-76d7-44bf-88da-82ded5f5fb05',
    'authenticated',
    'authenticated',
    'fleet.master.contact@gmail.com',
    crypt('TempPass2026!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"ADMIN"}',
    NOW(),
    NOW(),
    '', '', '', ''
);

-- 5. CRÉATION USER 2: gebus.emma@gmail.com
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '8d29c266-4da4-4140-9e76-8e1161b81320',
    'authenticated',
    'authenticated',
    'gebus.emma@gmail.com',
    crypt('TempPass2026!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"ADMIN"}',
    NOW(),
    NOW(),
    '', '', '', ''
);

-- 6. VÉRIFICATION FINALE
SELECT 'APRÈS CORRECTION' as etape, * FROM (
    SELECT 
        p.email,
        p.id as profile_id,
        u.id as auth_id,
        CASE 
            WHEN u.id IS NULL THEN '❌ ÉCHEC'
            WHEN u.id = p.id THEN '✅ ALIGNÉ PARFAIT'
            ELSE '⚠️ PROBLÈME'
        END as statut,
        p.company_id
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320')
) t;

-- 7. RÉSUMÉ DES DONNÉES PRÉSERVÉES
SELECT 
    'RÉSUMÉ' as info,
    p.email,
    p.company_id,
    c.name as company_name,
    (SELECT COUNT(*) FROM vehicles WHERE company_id = p.company_id) as vehicules,
    (SELECT COUNT(*) FROM drivers WHERE company_id = p.company_id) as chauffeurs
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');
