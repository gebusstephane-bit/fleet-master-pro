-- ============================================
-- FIX SUPPORT RLS V2 - Permettre aux users de voir leurs tickets
-- ============================================

-- Désactiver et réactiver RLS
ALTER TABLE IF EXISTS support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "tickets_select_company" ON support_tickets;
DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;
DROP POLICY IF EXISTS "tickets_admin_all" ON support_tickets;
DROP POLICY IF EXISTS "tickets_update" ON support_tickets;
DROP POLICY IF EXISTS "tickets_delete" ON support_tickets;
DROP POLICY IF EXISTS "tickets_select" ON support_tickets;
DROP POLICY IF EXISTS "tickets_insert" ON support_tickets;
DROP POLICY IF EXISTS "messages_select" ON support_messages;
DROP POLICY IF EXISTS "messages_insert" ON support_messages;
DROP POLICY IF EXISTS "messages_admin_modify" ON support_messages;
DROP POLICY IF EXISTS "Users can view own company tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view messages from own tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages on own tickets" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can create messages" ON support_messages;

-- ============================================
-- POLICIES SUPPORT TICKETS
-- ============================================

-- SELECT: Users can see their own tickets OR tickets from their company OR admins see all
CREATE POLICY "tickets_select"
    ON support_tickets FOR SELECT
    USING (
        -- Son propre ticket (par user_id)
        user_id = auth.uid()
        -- OU ticket de sa company
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = support_tickets.company_id
        )
        -- OU admin voit tout
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- INSERT: Users can create tickets for themselves
CREATE POLICY "tickets_insert"
    ON support_tickets FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );

-- UPDATE: Users can update their own tickets (pour ajouter des messages) + Admins can update all
CREATE POLICY "tickets_update"
    ON support_tickets FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- DELETE: Only admins
CREATE POLICY "tickets_delete"
    ON support_tickets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- ============================================
-- POLICIES SUPPORT MESSAGES
-- ============================================

-- SELECT: Voir les messages des tickets accessibles
CREATE POLICY "messages_select"
    ON support_messages FOR SELECT
    USING (
        -- Le ticket appartient à l'user
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_messages.ticket_id
            AND support_tickets.user_id = auth.uid()
        )
        -- OU le ticket est de sa company
        OR EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_messages.ticket_id
            AND p.company_id = st.company_id
        )
        -- OU admin
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- INSERT: Créer des messages sur les tickets accessibles
CREATE POLICY "messages_insert"
    ON support_messages FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND (
            -- Son propre ticket
            EXISTS (
                SELECT 1 FROM support_tickets
                WHERE support_tickets.id = support_messages.ticket_id
                AND support_tickets.user_id = auth.uid()
            )
            -- OU ticket de sa company
            OR EXISTS (
                SELECT 1 FROM support_tickets st
                JOIN profiles p ON p.id = auth.uid()
                WHERE st.id = support_messages.ticket_id
                AND p.company_id = st.company_id
            )
            -- OU admin
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'ADMIN'
            )
        )
    );

-- UPDATE/DELETE: Admins only
CREATE POLICY "messages_admin_modify"
    ON support_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- ============================================
-- DROITS (sans les séquences qui n'existent pas)
-- ============================================
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_messages TO authenticated;

-- ============================================
-- FIX: S'assurer que les tables existent avec les bonnes colonnes
-- ============================================
DO $$
BEGIN
    -- Vérifier si la table support_tickets existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'support_tickets'
    ) THEN
        -- Ajouter les colonnes manquantes si besoin
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'category'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN category VARCHAR(50) DEFAULT 'other';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'assigned_to'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN assigned_to UUID REFERENCES profiles(id);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN user_id UUID REFERENCES profiles(id);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'description'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN description TEXT DEFAULT '';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
    
    -- Vérifier si la table support_messages existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'support_messages'
    ) THEN
        CREATE TABLE support_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            author_id UUID REFERENCES profiles(id),
            author_type VARCHAR(20) DEFAULT 'client' CHECK (author_type IN ('client', 'admin', 'system')),
            content TEXT NOT NULL,
            is_internal BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
    END IF;
END $$;

SELECT 'RLS V2 policies updated successfully' as status;
