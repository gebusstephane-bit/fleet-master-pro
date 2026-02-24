-- ============================================================
-- TABLE : driver_alert_logs
-- But : Anti-doublon pour les alertes d'échéance documents conducteurs
-- Parallèle à document_alert_logs (véhicules) — ne pas modifier l'autre
-- Contrainte : Une seule alerte par (driver, doc, niveau, date_expiry)
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_alert_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL,
  document_type TEXT        NOT NULL CHECK (document_type IN ('LICENSE', 'CQC')),
  alert_level   TEXT        NOT NULL CHECK (alert_level IN ('J60', 'J30', 'J0')),
  expiry_date   DATE        NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule alerte par niveau par cycle d'expiration
  CONSTRAINT unique_driver_alert_per_expiry
    UNIQUE (driver_id, document_type, alert_level, expiry_date)
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_driver_alert_logs_driver   ON driver_alert_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_alert_logs_company  ON driver_alert_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_alert_logs_sent_at  ON driver_alert_logs(sent_at);

-- RLS : accès restreint au service role (le cron utilise createAdminClient)
ALTER TABLE driver_alert_logs ENABLE ROW LEVEL SECURITY;
