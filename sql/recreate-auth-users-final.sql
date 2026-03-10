-- ============================================================
-- RECRÉATION COMPLÈTE DES AUTH.USERS (Méthode radicale)
-- ============================================================

-- PHASE 1: SAUVEGARDE COMPLÈTE
CREATE TABLE IF NOT EXISTS backup_complete_20260221 AS
SELECT * FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

SELECT 'BACKUP OK' as status, COUNT(*) as nb_users FROM backup_complete_20260221;

-- PHASE 2: SUPPRESSION DES AUTH.USERS PROBLÉMATIQUES
-- (Les profiles restent intacts avec leurs company_id et données)
DELETE FROM auth.identities 
WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

DELETE FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

SELECT 'SUPPRIMÉS' as status;

-- PHASE 3: RECRÉATION AVEC TOUS LES CHAMPS REQUIS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- User 1: gebus.emma@gmail.com
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
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
    '', '', '', '',
    false,
    false
);

-- User 2: fleet.master.contact@gmail.com
INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    is_sso_user, is_anonymous
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
    '', '', '', '',
    false,
    false
);

-- PHASE 4: CRÉATION DES IDENTITIES (lien vers auth.users)
INSERT INTO auth.identities (id, user_id, provider, identity_data, created_at, updated_at)
VALUES 
(gen_random_uuid(), '8d29c266-4da4-4140-9e76-8e1161b81320', 'email', 
 '{"sub":"8d29c266-4da4-4140-9e76-8e1161b81320","email":"gebus.emma@gmail.com"}'::jsonb, NOW(), NOW()),
(gen_random_uuid(), 'dced169e-76d7-44bf-88da-82ded5f5fb05', 'email',
 '{"sub":"dced169e-76d7-44bf-88da-82ded5f5fb05","email":"fleet.master.contact@gmail.com"}'::jsonb, NOW(), NOW());

-- PHASE 5: VÉRIFICATION
SELECT 
    'VÉRIFICATION' as phase,
    u.email,
    u.id,
    u.email_confirmed_at IS NOT NULL as email_ok,
    i.provider as identity_provider,
    u.raw_app_meta_data->>'provider' as meta_provider,
    '✅ RECRÉÉ' as statut
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- Vérifier alignement profiles (doit être toujours OK)
SELECT 
    'ALIGNEMENT PROFILES' as check_type,
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ' ELSE '❌ PROBLÈME' END as statut
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
