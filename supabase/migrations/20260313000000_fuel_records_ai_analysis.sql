-- Migration: Add ai_analysis JSONB column to fuel_records
-- Purpose: Store AI-generated fuel anomaly explanations (cached per record)
-- Non-destructive: nullable column, no existing data modified

ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Partial index: only index rows that have an analysis
CREATE INDEX IF NOT EXISTS idx_fuel_records_ai_analysis
  ON fuel_records(id) WHERE ai_analysis IS NOT NULL;

COMMENT ON COLUMN fuel_records.ai_analysis IS 'AI-generated anomaly analysis: {explanation, hypotheses[], action}';
