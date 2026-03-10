-- ============================================
-- FIX SUPPORT TICKETS - Structure et RLS
-- ============================================

-- 1. Vérifier et ajouter les colonnes manquantes
DO $$
BEGIN
    -- Ajouter category si manquant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'category'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN category VARCHAR(50) DEFAULT 'other';
    END IF;

    -- Ajouter assigned_to si manquant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN assigned_to UUID REFERENCES profiles(id);
    END IF;

    -- Ajouter user_id si manquant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN user_id UUID REFERENCES profiles(id);
    END IF;

    -- Ajouter description si manquant (pourrait être manquant sur vieilles tables)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'description'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN description TEXT DEFAULT '';
    END IF;
END $$;

-- 2. Créer la table support_messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id),
    author_type VARCHAR(20) DEFAULT 'client' CHECK (author_type IN ('client', 'admin', 'system')),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- 4. Activer RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer les anciennes policies si elles existent (pour recréation propre)
DROP POLICY IF EXISTS "Users can view own company tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view messages from own tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages on own tickets" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can create messages" ON support_messages;

-- 6. Recréer les policies

-- Support Tickets Policies
CREATE POLICY "Users can view own company tickets"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = support_tickets.company_id
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = support_tickets.company_id
        )
    );

CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Support Messages Policies
CREATE POLICY "Users can view messages from own tickets"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_messages.ticket_id
            AND (
                support_tickets.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.company_id = support_tickets.company_id
                )
            )
        )
        AND is_internal = FALSE
    );

CREATE POLICY "Users can create messages on own tickets"
    ON support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_messages.ticket_id
            AND (
                support_tickets.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.company_id = support_tickets.company_id
                )
            )
        )
        AND author_id = auth.uid()
        AND author_type = 'client'
    );

CREATE POLICY "Admins can view all messages"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can create messages"
    ON support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- 7. Trigger pour mettre à jour updated_at sur support_tickets
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamp();

-- 8. Vérification finale
SELECT 'Structure support_tickets' as check_item, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'support_tickets';

SELECT 'Structure support_messages' as check_item, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'support_messages';
