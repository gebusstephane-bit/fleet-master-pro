-- ============================================================
-- RÉPARATION URGENTE - 2 PROFILS ORPHELINS
-- Date: 2026-02-21
-- Users: fleet.master.contact@gmail.com + gebus.emma@gmail.com
-- ============================================================

-- ============================================================
-- PHASE 1: BACKUP DE SÉCURITÉ
-- ============================================================

-- Créer la table de backup si elle n'existe pas
CREATE TABLE IF NOT EXISTS backup_profiles_orphelins_20260221 AS
SELECT * FROM public.profiles WHERE 1=0;

-- Backup des 2 profils concernés
INSERT INTO backup_profiles_orphelins_20260221
SELECT * FROM public.profiles 
WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320')
ON CONFLICT DO NOTHING;

-- Vérification du backup
SELECT 'PHASE 1 - BACKUP' as phase, 
       COUNT(*) as nb_profils_backup,
       STRING_AGG(email, ', ') as emails
FROM backup_profiles_orphelins_20260221;

-- ============================================================
-- PHASE 2: VÉRIFICATION DES DONNÉES LIÉES
-- ============================================================

-- Récupérer les company_id des profils
DO $$
DECLARE
    v_company_id_1 UUID;
    v_company_id_2 UUID;
    v_email_1 TEXT := 'fleet.master.contact@gmail.com';
    v_email_2 TEXT := 'gebus.emma@gmail.com';
BEGIN
    SELECT company_id INTO v_company_id_1 FROM profiles WHERE id = 'dced169e-76d7-44bf-88da-82ded5f5fb05';
    SELECT company_id INTO v_company_id_2 FROM profiles WHERE id = '8d29c266-4da4-4140-9e76-8e1161b81320';
    
    RAISE NOTICE 'Company ID pour %: %', v_email_1, v_company_id_1;
    RAISE NOTICE 'Company ID pour %: %', v_email_2, v_company_id_2;
END $$;

-- Afficher les données liées
SELECT 'PHASE 2 - DONNÉES LIÉES' as phase;

-- Vérifier si les entreprises existent
SELECT 
    'Entreprises' as type,
    c.id,
    c.name,
    c.subscription_status,
    p.email as owner_email
FROM companies c
JOIN profiles p ON p.company_id = c.id
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- Vérifier les véhicules
SELECT 
    'Véhicules' as type,
    p.email as owner,
    COUNT(v.id) as nb_vehicules
FROM profiles p
LEFT JOIN vehicles v ON v.company_id = p.company_id
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320')
GROUP BY p.email;

-- ============================================================
-- PHASE 3: CRÉATION DES COMPTES AUTH.USERS (MÉTHODE SQL)
-- ============================================================

-- Installer l'extension pgcrypto si nécessaire
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Vérifier si les users auth existent déjà
SELECT 'PHASE 3 - VÉRIFICATION AUTH' as phase;

SELECT 
    au.id as auth_id,
    au.email,
    au.created_at,
    CASE 
        WHEN au.id = 'dced169e-76d7-44bf-88da-82ded5f5fb05' THEN 'fleet.master.contact@gmail.com'
        WHEN au.id = '8d29c266-4da4-4140-9e76-8e1161b81320' THEN 'gebus.emma@gmail.com'
        ELSE 'autre'
    END as correspondance
FROM auth.users au
WHERE au.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
   OR au.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- ============================================================
-- TENTATIVE DE CRÉATION DES USERS AUTH (avec ID exact)
-- ============================================================

-- User 1: fleet.master.contact@gmail.com
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    'dced169e-76d7-44bf-88da-82ded5f5fb05',
    'authenticated',
    'authenticated',
    'fleet.master.contact@gmail.com',
    crypt('TempPass2026!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"ADMIN"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = NOW();

-- User 2: gebus.emma@gmail.com  
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '8d29c266-4da4-4140-9e76-8e1161b81320',
    'authenticated',
    'authenticated',
    'gebus.emma@gmail.com',
    crypt('TempPass2026!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"ADMIN"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = NOW();

-- ============================================================
-- PHASE 4: VÉRIFICATION FINALE
-- ============================================================

SELECT 'PHASE 4 - VÉRIFICATION' as phase;

SELECT 
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    p.company_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ STILL ORPHELIN'
        WHEN u.id = p.id THEN '✅ ALIGNÉ PARFAIT'
        ELSE '⚠️ IDS DIFFÉRENTS'
    END as statut
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- ============================================================
-- RÉSULTAT ATTENDU
-- ============================================================
-- Statut: "✅ ALIGNÉ PARFAIT" pour les 2 users
-- Mot de passe temporaire: TempPass2026!
-- ============================================================
