-- ============================================================
-- MISE À JOUR DE TOUTES LES FK AVANT CHANGEMENT IDs PROFILES
-- ============================================================

-- Nouveaux IDs (depuis Dashboard):
-- gebus.emma@gmail.com: 0526a211-cb4c-4d20-aa6e-7a7c5494b9cc
-- fleet.master.contact@gmail.com: 9f2e3fd4-1f66-4db2-a342-a4c099a613f0

DO $$
DECLARE
    old_id_1 UUID := '8d29c266-4da4-4140-9e76-8e1161b81320';
    new_id_1 UUID := '0526a211-cb4c-4d20-aa6e-7a7c5494b9cc';
    old_id_2 UUID := 'dced169e-76d7-44bf-88da-82ded5f5fb05';
    new_id_2 UUID := '9f2e3fd4-1f66-4db2-a342-a4c099a613f0';
BEGIN
    -- Mettre à jour toutes les tables avec FK vers profiles.id
    
    -- user_appearance_settings
    UPDATE user_appearance_settings SET user_id = new_id_1 WHERE user_id = old_id_1;
    UPDATE user_appearance_settings SET user_id = new_id_2 WHERE user_id = old_id_2;
    RAISE NOTICE 'user_appearance_settings: OK';
    
    -- push_subscriptions
    BEGIN
        UPDATE push_subscriptions SET user_id = new_id_1 WHERE user_id = old_id_1;
        UPDATE push_subscriptions SET user_id = new_id_2 WHERE user_id = old_id_2;
        RAISE NOTICE 'push_subscriptions: OK';
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- activity_logs
    BEGIN
        UPDATE activity_logs SET user_id = new_id_1 WHERE user_id = old_id_1;
        UPDATE activity_logs SET user_id = new_id_2 WHERE user_id = old_id_2;
        RAISE NOTICE 'activity_logs: OK';
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- notifications
    BEGIN
        UPDATE notifications SET user_id = new_id_1 WHERE user_id = old_id_1;
        UPDATE notifications SET user_id = new_id_2 WHERE user_id = old_id_2;
        RAISE NOTICE 'notifications: OK';
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- notification_preferences
    BEGIN
        UPDATE notification_preferences SET user_id = new_id_1 WHERE user_id = old_id_1;
        UPDATE notification_preferences SET user_id = new_id_2 WHERE user_id = old_id_2;
        RAISE NOTICE 'notification_preferences: OK';
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- user_sessions
    BEGIN
        UPDATE user_sessions SET user_id = new_id_1 WHERE user_id = old_id_1;
        UPDATE user_sessions SET user_id = new_id_2 WHERE user_id = old_id_2;
        RAISE NOTICE 'user_sessions: OK';
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- MAINTENANT mettre à jour les profiles
    UPDATE profiles SET id = new_id_1 WHERE email = 'gebus.emma@gmail.com';
    UPDATE profiles SET id = new_id_2 WHERE email = 'fleet.master.contact@gmail.com';
    RAISE NOTICE 'profiles: OK';
    
END $$;

-- Vérification finale
SELECT 
    p.email,
    p.id as profile_id,
    u.id as auth_id,
    CASE WHEN p.id = u.id THEN '✅ ALIGNÉ' ELSE '❌ ERREUR' END as statut
FROM profiles p
JOIN auth.users u ON u.email = p.email
WHERE p.email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');
