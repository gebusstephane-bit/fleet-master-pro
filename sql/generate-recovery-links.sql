-- ============================================================
-- GÉNÉRATION LIENS DE RÉCUPÉRATION (Magic Links)
-- ============================================================

-- 1. Générer des tokens de recovery
UPDATE auth.users 
SET 
    recovery_token = encode(gen_random_bytes(32), 'hex'),
    recovery_sent_at = NOW()
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- 2. Vérifier les tokens générés
SELECT 
    email,
    recovery_token,
    'https://votre-projet.supabase.co/auth/v1/verify?token=' || recovery_token || '&type=recovery' as magic_link
FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
