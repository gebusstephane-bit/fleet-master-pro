-- ============================================================
-- SUPPRESSION COMPLÈTE - 2 USERS TEST (Version robuste)
-- ============================================================

DO $$
BEGIN
    -- Supprimer les données des tables qui existent
    BEGIN DELETE FROM user_appearance_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM push_subscriptions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM activity_logs WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM dashboards WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM notifications WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM notification_preferences WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM notification_settings WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM user_sessions WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM user_activity WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05'); EXCEPTION WHEN OTHERS THEN NULL; END;
    
    RAISE NOTICE 'Tables optionnelles nettoyées';
END $$;

-- ============================================================
-- SUPPRESSION AUTH (tables essentielles)
-- ============================================================
DELETE FROM auth.identities WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
DELETE FROM auth.users WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

-- ============================================================
-- SUPPRESSION DES PROFILES
-- ============================================================
DELETE FROM profiles WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com');

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 'SUPRESSION OK' as status, 
       (SELECT COUNT(*) FROM auth.users WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')) as auth_remaining,
       (SELECT COUNT(*) FROM profiles WHERE email IN ('gebus.emma@gmail.com', 'fleet.master.contact@gmail.com')) as profiles_remaining;
