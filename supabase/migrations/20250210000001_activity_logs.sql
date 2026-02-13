-- ============================================
-- TABLE ACTIVITY LOGS - Pour tracking activité utilisateur
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Action effectuée
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'VEHICLE_CREATED',
        'VEHICLE_UPDATED', 
        'VEHICLE_DELETED',
        'DRIVER_CREATED',
        'DRIVER_UPDATED',
        'DRIVER_ASSIGNED',
        'MAINTENANCE_CREATED',
        'MAINTENANCE_COMPLETED',
        'INSPECTION_CREATED',
        'INSPECTION_COMPLETED',
        'ROUTE_CREATED',
        'ROUTE_STARTED',
        'ROUTE_COMPLETED',
        'LOGIN',
        'LOGOUT',
        'SETTINGS_UPDATED'
    )),
    
    -- Détails de l'action
    entity_type VARCHAR(30), -- vehicle, driver, maintenance, etc.
    entity_id UUID,          -- ID de l'objet concerné
    entity_name TEXT,        -- Nom lisible (immatriculation, nom chauffeur...)
    
    -- Description et métadonnées
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- IP et user agent pour sécurité
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- RLS Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne voient que les logs de leur entreprise
CREATE POLICY "Activity logs viewable by company members" ON activity_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Seuls les admins peuvent insérer des logs (via triggers ou API)
CREATE POLICY "Activity logs insertable by authenticated" ON activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
        )
    );

-- ============================================
-- FONCTION: Logger une activité
-- ============================================
CREATE OR REPLACE FUNCTION log_activity(
    p_company_id UUID,
    p_user_id UUID,
    p_action_type VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        company_id, user_id, action_type, entity_type, entity_id,
        entity_name, description, metadata
    ) VALUES (
        p_company_id, p_user_id, p_action_type, p_entity_type,
        p_entity_id, p_entity_name, p_description, p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS: Auto-log des actions principales
-- ============================================

-- Log création véhicule
CREATE OR REPLACE FUNCTION tr_log_vehicle_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_activity(
        NEW.company_id,
        auth.uid(),
        'VEHICLE_CREATED',
        'vehicle',
        NEW.id,
        NEW.registration_number,
        'Nouveau véhicule ajouté : ' || NEW.brand || ' ' || NEW.model
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_vehicle ON vehicles;
CREATE TRIGGER tr_log_vehicle
    AFTER INSERT ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION tr_log_vehicle_created();

-- Log création maintenance
CREATE OR REPLACE FUNCTION tr_log_maintenance_created()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_vehicle_name TEXT;
BEGIN
    -- Récupérer company_id du véhicule
    SELECT company_id, registration_number 
    INTO v_company_id, v_vehicle_name
    FROM vehicles WHERE id = NEW.vehicle_id;
    
    PERFORM log_activity(
        v_company_id,
        auth.uid(),
        'MAINTENANCE_CREATED',
        'maintenance',
        NEW.id,
        v_vehicle_name,
        'Maintenance planifiée : ' || COALESCE(NEW.service_type, 'Entretien')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_maintenance ON maintenance_records;
CREATE TRIGGER tr_log_maintenance
    AFTER INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION tr_log_maintenance_created();

SELECT 'Table activity_logs créée avec succès!' as status;
