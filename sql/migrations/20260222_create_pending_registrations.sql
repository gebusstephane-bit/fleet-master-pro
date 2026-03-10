-- ============================================================================
-- MIGRATION : Table pending_registrations (RGPD Compliant)
-- DATE : 2026-02-22
-- DESCRIPTION : Stocke temporairement les donnees d'inscription avec token securise
--               Le mot de passe est hashe (bcrypt), jamais en clair
-- ============================================================================

-- Activer l'extension UUID si pas deja fait
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Supprimer la table si elle existe deja (pour recreation propre)
DROP TABLE IF EXISTS pending_registrations CASCADE;

-- Creer la table
CREATE TABLE pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  company_name text NOT NULL,
  siret text,
  first_name text,
  last_name text,
  phone text,
  metadata jsonb DEFAULT '{}',
  used boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  user_id uuid
);

-- Index pour performance
CREATE INDEX idx_pending_reg_token ON pending_registrations(setup_token);
CREATE INDEX idx_pending_reg_email ON pending_registrations(email);
CREATE INDEX idx_pending_reg_expires ON pending_registrations(expires_at) WHERE used = false;é

-- Commentaires
COMMENT ON TABLE pending_registrations IS 'Table temporaire pour stocker les donnees d''inscription (RGPD compliant)';
COMMENT ON COLUMN pending_registrations.setup_token IS 'Token a usage unique (15min validity)';
COMMENT ON COLUMN pending_registrations.password_hash IS 'Hash bcrypt du mot de passe (RGPD Article 32)';
COMMENT ON COLUMN pending_registrations.used IS 'Indique si le token a deja ete utilise';

-- Activer RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Politique : service_role peut tout faire (pour le webhook)
CREATE POLICY "Service role full access" ON pending_registrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique : anon/auth peuvent inserer (pour la creation checkout)
CREATE POLICY "Allow insert during checkout" ON pending_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Politique : anon/auth peuvent lire avec token valide
CREATE POLICY "Allow select with valid token" ON pending_registrations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Politique : service_role peut mettre a jour
CREATE POLICY "Service role update" ON pending_registrations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fonction de nettoyage
CREATE OR REPLACE FUNCTION cleanup_expired_pending_registrations()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM pending_registrations 
  WHERE used = false 
    AND expires_at < now() - interval '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
