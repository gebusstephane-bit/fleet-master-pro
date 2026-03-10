-- ============================================
-- SETUP NOTIFICATIONS EMAIL SUPPORT
-- ============================================

-- 1. Table pour stocker les notifications en attente (fallback si edge function fail)
CREATE TABLE IF NOT EXISTS support_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id),
    type VARCHAR(50) NOT NULL, -- 'ticket_created', 'ticket_replied', 'status_changed'
    recipient_email VARCHAR(255),
    subject VARCHAR(500),
    content TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Index pour perf
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON support_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_ticket ON support_notification_queue(ticket_id);

-- 2. Trigger: Quand un ticket est créé
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Insérer dans la queue
    INSERT INTO support_notification_queue (ticket_id, type, status)
    VALUES (NEW.id, 'ticket_created', 'pending');
    
    -- Appeler l'edge function (async)
    PERFORM net.http_post(
        url := CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/support-notifications'),
        headers := jsonb_build_object(
            'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key')),
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'type', 'ticket_created',
            'ticket_id', NEW.id,
            'user_id', NEW.user_id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_created_notification ON support_tickets;
CREATE TRIGGER ticket_created_notification
    AFTER INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_created();

-- 3. Trigger: Quand un message est ajouté
CREATE OR REPLACE FUNCTION notify_ticket_replied()
RETURNS TRIGGER AS $$
DECLARE
    v_ticket_user_id UUID;
BEGIN
    -- Récupérer le user_id du ticket
    SELECT user_id INTO v_ticket_user_id
    FROM support_tickets WHERE id = NEW.ticket_id;
    
    -- Si c'est l'admin qui répond, notifier le client
    IF NEW.author_type = 'admin' AND v_ticket_user_id IS NOT NULL THEN
        INSERT INTO support_notification_queue (ticket_id, type, status)
        VALUES (NEW.ticket_id, 'ticket_replied', 'pending');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_replied_notification ON support_messages;
CREATE TRIGGER ticket_replied_notification
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_replied();

-- 4. Trigger: Quand le statut change
CREATE OR REPLACE FUNCTION notify_status_changed()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO support_notification_queue (ticket_id, type, status)
        VALUES (NEW.id, 'status_changed', 'pending');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_status_notification ON support_tickets;
CREATE TRIGGER ticket_status_notification
    AFTER UPDATE ON support_tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_status_changed();

-- 5. Permissions
GRANT ALL ON support_notification_queue TO authenticated;
GRANT ALL ON support_notification_queue TO service_role;

-- Enable RLS on notification queue
ALTER TABLE support_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_queue_select"
    ON support_notification_queue FOR SELECT
    USING (true);
    
CREATE POLICY "notification_queue_insert"
    ON support_notification_queue FOR INSERT
    WITH CHECK (true);

SELECT 'Support notifications setup complete' as status;
