-- ============================================================
-- CORRECTION PROVIDERS (colonne array/text[])
-- ============================================================

-- 1. Vérifier la structure de la table auth.users
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND column_name IN ('providers', 'raw_app_meta_data', 'email_confirmed_at');

-- 2. Mettre à jour la colonne providers (si c'est un array)
UPDATE auth.users 
SET providers = ARRAY['email']::text[]
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 3. Alternative si providers est stocké différemment
-- Vérifier le contenu actuel
SELECT 
    email,
    providers,
    pg_typeof(providers) as type_providers
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 4. Si providers est null, forcer la valeur
UPDATE auth.users 
SET providers = '{email}'::text[]
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
AND (providers IS NULL OR array_length(providers, 1) IS NULL);

-- 5. VÉRIFICATION FINALE
SELECT 
    email,
    email_confirmed_at,
    providers,
    raw_app_meta_data->>'provider' as provider_from_meta
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
