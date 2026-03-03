-- Migration: Table ai_conversations pour l'assistant IA réglementaire
-- RGPD: Seul company_id est stocké (pas de user_id ni données personnelles)

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL,
  question    TEXT        NOT NULL,
  answer      TEXT        NOT NULL,
  tokens_used INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour compter les usages par entreprise et par mois
CREATE INDEX IF NOT EXISTS idx_ai_conv_company_created
  ON ai_conversations (company_id, created_at);

-- RLS : les membres d'une entreprise voient les conversations de leur entreprise
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conv_company_select"
  ON ai_conversations FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Les insertions passent par le service role (route API serveur)
-- Pas de policy INSERT pour les utilisateurs normaux
