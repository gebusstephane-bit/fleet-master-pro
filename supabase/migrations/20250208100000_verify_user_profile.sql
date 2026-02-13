-- =====================================================
-- VERIFICATION: Profil utilisateur et company_id
-- =====================================================

-- Voir tous les profils
SELECT 'Profils existants:' as info;
SELECT id, email, full_name, role, company_id, created_at 
FROM profiles 
LIMIT 10;

-- Voir tous les utilisateurs auth
SELECT 'Utilisateurs auth:' as info;
SELECT id, email, created_at 
FROM auth.users 
LIMIT 10;

-- Verifier si il y a des utilisateurs auth sans profil
SELECT 'Utilisateurs auth SANS profil:' as info;
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
LIMIT 10;

-- Si des utilisateurs n'ont pas de profil, les creer
INSERT INTO profiles (id, email, full_name, role, company_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'user',
  NULL  -- company_id sera NULL, il faudra le mettre a jour manuellement
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Mettre a jour les profils sans company_id (si tu connais la companie)
-- UPDATE profiles SET company_id = 'TON_COMPANY_ID' WHERE company_id IS NULL;

-- Voir les vehicules par company
SELECT 'Vehicules par company_id:' as info;
SELECT company_id, COUNT(*) as count 
FROM vehicles 
GROUP BY company_id;

-- Voir le company_id de l'utilisateur courant
SELECT 'Company_id de l utilisateur courant:' as info;
SELECT get_user_company_id();
