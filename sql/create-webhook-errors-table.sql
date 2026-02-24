-- ============================================================
-- TABLE webhook_errors - Log des erreurs webhook Stripe
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  stripe_event_id text,
  error_message text,
  error_details jsonb,
  user_email text,
  processed boolean DEFAULT false
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_webhook_errors_created_at ON webhook_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_errors_stripe_event_id ON webhook_errors(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_errors_processed ON webhook_errors(processed);

-- Vérification
SELECT 'Table webhook_errors créée' as status;
