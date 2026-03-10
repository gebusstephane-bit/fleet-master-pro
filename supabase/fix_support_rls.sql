-- ============================================
-- FIX SUPPORT RLS - Simplification des policies
-- ============================================

-- 1. Désactiver et réactiver RLS pour nettoyer
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "Users can view own company tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view messages from own tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages on own tickets" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can create messages" ON support_messages;

-- Supprimer aussi les policies avec noms légèrement différents
DROP POLICY IF EXISTS "Enable read access for users own company tickets" ON support_tickets;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON support_tickets;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON support_tickets;
DROP POLICY IF EXISTS "Enable read access for all users" ON support_tickets;

-- 3. Créer des policies SIMPLIFIÉES

-- TICKETS: Les utilisateurs authentifiés peuvent voir les tickets de leur entreprise
CREATE POLICY "tickets_select_company"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.company_id = support_tickets.company_id 
                OR profiles.role = 'ADMIN'
            )
        )
    );

-- TICKETS: Les utilisateurs peuvent créer des tickets pour leur entreprise
CREATE POLICY "tickets_insert_own"
    ON support_tickets FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = support_tickets.company_id
        )
    );

-- TICKETS: Les admins peuvent tout modifier
CREATE POLICY "tickets_admin_all"
    ON support_tickets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- MESSAGES: Voir les messages des tickets accessibles
CREATE POLICY "messages_select"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_messages.ticket_id
            AND (
                p.company_id = st.company_id 
                OR p.role = 'ADMIN'
                OR (support_messages.is_internal = false AND st.user_id = auth.uid())
            )
        )
    );

-- MESSAGES: Créer des messages sur ses tickets
CREATE POLICY "messages_insert"
    ON support_messages FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_messages.ticket_id
            AND (
                p.company_id = st.company_id 
                OR p.role = 'ADMIN'
            )
        )
    );

-- MESSAGES: Admins peuvent tout faire
CREATE POLICY "messages_admin_all"
    ON support_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- 4. Vérifier que les tables ont les bonnes colonnes
DO $$
BEGIN
    -- S'assurer que category a une valeur par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'category'
    ) THEN
        ALTER TABLE support_tickets ALTER COLUMN category SET DEFAULT 'other';
    END IF;
    
    -- S'assurer que priority a une valeur par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'priority'
    ) THEN
        ALTER TABLE support_tickets ALTER COLUMN priority SET DEFAULT 'medium';
    END IF;
    
    -- S'assurer que status a une valeur par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'status'
    ) THEN
        ALTER TABLE support_tickets ALTER COLUMN status SET DEFAULT 'open';
    END IF;
END $$;

-- 5. Donner les droits à authenticated
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_messages TO authenticated;
GRANT USAGE ON SEQUENCE support_tickets_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE support_messages_id_seq TO authenticated;

SELECT 'RLS policies updated successfully' as status;
