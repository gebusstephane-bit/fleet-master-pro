-- ============================================
-- SYSTÈME DE NOTIFICATIONS MULTI-CANAL
-- FleetMaster Pro
-- ============================================

-- ============================================
-- 1. TABLE NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- Nullable pour gérer les cas edge
    
    -- Contenu
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'maintenance_due',           -- Maintenance à venir
        'maintenance_overdue',       -- Maintenance en retard
        'document_expiring',         -- Document qui expire
        'document_expired',          -- Document expiré
        'fuel_anomaly',              -- Consommation anormale
        'geofencing_entry',          -- Entrée zone
        'geofencing_exit',           -- Sortie zone
        'alert_critical',            -- Alerte critique
        'alert_warning',             -- Alerte avertissement
        'route_assigned',            -- Tournée assignée
        'inspection_completed',      -- Inspection terminée
        'system'                     -- Notification système
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',        -- Données additionnelles (id véhicule, etc.)
    
    -- Canaux envoyés
    channels_sent JSONB DEFAULT '[]', -- ['in_app', 'email', 'push']
    
    -- Statut
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 2. TABLE PRÉFÉRENCES DE NOTIFICATION
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- Nullable pour gérer les cas edge
    
    -- Canaux activés
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Préférences par type
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
    
    -- Tokens pour push notifications
    fcm_token TEXT,
    fcm_token_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Rate limiting emails
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    email_count_24h INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_company ON notification_preferences(company_id);

-- ============================================
-- 3. TABLE TOKENS FCM (pour multi-device)
-- ============================================
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
-- 4. RLS (Row Level Security)
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own
CREATE POLICY "Notifications viewable by owner" ON notifications
FOR SELECT USING (user_id = auth.uid());

-- Notifications: Users can only update their own (mark as read)
CREATE POLICY "Notifications updatable by owner" ON notifications
FOR UPDATE USING (user_id = auth.uid());

-- Preferences: Users can manage their own
CREATE POLICY "Preferences viewable by owner" ON notification_preferences
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Preferences updatable by owner" ON notification_preferences
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Preferences insertable by owner" ON notification_preferences
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Push tokens: Users can manage their own
CREATE POLICY "Push tokens manageable by owner" ON user_push_tokens
FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 5. FONCTIONS TRIGGER POUR NOTIFICATIONS
-- ============================================

-- Fonction pour créer notification de maintenance
CREATE OR REPLACE FUNCTION notify_maintenance_due()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_user RECORD;
    days_until INTEGER;
BEGIN
    -- Récupérer le company_id du véhicule
    SELECT company_id INTO v_company_id FROM vehicles WHERE id = NEW.vehicle_id;
    
    -- Calculer les jours jusqu'à la maintenance
    days_until := NEW.next_service_date - CURRENT_DATE;
    
    -- Notification 7j, 3j, 1j avant
    IF days_until IN (7, 3, 1) THEN
        -- Créer notification pour tous les admins/agents
        FOR v_user IN 
            SELECT id FROM profiles 
            WHERE company_id = v_company_id 
            AND role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
        LOOP
            INSERT INTO notifications (
                user_id, company_id, type, title, message, data, priority
            ) VALUES (
                v_user.id,
                v_company_id,
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour notifier document expirant
CREATE OR REPLACE FUNCTION notify_document_expiring()
RETURNS TRIGGER AS $$
DECLARE
    v_expiry_date DATE;
    v_days_until INTEGER;
    v_doc_type TEXT;
    v_title TEXT;
BEGIN
    -- Détecter quel document est mis à jour
    IF TG_TABLE_NAME = 'drivers' THEN
        -- Permis de conduire
        IF NEW.license_expiry IS NOT NULL THEN
            v_expiry_date := NEW.license_expiry;
            v_doc_type := 'permis de conduire';
            v_title := NEW.first_name || ' ' || NEW.last_name;
        END IF;
    ELSIF TG_TABLE_NAME = 'vehicles' THEN
        -- Assurance ou CT
        IF NEW.insurance_expiry IS NOT NULL AND NEW.insurance_expiry != OLD.insurance_expiry THEN
            v_expiry_date := NEW.insurance_expiry;
            v_doc_type := 'assurance';
            v_title := (SELECT registration_number FROM vehicles WHERE id = NEW.id);
        ELSIF NEW.technical_control_expiry IS NOT NULL AND NEW.technical_control_expiry != OLD.technical_control_expiry THEN
            v_expiry_date := NEW.technical_control_expiry;
            v_doc_type := 'contrôle technique';
            v_title := (SELECT registration_number FROM vehicles WHERE id = NEW.id);
        END IF;
    END IF;
    
    IF v_expiry_date IS NULL THEN
        RETURN NEW;
    END IF;
    
    v_days_until := v_expiry_date - CURRENT_DATE;
    
    -- Notifier 30j, 15j, 7j, 1j avant expiration
    IF v_days_until IN (30, 15, 7, 1) THEN
        INSERT INTO notifications (
            user_id, company_id, type, title, message, data, priority
        )
        SELECT 
            p.id,
            p.company_id,
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
        WHERE p.company_id = NEW.company_id
        AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger maintenance
DROP TRIGGER IF EXISTS tr_notify_maintenance ON maintenance_records;
CREATE TRIGGER tr_notify_maintenance
    AFTER INSERT OR UPDATE OF next_service_date ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION notify_maintenance_due();

-- Trigger permis (drivers)
DROP TRIGGER IF EXISTS tr_notify_license_expiry ON drivers;
CREATE TRIGGER tr_notify_license_expiry
    AFTER INSERT OR UPDATE OF license_expiry ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION notify_document_expiring();

-- Trigger véhicules (assurance/CT)
DROP TRIGGER IF EXISTS tr_notify_vehicle_docs ON vehicles;
CREATE TRIGGER tr_notify_vehicle_docs
    AFTER INSERT OR UPDATE OF insurance_expiry, technical_control_expiry ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION notify_document_expiring();

-- ============================================
-- 7. FONCTION UTILITAIRE: Marquer tout comme lu
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

-- ============================================
-- 8. FONCTION: Vérifier rate limiting email
-- ============================================
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
    
    -- Réinitialiser le compteur si plus de 24h
    IF v_last_sent IS NULL OR v_last_sent < NOW() - INTERVAL '24 hours' THEN
        UPDATE notification_preferences
        SET email_count_24h = 0,
            last_email_sent_at = NOW()
        WHERE user_id = p_user_id;
        RETURN true;
    END IF;
    
    -- Max 10 emails par 24h
    IF v_count >= 10 THEN
        RETURN false;
    END IF;
    
    -- Incrémenter le compteur
    UPDATE notification_preferences
    SET email_count_24h = email_count_24h + 1,
        last_email_sent_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

SELECT 'Système de notifications créé avec succès!' as status;
