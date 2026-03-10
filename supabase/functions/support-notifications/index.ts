/**
 * Edge Function - Support Notifications
 * Envoie des emails lors de la création/réponse aux tickets
 * 
 * Déployer avec: supabase functions deploy support-notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'ticket_created' | 'ticket_replied' | 'ticket_status_changed';
  ticket_id: string;
  user_id?: string;
  message_id?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    
    // Créer client admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les infos du ticket
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*, user:user_id(email, first_name, last_name)')
      .eq('id', payload.ticket_id)
      .single();

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Envoyer l'email approprié
    switch (payload.type) {
      case 'ticket_created':
        // Notifier l'admin
        await sendAdminNotification(supabase, ticket);
        break;
        
      case 'ticket_replied':
        // Notifier l'autre partie (client ou admin)
        await sendReplyNotification(supabase, ticket, payload);
        break;
        
      case 'ticket_status_changed':
        // Notifier le client du changement de statut
        await sendStatusNotification(supabase, ticket);
        break;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendAdminNotification(supabase: any, ticket: any) {
  // Ici, intégrer avec Resend, SendGrid, ou SMTP
  // Pour l'instant, on log juste
  console.log('📧 New ticket notification:', {
    to: 'admin@fleetmaster.pro',
    subject: `Nouveau ticket #${ticket.id.slice(0, 8)}: ${ticket.subject}`,
    ticket,
  });
  
  // Exemple avec Resend (à configurer):
  // await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     from: 'support@fleetmaster.pro',
  //     to: 'admin@fleetmaster.pro',
  //     subject: `Nouveau ticket: ${ticket.subject}`,
  //     html: `...`,
  //   }),
  // });
}

async function sendReplyNotification(supabase: any, ticket: any, payload: NotificationPayload) {
  console.log('📧 Reply notification:', {
    ticket_id: ticket.id,
    message_id: payload.message_id,
  });
}

async function sendStatusNotification(supabase: any, ticket: any) {
  console.log('📧 Status change notification:', {
    to: ticket.user?.email,
    status: ticket.status,
  });
}
