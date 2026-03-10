-- ============================================================
-- GÉNÉRATION DE MAGIC LINKS (LIENS DE CONNEXION DIRECT)
-- Alternative si la confirmation par email ne fonctionne pas
-- ============================================================

-- 1. Vérifier d'abord les identifiants
SELECT 
    'MAGIC LINK INFO' as type,
    email,
    id as user_id,
    email_confirmed_at
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 2. Instructions pour générer les magic links
-- Les magic links doivent être générés via l'API Supabase, pas en SQL pur
-- Voici la méthode :

/*
MÉTHODE 1: Via Supabase Dashboard (le plus simple)
--------------------------------------------------
1. Va dans Supabase Dashboard → Authentication → Users
2. Clique sur "fleet.master.contact@gmail.com"
3. Clique sur "Send password reset" ou "Send magic link"
4. Faire de même pour "gebus.emma@gmail.com"

MÉTHODE 2: Via curl ou Postman (si Dashboard ne marche pas)
-----------------------------------------------------------
POST https://votre-projet.supabase.co/auth/v1/magiclink
Headers:
  - apikey: votre-anon-key
Content-Type: application/json

Body:
{
  "email": "fleet.master.contact@gmail.com"
}

MÉTHODE 3: Via la fonction SQL (si tu as les droits)
----------------------------------------------------
*/

-- Créer une fonction pour générer le token de recovery
-- (Le user recevra un email de réinitialisation de mot de passe)

-- Vérifier que les users ont bien des tokens vides
SELECT 
    email,
    recovery_token,
    confirmation_token,
    email_change_token_new
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- Note: Pour forcer l'envoi d'un email de reset password:
-- Utiliser l'API: POST /auth/v1/recover
-- Ou depuis le Dashboard: User → "Send password reset"
