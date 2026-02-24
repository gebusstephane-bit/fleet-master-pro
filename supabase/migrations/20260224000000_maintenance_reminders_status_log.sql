-- ============================================================
-- Migration : Système de rappels maintenance + historique statuts
--
-- Tables créées :
--   1. maintenance_reminders  — journal de déduplication des emails J-1
--   2. vehicle_status_history — journal de tous les changements de statut
--
-- Colonnes ajoutées à vehicles :
--   - maintenance_started_at  (timestamptz)
--   - maintenance_ended_at    (timestamptz)
-- ============================================================

-- ============================================================
-- 1. TABLE : maintenance_reminders
-- Empêche l'envoi de doublons si le cron tourne plusieurs fois
-- UNIQUE (maintenance_record_id, recipient_email, reminder_type)
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_record_id uuid        REFERENCES maintenance_records(id) ON DELETE CASCADE,
  company_id            uuid        REFERENCES companies(id)           ON DELETE CASCADE,
  sent_at               timestamptz NOT NULL DEFAULT now(),
  recipient_email       text        NOT NULL,
  recipient_role        text,
  reminder_type         text        NOT NULL DEFAULT 'J-1_12h',  -- 'J-1_12h', 'J0_morning', ...
  status                text        NOT NULL DEFAULT 'sent',       -- 'sent', 'failed'
  error_message         text,
  CONSTRAINT unique_reminder UNIQUE (maintenance_record_id, recipient_email, reminder_type)
);

COMMENT ON TABLE maintenance_reminders IS
  'Journal des emails de rappel maintenance envoyés. Contrainte UNIQUE empêche les doublons si le cron est relancé.';

-- ============================================================
-- 2. TABLE : vehicle_status_history
-- Journalise tous les changements de statut véhicule
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_status_history (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            uuid        NOT NULL REFERENCES vehicles(id)  ON DELETE CASCADE,
  company_id            uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  old_status            text        NOT NULL,
  new_status            text        NOT NULL,
  changed_at            timestamptz NOT NULL DEFAULT now(),
  reason                text,
  maintenance_record_id uuid        REFERENCES maintenance_records(id) ON DELETE SET NULL,
  changed_by            text        NOT NULL DEFAULT 'cron'  -- 'cron', 'user:<id>', 'admin'
);

COMMENT ON TABLE vehicle_status_history IS
  'Journal immuable de tous les changements de statut véhicule. Alimenté par les crons et les actions manuelles.';

-- Index pour accélérer les requêtes par véhicule
CREATE INDEX IF NOT EXISTS idx_vsh_vehicle_id ON vehicle_status_history (vehicle_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mr_company      ON maintenance_reminders   (company_id, sent_at DESC);

-- ============================================================
-- 3. COLONNES SUPPLÉMENTAIRES sur vehicles
-- maintenance_started_at : quand le cron a passé le véhicule en maintenance
-- maintenance_ended_at   : quand le cron l'a remis actif
-- ============================================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS maintenance_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance_ended_at   timestamptz;

-- ============================================================
-- 4. RLS (Row-Level Security)
-- Service role a accès complet (bypass RLS)
-- Les utilisateurs de la company peuvent lire les logs
-- ============================================================

ALTER TABLE maintenance_reminders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_status_history ENABLE ROW LEVEL SECURITY;

-- Politique lecture : membres actifs de la même company
CREATE POLICY "company_members_read_maintenance_reminders"
  ON maintenance_reminders FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "company_members_read_vehicle_status_history"
  ON vehicle_status_history FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Trigger updated_at sur maintenance_reminders (réutilise la fonction existante)
-- Note : vehicle_status_history est immuable → pas de updated_at
