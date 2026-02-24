-- ============================================================
-- Système Prédictif "Contrôle Ciblé Agent" - V1
-- Tables isolées - Aucune modification des tables existantes
-- ============================================================

-- ==========================================
-- TABLE 1 : Alertes Prédictives
-- ==========================================
CREATE TABLE IF NOT EXISTS predictive_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Données calculées par l'algorithme
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_score INTEGER NOT NULL CHECK (current_score BETWEEN 0 AND 100),
    previous_score INTEGER NOT NULL,
    degradation_speed DECIMAL(5,2) NOT NULL, -- Points perdus par jour (positif = dégradation)
    days_until_critical INTEGER NOT NULL,

    -- Prédiction
    predicted_control_date DATE NOT NULL,
    urgency_score DECIMAL(3,2) NOT NULL CHECK (urgency_score BETWEEN 0 AND 1),
    urgency_level TEXT NOT NULL CHECK (urgency_level IN (
        'surveillance',
        'controle_recommande',
        'controle_urgent',
        'intervention_immediate'
    )),

    -- Ciblage composant
    component_concerned TEXT NOT NULL CHECK (component_concerned IN (
        'Pneumatiques', 'Freinage', 'Moteur', 'Carrosserie', 'Éclairage', 'Général'
    )),
    reasoning TEXT NOT NULL, -- Explication lisible pour l'agent

    -- Workflow
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'control_done', 'false_positive', 'expired', 'cancelled'
    )),

    -- Contrôle effectué (NULL jusqu'à l'action de l'agent)
    controlled_at TIMESTAMPTZ,
    controlled_by UUID REFERENCES profiles(id),
    control_result TEXT CHECK (control_result IN ('anomaly_confirmed', 'no_anomaly', 'false_alarm')),
    anomaly_details TEXT,
    new_score_after_control INTEGER,

    -- Références soft (pas de FK strict pour ne pas bloquer les tables existantes)
    linked_inspection_id UUID,    -- Référence vehicle_inspections (vérification logicielle)
    generated_maintenance_id UUID, -- Référence maintenance_records créée suite au contrôle

    -- Apprentissage par véhicule
    false_positive_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index performance et sécurité
CREATE INDEX idx_pred_alerts_company_vehicle ON predictive_alerts(company_id, vehicle_id);
CREATE INDEX idx_pred_alerts_status_urgency ON predictive_alerts(company_id, status, urgency_level)
    WHERE status = 'active';
CREATE INDEX idx_pred_alerts_date ON predictive_alerts(predicted_control_date);
CREATE INDEX idx_pred_alerts_vehicle_active ON predictive_alerts(vehicle_id)
    WHERE status = 'active';

-- ==========================================
-- TABLE 2 : Seuils personnalisés par véhicule (Apprentissage)
-- ==========================================
CREATE TABLE IF NOT EXISTS vehicle_predictive_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Ajustements dynamiques basés sur les faux positifs
    sensitivity_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (sensitivity_multiplier BETWEEN 0.5 AND 2.0),
    custom_threshold_score INTEGER DEFAULT 70 CHECK (custom_threshold_score BETWEEN 30 AND 95),
    false_positive_count INTEGER DEFAULT 0,

    adjusted_by UUID REFERENCES profiles(id),
    adjusted_at TIMESTAMPTZ DEFAULT now(),
    adjustment_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pred_thresholds_company ON vehicle_predictive_thresholds(company_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE predictive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_predictive_thresholds ENABLE ROW LEVEL SECURITY;

-- SELECT : Utilisateurs voient uniquement leur company
CREATE POLICY select_pred_alerts ON predictive_alerts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY select_pred_thresholds ON vehicle_predictive_thresholds
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- INSERT : Service Role (Edge Function) bypass RLS automatiquement.
-- Cette policy couvre les ADMIN qui insèrent manuellement.
CREATE POLICY insert_pred_alerts ON predictive_alerts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
        OR auth.uid() IS NULL -- Service role (Edge Function)
    );

CREATE POLICY insert_pred_thresholds ON vehicle_predictive_thresholds
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR')
        )
        OR auth.uid() IS NULL
    );

-- UPDATE Agent : peut marquer control_done/false_positive sur sa company
CREATE POLICY update_pred_alerts_agent ON predictive_alerts
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('AGENT_DE_PARC', 'ADMIN', 'DIRECTEUR')
        )
    );

-- UPDATE Thresholds : Directeur/Admin peuvent ajuster les seuils
CREATE POLICY update_pred_thresholds ON vehicle_predictive_thresholds
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role IN ('DIRECTEUR', 'ADMIN')
        )
    );

-- DELETE : Uniquement ADMIN
CREATE POLICY delete_pred_alerts ON predictive_alerts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
            AND company_id = predictive_alerts.company_id
        )
    );

-- ==========================================
-- TRIGGER : Updated At
-- ==========================================
-- update_updated_at_column() existe déjà (créée dans maintenance_workflow migration)
-- On crée simplement le trigger sur la nouvelle table

CREATE TRIGGER update_pred_alerts_updated_at
    BEFORE UPDATE ON predictive_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- FONCTION SÉCURISÉE : submit_control_result
-- Exécutée avec les droits du créateur (SECURITY DEFINER)
-- Vérifie les droits, soumet le contrôle, crée maintenance si nécessaire,
-- et met à jour le multiplicateur de sensibilité (apprentissage)
-- ==========================================
CREATE OR REPLACE FUNCTION submit_control_result(
    p_alert_id UUID,
    p_new_score INTEGER,
    p_control_result TEXT,
    p_anomaly_details TEXT DEFAULT NULL,
    p_maintenance_needed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_vehicle_id UUID;
    v_user_id UUID;
    v_user_company_id UUID;
    v_user_role TEXT;
    v_maintenance_id UUID;
BEGIN
    -- Récupérer l'ID utilisateur courant
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
    END IF;

    -- Vérifier que l'alerte existe et récupérer ses données
    SELECT company_id, vehicle_id
    INTO v_company_id, v_vehicle_id
    FROM predictive_alerts
    WHERE id = p_alert_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Alerte non trouvée ou déjà traitée');
    END IF;

    -- Vérifier que l'utilisateur appartient à la même company
    SELECT company_id, role
    INTO v_user_company_id, v_user_role
    FROM profiles
    WHERE id = v_user_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profil utilisateur non trouvé');
    END IF;

    IF v_user_company_id != v_company_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé');
    END IF;

    -- Vérifier le rôle : seuls AGENT_DE_PARC et ADMIN peuvent soumettre un contrôle physique
    IF v_user_role NOT IN ('AGENT_DE_PARC', 'ADMIN') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Seul un agent de parc ou admin peut effectuer ce contrôle');
    END IF;

    -- Valider le score
    IF p_new_score < 0 OR p_new_score > 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Score invalide (0-100 requis)');
    END IF;

    -- Créer une fiche maintenance si anomalie confirmée et maintenance demandée
    IF p_maintenance_needed = TRUE AND p_control_result = 'anomaly_confirmed' THEN
        INSERT INTO maintenance_records (
            company_id,
            vehicle_id,
            type,
            status,
            description,
            priority,
            requested_by,
            requested_at
        ) VALUES (
            v_company_id,
            v_vehicle_id,
            'CORRECTIVE',
            'DEMANDE_CREEE',
            'Anomalie détectée lors contrôle prédictif ciblé: ' || COALESCE(p_anomaly_details, 'Détails non renseignés'),
            'HIGH',
            v_user_id,
            now()
        )
        RETURNING id INTO v_maintenance_id;
    END IF;

    -- Mettre à jour l'alerte avec le résultat du contrôle
    UPDATE predictive_alerts
    SET
        status = 'control_done',
        controlled_at = now(),
        controlled_by = v_user_id,
        control_result = p_control_result,
        new_score_after_control = p_new_score,
        anomaly_details = p_anomaly_details,
        generated_maintenance_id = v_maintenance_id,
        updated_at = now()
    WHERE id = p_alert_id;

    -- Apprentissage : si faux positif, ajuster la sensibilité pour ce véhicule
    IF p_control_result IN ('no_anomaly', 'false_alarm') THEN
        INSERT INTO vehicle_predictive_thresholds (
            vehicle_id,
            company_id,
            false_positive_count,
            sensitivity_multiplier,
            adjusted_by,
            adjusted_at,
            adjustment_reason
        )
        VALUES (
            v_vehicle_id,
            v_company_id,
            1,
            1.1, -- Premier faux positif : légère hausse du seuil
            v_user_id,
            now(),
            'Faux positif détecté lors du contrôle ciblé'
        )
        ON CONFLICT (vehicle_id)
        DO UPDATE SET
            false_positive_count = vehicle_predictive_thresholds.false_positive_count + 1,
            -- Seuil monte de 0.1 par faux positif, plafonné à 1.5
            sensitivity_multiplier = LEAST(1.5, vehicle_predictive_thresholds.sensitivity_multiplier + 0.1),
            adjusted_by = v_user_id,
            adjusted_at = now(),
            adjustment_reason = 'Faux positif n°' || (vehicle_predictive_thresholds.false_positive_count + 1);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'maintenance_created', v_maintenance_id IS NOT NULL,
        'maintenance_id', v_maintenance_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Erreur interne: ' || SQLERRM
    );
END;
$$;

-- Grant d'exécution aux utilisateurs authentifiés (la fonction vérifie elle-même les droits)
GRANT EXECUTE ON FUNCTION submit_control_result TO authenticated;

-- ==========================================
-- Commentaires documentation
-- ==========================================
COMMENT ON TABLE predictive_alerts IS
    'Alertes prédictives générées par l''algorithme de dégradation. Isolée des tables existantes.';
COMMENT ON TABLE vehicle_predictive_thresholds IS
    'Seuils personnalisés par véhicule, ajustés automatiquement en cas de faux positifs (apprentissage).';
COMMENT ON FUNCTION submit_control_result IS
    'Soumet le résultat d''un contrôle ciblé, crée optionnellement une fiche maintenance, et ajuste la sensibilité si faux positif.';
COMMENT ON COLUMN predictive_alerts.degradation_speed IS
    'Points de score perdus par jour (calculé entre 2 dernières inspections). Positif = dégradation.';
COMMENT ON COLUMN predictive_alerts.reasoning IS
    'Explication en langage naturel destinée à l''agent pour guider son contrôle.';
COMMENT ON COLUMN vehicle_predictive_thresholds.sensitivity_multiplier IS
    'Multiplicateur appliqué au seuil critique. >1 = moins sensible (réduit les faux positifs). Plafon: 1.5.';
