-- ============================================================
-- CRÉATION DES COMPTES AUTH.USERS UNIQUEMENT
-- Version simplifiée - À exécuter SI la méthode complète échoue
-- ============================================================

-- Activer l'extension pour le cryptage des mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supprimer les anciens auth.users si existants (évite conflits)
DELETE FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- ============================================================
-- USER 1: fleet.master.contact@gmail.com
-- ============================================================
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

-- ============================================================
-- USER 2: gebus.emma@gmail.com
-- ============================================================
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

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 
    'AUTH CRÉÉS' as statut,
    COUNT(*) as nb_users,
    STRING_AGG(email, ', ') as emails
FROM auth.users 
WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');
