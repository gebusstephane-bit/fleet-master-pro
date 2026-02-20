-- ============================================
-- API Keys & Webhooks — Intégrations externes
-- ============================================

-- Table: api_keys
-- Clés d'API pour accès programmatique à l'API publique
CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  key         text NOT NULL UNIQUE DEFAULT 'fmp_' || encode(gen_random_bytes(32), 'hex'),
  is_active   boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS api_keys_company_id_idx ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS api_keys_key_idx ON api_keys(key);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_company_policy" ON api_keys
  FOR ALL TO authenticated
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

-- ============================================
-- Table: webhooks
-- Endpoints pour notifications d'événements sortants
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  url         text NOT NULL,
  events      text[] NOT NULL DEFAULT '{}',
  secret      text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active   boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS webhooks_company_id_idx ON webhooks(company_id);

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_company_policy" ON webhooks
  FOR ALL TO authenticated
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

-- ============================================
-- Webhook events de référence (commentaire)
-- vehicle.created | vehicle.updated | vehicle.deleted
-- maintenance.created | maintenance.completed | maintenance.due
-- inspection.completed
-- driver.created | driver.updated
-- ============================================
