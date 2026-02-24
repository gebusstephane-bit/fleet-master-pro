-- ============================================================
-- VÉRIFICATION ET CORRECTION DU STATUT DE CONFIRMATION
-- ============================================================

-- 1. VÉRIFIER LE STATUT ACTUEL
SELECT 
    'STATUT ACTUEL' as check_type,
    email,
    id,
    email_confirmed_at,
    confirmation_sent_at,
    confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ EMAIL CONFIRMÉ'
        WHEN confirmation_sent_at IS NOT NULL THEN '⏳ EN ATTENTE DE CONFIRMATION'
        ELSE '❌ JAMAIS ENVOYÉ'
    END as statut_confirmation
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

-- 2. FORCER LA CONFIRMATION (si pas déjà fait)
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW(),
    confirmation_token = '',
    email_change_token_new = '',
    email_change = ''
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
AND email_confirmed_at IS NULL;

-- 3. VÉRIFICATION APRÈS CORRECTION
SELECT 
    'APRÈS CORRECTION' as check_type,
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ PRÊT À CONNECTER'
        ELSE '❌ PROBLÈME PERSISTE'
    END as statut_final
FROM auth.users 
WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');
