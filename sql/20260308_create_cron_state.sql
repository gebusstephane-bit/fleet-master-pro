-- ============================================================
-- TABLE : Etat des jobs cron (pour reprise apres interruption)
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_state (
  id SERIAL PRIMARY KEY,
  job_name TEXT UNIQUE NOT NULL,
  last_processed_id TEXT,           -- Dernier ID traite (pour pagination)
  processed_count INTEGER DEFAULT 0, -- Nombre traite aujourd hui
  metadata JSONB DEFAULT '{}',       -- Donnees additionnelles
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_cron_state_job ON cron_state(job_name);

-- Commentaire
COMMENT ON TABLE cron_state IS 'Stocke etat de progression des jobs cron pour permettre la reprise en cas d interruption';

-- Initialiser l entree pour le job maintenance_predictions
INSERT INTO cron_state (job_name, last_processed_id, processed_count)
VALUES ('maintenance_predictions', null, 0)
ON CONFLICT (job_name) DO NOTHING;

SELECT 'Table cron_state creee et initialisee' as status;
