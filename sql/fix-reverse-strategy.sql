-- ============================================================
-- STRATÉGIE INVERSE : Modifier auth.users pour matcher profiles
-- ============================================================

-- Profiles existants (avec leurs IDs):
-- gebus.emma@gmail.com: profile.id = 8d29c266-4da4-4140-9e76-8e1161b81320
-- fleet.master.contact@gmail.com: profile.id = dced169e-76d7-44bf-88da-82ded5f5fb05

-- Auth.users créés via Dashboard (à supprimer):
-- gebus.emma@gmail.com: auth.id = 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc
-- fleet.master.contact@gmail.com: auth.id = 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

-- ============================================================
-- ÉTAPE 1: SUPPRIMER LES AUTH.USERS CRÉÉS VIA DASHBOARD
-- ============================================================

-- Supprimer d'abord les identities liées aux nouveaux IDs
DELETE FROM auth.identities 
WHERE user_id IN (
    '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc',
    '9f2e3fd4-1f66-4db2-a342-a4c099a613f0'
);

-- Supprimer les auth.users créés via Dashboard
DELETE FROM auth.users 
WHERE id IN (
    '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc',
    '9f2e3fd4-1f66-4db2-a342-a4c099a613f0'
);

SELECT 'AUTH.USERS SUPPRIMÉS' as statut;

-- ============================================================
-- ÉTAPE 2: CRÉER LES AUTH.USERS AVEC LES ANCIENS IDs (ceux des profiles)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User 1: gebus.emma@gmail.com avec ID = 8d29c266-4da4-4140-9e76-8e1161b81320
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
) VALUES (
    '8d29c266-4da4-4140-9e76-8e1161b81320',  -- MÊME ID QUE LE PROFILE
    'authenticated',
    'authenticated',
    'gebus.emma@gmail.com',
    crypt('TempPass2026!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"ADMIN"}'::jsonb,
    NOW(),
    NOW(),
    '', '', '', '',
    false,
    false
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = NOW();

-- User 2: fleet.master.contact@gmail.com avec ID = dced169e-76d7-44bf-88da-82ded5f5fb05
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
) VALUES (
    'dced169e-76d7-44bf-88da-82ded5f5fb05',  -- MÊME ID QUE LE PROFILE
    'authenticated',
    'authenticated',
    'fleet.master.contact@gmail.com',
    crypt('TempPass2026!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"ADMIN"}'::jsonb,
    NOW(),
    NOW(),
    '', '', '', '',
    false,
    false
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    updated_at = NOW();

-- ============================================================
-- ÉTAPE 3: CRÉER LES IDENTITIES AVEC LES ANCIENS IDs
-- ============================================================

-- Supprimer d'abord les anciennes identities
DELETE FROM auth.identities 
WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- Insérer les nouvelles identities
INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
VALUES 
(gen_random_uuid(), '8d29c266-4da4-4140-9e76-8e1161b81320', 'email', 
 '8d29c266-4da4-4140-9e76-8e1161b81320',
 '{"sub":"8d29c266-4da4-4140-9e76-8e1161b81320","email":"gebus.emma@gmail.com"}'::jsonb, NOW(), NOW()),
(gen_random_uuid(), 'dced169e-76d7-44bf-88da-82ded5f5fb05', 'email',
 'dced169e-76d7-44bf-88da-82ded5f5fb05',
 '{"sub":"dced169e-76d7-44bf-88da-82ded5f5fb05","email":"fleet.master.contact@gmail.com"}'::jsonb, NOW(), NOW());

-- ============================================================
-- ÉTAPE 4: VÉRIFICATION FINALE
-- ============================================================

SELECT 
    'ALIGNEMENT' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ PARFAIT - CONNEXION POSSIBLE' ELSE '❌ ERREUR' END as statut,
    (SELECT provider FROM auth.identities WHERE user_id = u.id LIMIT 1) as identity_provider
FROM profiles p
JOIN auth.users u ON u.email = p.email
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
