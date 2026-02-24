-- ============================================================
-- CORRECTION DES PROVIDERS ET MÉTADONNÉES
-- ============================================================

-- 1. Vérifier le problème actuel
SELECT 
    'AVANT CORRECTION' as etape,
    email,
    id,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    providers,
    is_sso_user
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 2. CORRECTION - Mettre à jour les métadonnées et providers
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmation_token = '',
    email_change_token_new = '',
    email_change = '',
    raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb,
    is_sso_user = false
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 3. Vérifier que raw_app_meta_data contient bien le provider email
UPDATE auth.users 
SET 
    raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{providers}',
        '["email"]'::jsonb
    )
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
AND (raw_app_meta_data->'providers' IS NULL OR raw_app_meta_data->'providers' = 'null'::jsonb);

-- 4. VÉRIFICATION FINALE
SELECT 
    'APRÈS CORRECTION' as etape,
    email,
    email_confirmed_at,
    raw_app_meta_data->>'provider' as provider,
    raw_app_meta_data->>'providers' as providers_list,
    CASE 
        WHEN email_confirmed_at IS NOT NULL 
         AND raw_app_meta_data->>'provider' = 'email'
         AND raw_app_meta_data->'providers' IS NOT NULL
        THEN '✅ PRÊT À CONNECTER'
        ELSE '❌ ENCORE UN PROBLÈME'
    END as statut
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
