-- Migration: Tables additionnelles pour le système de notifications
-- Date: 2025-02-09

-- ============================================
-- Table: email_logs
-- Pour le rate limiting et le suivi des emails envoyés
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    email_to TEXT,
    subject TEXT,
    status TEXT DEFAULT 'sent', -- sent, failed, bounced
    error_message TEXT,
    message_id TEXT -- ID du message chez le provider (Resend)
);

CREATE INDEX idx_email_logs_user_sent 
    ON email_logs(user_id, sent_at);

CREATE INDEX idx_email_logs_sent_at 
    ON email_logs(sent_at);

COMMENT ON TABLE email_logs IS 'Logs des emails envoyés pour rate limiting et debug';

-- ============================================
-- Table: push_tokens
-- Stockage des tokens FCM pour les notifications push
-- ============================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type TEXT, -- ios, android, web
    device_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_push_tokens_user 
    ON push_tokens(user_id);

CREATE INDEX idx_push_tokens_token 
    ON push_tokens(token);

CREATE INDEX idx_push_tokens_active 
    ON push_tokens(user_id, is_active);

COMMENT ON TABLE push_tokens IS 'Tokens Firebase Cloud Messaging pour notifications push';

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_push_tokens_updated_at();

-- ============================================
-- Table: geofence_zones
-- Définition des zones géographiques pour le geofencing
-- ============================================
CREATE TABLE IF NOT EXISTS geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- Géométrie: cercle (center_lat, center_lng, radius_m) ou polygone
    zone_type TEXT NOT NULL DEFAULT 'circle', -- circle, polygon
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius_m INTEGER, -- Pour les zones circulaires (en mètres)
    polygon GEOGRAPHY(POLYGON, 4326), -- Pour les zones polygonales
    -- Configuration
    notify_on_enter BOOLEAN DEFAULT TRUE,
    notify_on_exit BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    -- Métadonnées
    color TEXT DEFAULT '#3B82F6', -- Couleur sur la carte
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geofence_zones_company 
    ON geofence_zones(company_id);

CREATE INDEX idx_geofence_zones_active 
    ON geofence_zones(company_id, is_active);

-- Index spatial pour les recherches géographiques
CREATE INDEX idx_geofence_zones_polygon 
    ON geofence_zones USING GIST(polygon);

COMMENT ON TABLE geofence_zones IS 'Zones géographiques pour le geofencing';

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_geofence_zones_updated_at ON geofence_zones;
CREATE TRIGGER update_geofence_zones_updated_at
    BEFORE UPDATE ON geofence_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_push_tokens_updated_at();

-- ============================================
-- Table: vehicle_locations (pour le suivi temps réel)
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2), -- Précision en mètres
    speed DECIMAL(5, 2), -- Vitesse en km/h
    heading DECIMAL(5, 2), -- Direction en degrés
    altitude DECIMAL(8, 2),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Index unique pour éviter les doublons (vehicle + timestamp)
    UNIQUE(vehicle_id, recorded_at)
);

CREATE INDEX idx_vehicle_locations_vehicle 
    ON vehicle_locations(vehicle_id);

CREATE INDEX idx_vehicle_locations_recorded 
    ON vehicle_locations(recorded_at);

CREATE INDEX idx_vehicle_locations_company 
    ON vehicle_locations(company_id, recorded_at);

-- Index spatial
CREATE INDEX idx_vehicle_locations_coords 
    ON vehicle_locations USING GIST(
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    );

COMMENT ON TABLE vehicle_locations IS 'Historique des positions GPS des véhicules';

-- ============================================
-- Table: geofence_events
-- Historique des événements de géolocalisation
-- ============================================
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_zone_id UUID NOT NULL REFERENCES geofence_zones(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- enter, exit
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_geofence_events_zone 
    ON geofence_events(geofence_zone_id);

CREATE INDEX idx_geofence_events_vehicle 
    ON geofence_events(vehicle_id);

CREATE INDEX idx_geofence_events_triggered 
    ON geofence_events(triggered_at);

CREATE INDEX idx_geofence_events_notif 
    ON geofence_events(notification_sent, processed_at) 
    WHERE notification_sent = FALSE;

COMMENT ON TABLE geofence_events IS 'Événements de geofencing (entrée/sortie de zones)';

-- ============================================
-- RLS Policies
-- ============================================

-- email_logs: Uniquement visible par l'utilisateur concerné et admins
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_select_own" ON email_logs;
CREATE POLICY "email_logs_select_own"
    ON email_logs FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- push_tokens: Uniquement par l'utilisateur concerné
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_select_own" ON push_tokens;
CREATE POLICY "push_tokens_select_own"
    ON push_tokens FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_insert_own" ON push_tokens;
CREATE POLICY "push_tokens_insert_own"
    ON push_tokens FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_update_own" ON push_tokens;
CREATE POLICY "push_tokens_update_own"
    ON push_tokens FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_delete_own" ON push_tokens;
CREATE POLICY "push_tokens_delete_own"
    ON push_tokens FOR DELETE
    USING (user_id = auth.uid());

-- geofence_zones: Visible par tous les membres de l'entreprise
ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geofence_zones_select_company" ON geofence_zones;
CREATE POLICY "geofence_zones_select_company"
    ON geofence_zones FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "geofence_zones_insert_manager" ON geofence_zones;
CREATE POLICY "geofence_zones_insert_manager"
    ON geofence_zones FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

DROP POLICY IF EXISTS "geofence_zones_update_manager" ON geofence_zones;
CREATE POLICY "geofence_zones_update_manager"
    ON geofence_zones FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

DROP POLICY IF EXISTS "geofence_zones_delete_manager" ON geofence_zones;
CREATE POLICY "geofence_zones_delete_manager"
    ON geofence_zones FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- vehicle_locations: Visible par les membres de l'entreprise
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_locations_select_company" ON vehicle_locations;
CREATE POLICY "vehicle_locations_select_company"
    ON vehicle_locations FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "vehicle_locations_insert_system" ON vehicle_locations;
CREATE POLICY "vehicle_locations_insert_system"
    ON vehicle_locations FOR INSERT
    WITH CHECK (true); -- Insertion via service account uniquement

-- geofence_events: Visible par les membres de l'entreprise
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geofence_events_select_company" ON geofence_events;
CREATE POLICY "geofence_events_select_company"
    ON geofence_events FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));
