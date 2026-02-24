-- ============================================================
-- RECRÉATION AVEC PROVIDER_ID (correction)
-- ============================================================

-- 1. BACKUP
CREATE TABLE IF NOT EXISTS backup_complete_20260221 AS
SELECT * FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- 2. SUPPRESSION
DELETE FROM auth.identities 
WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

DELETE FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- 3. RECRÉATION USERS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token, is_sso_user) 
VALUES 
('8d29c266-4da4-4140-9e76-8e1161b81320', 'authenticated', 'authenticated',
 'gebus.emma@gmail.com', crypt('TempPass2026!', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}', '{"role":"ADMIN"}', NOW(), NOW(),
 '', '', '', '', false),

('dced169e-76d7-44bf-88da-82ded5f5fb05', 'authenticated', 'authenticated',
 'fleet.master.contact@gmail.com', crypt('TempPass2026!', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}', '{"role":"ADMIN"}', NOW(), NOW(),
 '', '', '', '', false);

-- 4. CRÉATION IDENTITIES (AVEC PROVIDER_ID)
INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
VALUES 
(gen_random_uuid(), '8d29c266-4da4-4140-9e76-8e1161b81320', 'email', 
 '8d29c266-4da4-4140-9e76-8e1161b81320',  -- provider_id = user_id pour email
 '{"sub":"8d29c266-4da4-4140-9e76-8e1161b81320","email":"gebus.emma@gmail.com"}'::jsonb, NOW(), NOW()),

(gen_random_uuid(), 'dced169e-76d7-44bf-88da-82ded5f5fb05', 'email',
 'dced169e-76d7-44bf-88da-82ded5f5fb05',  -- provider_id = user_id pour email
 '{"sub":"dced169e-76d7-44bf-88da-82ded5f5fb05","email":"fleet.master.contact@gmail.com"}'::jsonb, NOW(), NOW());

-- 5. VÉRIFICATION
SELECT u.email, u.email_confirmed_at, i.provider, i.provider_id, '✅ OK' as statut
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
