-- Migration: AI Report Sends tracking + report_unsubscribed on companies
-- Non-destructive

-- ============================================
-- 1. Report sends tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_report_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  report_type VARCHAR(50) DEFAULT 'weekly_fleet',
  sent_at TIMESTAMPTZ DEFAULT now(),
  vehicles_count INTEGER,
  critical_count INTEGER
);

ALTER TABLE ai_report_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_report_sends_company_read" ON ai_report_sends
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_report_sends
  ON ai_report_sends(company_id, sent_at DESC);

-- ============================================
-- 2. Unsubscribe flag on companies
-- ============================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS report_unsubscribed BOOLEAN DEFAULT false;

COMMENT ON COLUMN companies.report_unsubscribed IS 'If true, weekly AI fleet report emails are disabled for this tenant';
