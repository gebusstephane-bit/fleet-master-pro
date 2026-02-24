-- ============================================================
-- FIX PROVIDERS - MISSION CHIRURGICALE
-- Users cibles: gebus.emma + fleet.master.contact UNIQUEMENT
-- ============================================================

-- ============================================================
-- PHASE 1: BACKUP CIBLÉ
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_auth_users_fix_providers AS
SELECT * FROM auth.users WHERE 1=0;

-- Backup les 2 users concernés (écrase ancien backup si existe)
DELETE FROM backup_auth_users_fix_providers 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

INSERT INTO backup_auth_users_fix_providers
SELECT * FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

SELECT 'PHASE 1 - BACKUP OK' as phase, COUNT(*) as nb_users 
FROM backup_auth_users_fix_providers;

-- ============================================================
-- PHASE 2: AJOUT PROVIDER (Option A + B combinées)
-- ============================================================

-- Activer pgcrypto pour les mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Option A: Créer les identities (si table existe)
DO $$
BEGIN
    -- Supprimer d'abord les identities existantes pour éviter doublons
    DELETE FROM auth.identities 
    WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
    
    -- Insérer les nouvelles identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES 
    (
        gen_random_uuid(), 
        '8d29c266-4da4-4140-9e76-8e1161b81320',
        '{"sub": "8d29c266-4da4-4140-9e76-8e1161b81320", "email": "gebus.emma@gmail.com"}'::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'dced169e-76d7-44bf-88da-82ded5f5fb05', 
        '{"sub": "dced169e-76d7-44bf-88da-82ded5f5fb05", "email": "fleet.master.contact@gmail.com"}'::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Identities créées avec succès';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur identities (table peut ne pas exister): %', SQLERRM;
END $$;

-- Option B: Mettre à jour raw_app_meta_data (toujours faire)
UPDATE auth.users 
SET 
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"ADMIN"}'::jsonb,
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    is_sso_user = false
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- PHASE 3: VÉRIFICATION MOTS DE PASSE
-- ============================================================

-- Vérifier s'ils ont un mot de passe
SELECT 'PHASE 3 - PASSWORDS' as phase, email, encrypted_password IS NOT NULL as has_pwd
FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- Définir mot de passe temporaire si manquant
UPDATE auth.users 
SET encrypted_password = crypt('TempPass2026!', gen_salt('bf'))
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05')
AND encrypted_password IS NULL;

-- ============================================================
-- PHASE 4: VÉRIFICATION FINALE
-- ============================================================

SELECT 
    'PHASE 4 - VÉRIFICATION' as phase,
    email,
    CASE 
        WHEN raw_app_meta_data->>'provider' = 'email' THEN '✅ Provider OK'
        ELSE '❌ Provider KO'
    END as provider_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u.id AND provider = 'email') 
        THEN '✅ Identity OK' 
        ELSE '⚠️ Identity manquante' 
    END as identity_status,
    CASE WHEN encrypted_password IS NOT NULL THEN '✅ Password OK' ELSE '❌ No Password' END as pwd_status,
    CASE WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmé' ELSE '❌ Non Confirmé' END as email_status
FROM auth.users u
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- VÉRIFICATION: Seuls les 2 users cibles ont été modifiés
-- ============================================================

SELECT 
    'CONFIRMATION CIBLE' as check_type,
    (SELECT COUNT(*) FROM auth.users WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05')) as users_cibles_ok,
    (SELECT COUNT(*) FROM auth.users WHERE raw_app_meta_data->>'provider' = 'email') as total_avec_provider,
    'Vérifie que total_avec_provider = users_cibles_ok + ceux qui avaient déjà email' as note;
