-- ============================================================
-- RÉPARATION - fleet.master.contact@gmail.com UNIQUEMENT
-- ============================================================

-- 1. BACKUP
CREATE TABLE IF NOT EXISTS backup_fleet_master_20260221 AS
SELECT * FROM public.profiles WHERE id = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- 2. Vérifier si auth.user existe déjà
SELECT 
    'AVANT CORRECTION' as etape,
    au.id as auth_id,
    au.email,
    p.id as profile_id,
    CASE 
        WHEN au.id IS NULL THEN '❌ PAS DE COMPTE AUTH'
        WHEN au.id = p.id THEN '✅ DÉJÀ ALIGNÉ'
        ELSE '⚠️ EXISTE MAIS ID DIFFÉRENT'
    END as statut
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id OR au.email = p.email
WHERE p.id = 'dced169e-76d7-44bf-88da-82ded5f5fb05';

-- 3. Créer l'extension pour cryptage
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Supprimer l'ancien auth.user si existe avec cet email (évite conflit)
DELETE FROM auth.users WHERE email = 'fleet.master.contact@gmail.com';

-- 5. CRÉER LE COMPTE AUTH AVEC LE BON ID
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

-- 6. VÉRIFICATION FINALE
SELECT 
    'APRÈS CORRECTION' as etape,
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
JOIN auth.users u ON u.id = p.id
WHERE p.id = 'dced169e-76d7-44bf-88da-82ded5f5fb05';
