-- ============================================================
-- TABLE : document_alert_logs
-- But : Anti-doublon pour les alertes d'échéance documents
-- Contrainte : Une seule alerte par (vehicle, doc, niveau, date_expiry)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_alert_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL,
  document_type TEXT        NOT NULL CHECK (document_type IN ('CT', 'TACHY', 'ATP')),
  alert_level   TEXT        NOT NULL CHECK (alert_level IN ('J60', 'J30', 'J0')),
  expiry_date   DATE        NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Empêche d'envoyer la même alerte deux fois pour la même date d'expiration
  CONSTRAINT unique_alert_per_expiry
    UNIQUE (vehicle_id, document_type, alert_level, expiry_date)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_doc_alert_logs_vehicle  ON document_alert_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_doc_alert_logs_company  ON document_alert_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_doc_alert_logs_sent_at  ON document_alert_logs(sent_at);

-- RLS : accès restreint au service role uniquement (le cron utilise createAdminClient)
ALTER TABLE document_alert_logs ENABLE ROW LEVEL SECURITY;

-- Politique : seul le service role peut lire/écrire (bypass RLS)
-- Les utilisateurs normaux n'ont pas accès à cette table de logs
