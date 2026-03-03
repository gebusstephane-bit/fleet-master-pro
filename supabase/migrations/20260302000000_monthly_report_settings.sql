-- ============================================
-- MIGRATION : Rapport mensuel automatique
-- ============================================

-- 1. Ajout des colonnes de configuration dans companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS monthly_report_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monthly_report_day INTEGER DEFAULT 1 CHECK (monthly_report_day IN (1, 5, -1)), -- 1=1er, 5=5ème, -1=dernier
ADD COLUMN IF NOT EXISTS monthly_report_recipients VARCHAR(20) DEFAULT 'ADMIN' CHECK (monthly_report_recipients IN ('ADMIN', 'ADMIN_AND_DIRECTORS'));

-- 2. Table de logs pour anti-doublon
CREATE TABLE IF NOT EXISTS monthly_report_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- Format: "2026-01" (YYYY-MM)
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index unique pour empêcher les doublons par entreprise et période
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_report_logs_company_period 
ON monthly_report_logs(company_id, period);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_monthly_report_logs_sent_at 
ON monthly_report_logs(sent_at DESC);

-- 3. Activer RLS sur la nouvelle table
ALTER TABLE monthly_report_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies RLS pour monthly_report_logs
CREATE POLICY "monthly_report_logs viewable by company" 
ON monthly_report_logs FOR SELECT 
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "monthly_report_logs manageable by admin" 
ON monthly_report_logs FOR ALL 
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'DIRECTEUR')));

-- 5. Table pour les désabonnements (lien de désinscription)
CREATE TABLE IF NOT EXISTS monthly_report_unsubscribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_unsub_email_company 
ON monthly_report_unsubscribes(email, company_id);

ALTER TABLE monthly_report_unsubscribes ENABLE ROW LEVEL SECURITY;

-- 6. Commentaires pour documentation
COMMENT ON COLUMN companies.monthly_report_enabled IS 'Active/désactive l''envoi du rapport mensuel';
COMMENT ON COLUMN companies.monthly_report_day IS 'Jour d''envoi: 1=premier, 5=cinquième, -1=dernier du mois';
COMMENT ON COLUMN companies.monthly_report_recipients IS 'Destinataires: ADMIN=admin seul, ADMIN_AND_DIRECTORS=admin+directeurs';
COMMENT ON TABLE monthly_report_logs IS 'Logs des rapports mensuels envoyés (anti-doublon)';
COMMENT ON TABLE monthly_report_unsubscribes IS 'Liste des emails désinscrits du rapport mensuel';

-- ============================================
-- DONNÉES DE TEST (décommenter si besoin)
-- ============================================
-- Mettre à jour toutes les entreprises existantes
-- UPDATE companies SET monthly_report_enabled = true WHERE monthly_report_enabled IS NULL;
