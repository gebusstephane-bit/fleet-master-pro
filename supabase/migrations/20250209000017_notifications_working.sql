-- ============================================
-- SYSTÈME DE NOTIFICATIONS - VERSION MINIMALE
-- Sans dépendances sur company_id
-- ============================================

-- ============================================
-- PARTIE 1: FONCTION UTILITAIRE
-- ============================================
DROP FUNCTION IF EXISTS column_exists(text, text);

CREATE OR REPLACE FUNCTION column_exists(p_table text, p_column text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = p_table 
        AND c.column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTIE 2: TABLE COMPANIES (SI INEXISTANTE)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PARTIE 3: TABLES DE NOTIFICATIONS
-- ============================================

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID, -- Nullable, pas de FK
    
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'maintenance_due',
        'maintenance_overdue',
        'document_expiring',
        'document_expired',
        'fuel_anomaly',
        'geofencing_entry',
        'geofencing_exit',
        'alert_critical',
        'alert_warning',
        'route_assigned',
        'inspection_completed',
        'system'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    channels_sent JSONB DEFAULT '[]',
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Table préférences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID, -- Nullable, pas de FK
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    maintenance_due_email BOOLEAN DEFAULT true,
    maintenance_due_push BOOLEAN DEFAULT true,
    maintenance_due_in_app BOOLEAN DEFAULT true,
    document_expiring_email BOOLEAN DEFAULT true,
    document_expiring_push BOOLEAN DEFAULT true,
    document_expiring_in_app BOOLEAN DEFAULT true,
    fuel_anomaly_email BOOLEAN DEFAULT true,
    fuel_anomaly_push BOOLEAN DEFAULT false,
    fuel_anomaly_in_app BOOLEAN DEFAULT true,
    geofencing_email BOOLEAN DEFAULT false,
    geofencing_push BOOLEAN DEFAULT true,
    geofencing_in_app BOOLEAN DEFAULT true,
    alert_critical_email BOOLEAN DEFAULT true,
    alert_critical_push BOOLEAN DEFAULT true,
    alert_critical_in_app BOOLEAN DEFAULT true,
    alert_warning_email BOOLEAN DEFAULT false,
    alert_warning_push BOOLEAN DEFAULT true,
    alert_warning_in_app BOOLEAN DEFAULT true,
    fcm_token TEXT,
    fcm_token_updated_at TIMESTAMP WITH TIME ZONE,
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    email_count_24h INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table tokens FCM
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type VARCHAR(20) CHECK (device_type IN ('ios', 'android', 'web')),
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON user_push_tokens(user_id, is_active) WHERE is_active = true;

-- ============================================
-- PARTIE 4: RLS
-- ============================================
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications viewable by owner" ON notifications;
CREATE POLICY "Notifications viewable by owner" ON notifications
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Notifications updatable by owner" ON notifications;
CREATE POLICY "Notifications updatable by owner" ON notifications
FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Preferences viewable by owner" ON notification_preferences;
CREATE POLICY "Preferences viewable by owner" ON notification_preferences
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Preferences updatable by owner" ON notification_preferences;
CREATE POLICY "Preferences updatable by owner" ON notification_preferences
FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Preferences insertable by owner" ON notification_preferences;
CREATE POLICY "Preferences insertable by owner" ON notification_preferences
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Push tokens manageable by owner" ON user_push_tokens;
CREATE POLICY "Push tokens manageable by owner" ON user_push_tokens
FOR ALL USING (user_id = auth.uid());

-- ============================================
-- PARTIE 5: FONCTIONS TRIGGER SIMPLIFIÉES
-- ============================================

-- Trigger maintenance: Version SANS company_id
CREATE OR REPLACE FUNCTION notify_maintenance_due()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    days_until INTEGER;
BEGIN
    -- Vérifier colonne existe
    IF NOT column_exists('maintenance_records', 'next_service_date') THEN
        RETURN NEW;
    END IF;
    
    IF NEW.next_service_date IS NULL THEN
        RETURN NEW;
    END IF;
    
    days_until := NEW.next_service_date - CURRENT_DATE;
    
    IF days_until NOT IN (7, 3, 1) THEN
        RETURN NEW;
    END IF;
    
    -- Notifier tous les admins (SANS filtre company_id)
    FOR v_user IN 
        SELECT id FROM profiles 
        WHERE role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
        LIMIT 50
    LOOP
        INSERT INTO notifications (
            user_id, type, title, message, data, priority
        ) VALUES (
            v_user.id,
            'maintenance_due',
            'Maintenance prévue dans ' || days_until || ' jours',
            'Le véhicule nécessite une maintenance le ' || NEW.next_service_date,
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'maintenance_id', NEW.id,
                'service_date', NEW.next_service_date,
                'days_until', days_until
            ),
            CASE WHEN days_until = 1 THEN 'high' ELSE 'normal' END
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger documents: Version SANS company_id
CREATE OR REPLACE FUNCTION notify_document_expiring()
RETURNS TRIGGER AS $$
DECLARE
    v_expiry_date DATE;
    v_days_until INTEGER;
    v_doc_type TEXT;
    v_title TEXT;
BEGIN
    -- Détecter document selon table
    IF TG_TABLE_NAME = 'drivers' AND column_exists('drivers', 'license_expiry') THEN
        v_expiry_date := NEW.license_expiry;
        v_doc_type := 'permis de conduire';
        
        IF column_exists('drivers', 'first_name') AND column_exists('drivers', 'last_name') THEN
            v_title := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
        ELSE
            v_title := 'Chauffeur ' || NEW.id::text;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'vehicles' THEN
        IF column_exists('vehicles', 'insurance_expiry') THEN
            v_expiry_date := NEW.insurance_expiry;
            v_doc_type := 'assurance';
        ELSIF column_exists('vehicles', 'technical_control_expiry') THEN
            v_expiry_date := NEW.technical_control_expiry;
            v_doc_type := 'contrôle technique';
        END IF;
        
        IF column_exists('vehicles', 'registration_number') THEN
            v_title := COALESCE(NEW.registration_number, 'Véhicule ' || NEW.id::text);
        ELSE
            v_title := 'Véhicule ' || NEW.id::text;
        END IF;
    END IF;
    
    IF v_expiry_date IS NULL THEN
        RETURN NEW;
    END IF;
    
    v_days_until := v_expiry_date - CURRENT_DATE;
    
    IF v_days_until IN (30, 15, 7, 1) THEN
        -- Notifier admins (SANS filtre company_id)
        INSERT INTO notifications (
            user_id, type, title, message, data, priority
        )
        SELECT 
            p.id,
            'document_expiring',
            v_doc_type || ' expire dans ' || v_days_until || ' jours',
            v_title || ' - ' || v_doc_type || ' expire le ' || v_expiry_date,
            jsonb_build_object(
                'driver_id', CASE WHEN TG_TABLE_NAME = 'drivers' THEN NEW.id ELSE NULL END,
                'vehicle_id', CASE WHEN TG_TABLE_NAME = 'vehicles' THEN NEW.id ELSE NULL END,
                'document_type', v_doc_type,
                'expiry_date', v_expiry_date,
                'days_until', v_days_until
            ),
            CASE WHEN v_days_until <= 7 THEN 'high' ELSE 'normal' END
        FROM profiles p
        WHERE p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
        LIMIT 50;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTIE 6: TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS tr_notify_maintenance ON maintenance_records;
DROP TRIGGER IF EXISTS tr_notify_license_expiry ON drivers;
DROP TRIGGER IF EXISTS tr_notify_vehicle_docs ON vehicles;

DO $$
BEGIN
    IF column_exists('maintenance_records', 'next_service_date') THEN
        CREATE TRIGGER tr_notify_maintenance
            AFTER INSERT OR UPDATE OF next_service_date ON maintenance_records
            FOR EACH ROW
            EXECUTE FUNCTION notify_maintenance_due();
    END IF;
END $$;

DO $$
BEGIN
    IF column_exists('drivers', 'license_expiry') THEN
        CREATE TRIGGER tr_notify_license_expiry
            AFTER INSERT OR UPDATE OF license_expiry ON drivers
            FOR EACH ROW
            EXECUTE FUNCTION notify_document_expiring();
    END IF;
END $$;

DO $$
BEGIN
    IF column_exists('vehicles', 'insurance_expiry') OR 
       column_exists('vehicles', 'technical_control_expiry') THEN
        CREATE TRIGGER tr_notify_vehicle_docs
            AFTER INSERT OR UPDATE OF insurance_expiry, technical_control_expiry ON vehicles
            FOR EACH ROW
            EXECUTE FUNCTION notify_document_expiring();
    END IF;
END $$;

-- ============================================
-- PARTIE 7: FONCTIONS UTILITAIRES
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET read_at = NOW()
    WHERE user_id = p_user_id 
    AND read_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_email_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_sent TIMESTAMP;
    v_count INTEGER;
BEGIN
    SELECT last_email_sent_at, email_count_24h 
    INTO v_last_sent, v_count
    FROM notification_preferences
    WHERE user_id = p_user_id;
    
    IF v_last_sent IS NULL OR v_last_sent < NOW() - INTERVAL '24 hours' THEN
        UPDATE notification_preferences
        SET email_count_24h = 0,
            last_email_sent_at = NOW()
        WHERE user_id = p_user_id;
        RETURN true;
    END IF;
    
    IF v_count >= 10 THEN
        RETURN false;
    END IF;
    
    UPDATE notification_preferences
    SET email_count_24h = email_count_24h + 1,
        last_email_sent_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTIE 8: REALTIME
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT 'Système de notifications créé avec succès!' as status;
