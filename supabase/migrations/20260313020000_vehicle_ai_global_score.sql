-- Migration: Vehicle AI Global Score
-- Non-destructive: nullable columns only

-- ============================================
-- 1. AI Global Score columns on vehicles
-- ============================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ai_global_score INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ai_score_summary TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ai_score_detail JSONB;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ai_score_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vehicles_ai_global_score
  ON vehicles(company_id) WHERE ai_global_score IS NOT NULL;

COMMENT ON COLUMN vehicles.ai_global_score IS 'AI-generated global score 0-100 (weighted: maintenance 40%, inspection 35%, consumption 25%)';
COMMENT ON COLUMN vehicles.ai_score_summary IS 'AI-generated one-sentence summary of vehicle health';
COMMENT ON COLUMN vehicles.ai_score_detail IS 'AI score breakdown: {maintenance_score, inspection_score, consumption_score, flags[]}';
COMMENT ON COLUMN vehicles.ai_score_updated_at IS 'Last AI scoring run timestamp';
