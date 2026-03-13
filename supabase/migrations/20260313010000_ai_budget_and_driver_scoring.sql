-- Migration: AI Budget tracking + Driver AI scoring
-- Non-destructive: new table + nullable columns only

-- ============================================
-- 1. AI Usage Budget table (cost control per tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  calls_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost_eur DECIMAL(8,4) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, month)
);

-- RLS: admin only (cron access via service role)
ALTER TABLE ai_usage_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_budget_company_read" ON ai_usage_budget
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================
-- 2. Driver AI scoring columns
-- ============================================
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ai_score JSONB;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ai_score_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_driver_ai_score
  ON drivers(company_id) WHERE ai_score IS NOT NULL;

COMMENT ON COLUMN drivers.ai_score IS 'AI-generated score: {score: 0-100, incident_score, fuel_score, resume}';
COMMENT ON COLUMN drivers.ai_score_updated_at IS 'Last AI scoring run timestamp';
