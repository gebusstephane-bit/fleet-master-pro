-- ============================================================================
-- Migration: Création de la table webhook_events pour l'idempotence
-- Date: 2026-02-24
-- Auteur: DevSecOps
-- ============================================================================
-- Cette table permet de tracker les événements Stripe déjà traités
-- pour éviter les doublons en cas de retry du webhook.
-- ============================================================================

-- Création de la table webhook_events
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métadonnées utiles pour le debugging
    processing_duration_ms INTEGER,
    processing_error TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Index unique sur stripe_event_id pour garantir l'idempotence
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id 
    ON webhook_events(stripe_event_id);

-- Index sur event_type pour les requêtes par type d'événement
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
    ON webhook_events(event_type);

-- Index sur created_at pour le nettoyage des vieux events
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
    ON webhook_events(created_at);

-- Index composite pour les recherches courantes
CREATE INDEX IF NOT EXISTS idx_webhook_events_type_and_created 
    ON webhook_events(event_type, created_at DESC);

-- ============================================================================
-- Commentaires sur la table et les colonnes
-- ============================================================================

COMMENT ON TABLE webhook_events IS 'Table de tracking des événements webhook Stripe pour garantir l''idempotence';
COMMENT ON COLUMN webhook_events.stripe_event_id IS 'ID unique de l''événement Stripe (evt_xxx) - utilisé pour déduplication';
COMMENT ON COLUMN webhook_events.event_type IS 'Type d''événement Stripe (ex: checkout.session.completed)';
COMMENT ON COLUMN webhook_events.payload IS 'Payload complet de l''événement (JSONB) - utile pour debugging';
COMMENT ON COLUMN webhook_events.processed_at IS 'Timestamp du traitement de l''événement';
COMMENT ON COLUMN webhook_events.processing_duration_ms IS 'Durée de traitement en ms (monitoring performance)';
COMMENT ON COLUMN webhook_events.processing_error IS 'Message d''erreur si le traitement a échoué';
COMMENT ON COLUMN webhook_events.retry_count IS 'Nombre de retry Stripe pour cet événement';

-- ============================================================================
-- Fonction helper pour l'insertion idempotente
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_webhook_event_idempotent(
    p_stripe_event_id TEXT,
    p_event_type TEXT,
    p_payload JSONB,
    p_retry_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    is_new BOOLEAN,
    existing_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Tentative d'insertion
    INSERT INTO webhook_events (
        stripe_event_id, 
        event_type, 
        payload, 
        retry_count
    ) VALUES (
        p_stripe_event_id, 
        p_event_type, 
        p_payload, 
        p_retry_count
    )
    ON CONFLICT (stripe_event_id) DO NOTHING
    RETURNING TRUE, NULL::TIMESTAMP WITH TIME ZONE INTO is_new, existing_created_at;
    
    -- Si l'insertion a échoué (conflit), récupérer les infos existantes
    IF NOT FOUND THEN
        SELECT FALSE, created_at 
        INTO is_new, existing_created_at
        FROM webhook_events 
        WHERE stripe_event_id = p_stripe_event_id;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_webhook_event_idempotent IS 
    'Insère un événement webhook de manière idempotente. Retourne is_new=TRUE si nouvel insert, FALSE si déjà existant.';

-- ============================================================================
-- Fonction de nettoyage des vieux events (optionnel - à exécuter via cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_events 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_webhook_events IS 
    'Nettoie les événements webhook plus anciens que p_retention_days jours. Défaut: 90 jours.';

-- ============================================================================
-- RLS Policies (si RLS est activé sur d'autres tables)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les service role peuvent tout faire
CREATE POLICY "Service role full access on webhook_events"
    ON webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Politique : Aucun accès anonyme
CREATE POLICY "No anonymous access on webhook_events"
    ON webhook_events
    FOR ALL
    TO anon
    USING (false);

-- Politique : Aucun accès authentifié direct (utiliser service_role)
CREATE POLICY "No direct authenticated access on webhook_events"
    ON webhook_events
    FOR ALL
    TO authenticated
    USING (false);

-- ============================================================================
-- Vérification de la migration
-- ============================================================================

SELECT 'Table webhook_events créée avec succès' AS migration_status;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'webhook_events' 
ORDER BY ordinal_position;
