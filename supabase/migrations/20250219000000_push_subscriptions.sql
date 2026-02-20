-- =====================================================
-- MIGRATION: Table push_subscriptions (Web Push API)
-- Stocke les endpoints PushSubscription des navigateurs
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Propriétaire
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- PushSubscription sérialisée (endpoint + keys)
  endpoint TEXT NOT NULL,
  p256dh   TEXT NOT NULL,  -- Clé publique du client (chiffrement)
  auth     TEXT NOT NULL,  -- Secret d'authentification

  -- Informations du device
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un endpoint est unique par utilisateur (pas de doublons)
  UNIQUE (user_id, endpoint)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id  ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subs_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subs_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT : l'utilisateur voit uniquement ses propres subscriptions
DROP POLICY IF EXISTS push_subs_select ON push_subscriptions;
CREATE POLICY push_subs_select ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT : tout utilisateur authentifié peut s'abonner
DROP POLICY IF EXISTS push_subs_insert ON push_subscriptions;
CREATE POLICY push_subs_insert ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE : l'utilisateur peut mettre à jour ses propres subscriptions
DROP POLICY IF EXISTS push_subs_update ON push_subscriptions;
CREATE POLICY push_subs_update ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE : l'utilisateur peut supprimer ses propres subscriptions
DROP POLICY IF EXISTS push_subs_delete ON push_subscriptions;
CREATE POLICY push_subs_delete ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE push_subscriptions IS 'Abonnements push Web API (un par navigateur/device par utilisateur)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL du push service fourni par le navigateur';
COMMENT ON COLUMN push_subscriptions.p256dh   IS 'Clé publique ECDH du client pour chiffrement VAPID';
COMMENT ON COLUMN push_subscriptions.auth     IS 'Secret d authentification VAPID';

SELECT 'Migration push_subscriptions créée avec succès' AS result;
