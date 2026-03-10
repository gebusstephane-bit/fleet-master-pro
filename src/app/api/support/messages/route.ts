/**
 * API Route : Support Messages
 * GET : Messages d'un ticket spécifique (ticket_id en query param)
 * POST : Ajouter un message à un ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// GET /api/support/messages?ticket_id=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Récupérer le ticket_id
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');
    
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket_id parameter' }, { status: 400 });
    }
    
    // Vérifier que l'utilisateur a accès à ce ticket
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id')
      .eq('id', ticketId)
      .single();
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    // Vérifier les permissions
    const isAdmin = profile?.role === 'ADMIN';
    if (!isAdmin && ticket.company_id !== profile?.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Récupérer les messages
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        author:author_id(first_name, last_name, email)
      `)
      .eq('ticket_id', ticketId)
      // Les clients ne voient pas les messages internes
      .or(isAdmin ? '' : 'is_internal.eq.false')
      .order('created_at', { ascending: true });
    
    if (error) {
      logger.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    return NextResponse.json({ messages });
  } catch (error) {
    logger.error('Support messages API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/support/messages
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Récupérer le body
    const body = await request.json();
    const { ticket_id, content, author_type = 'client', is_internal = false } = body;
    
    // Validation
    if (!ticket_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: ticket_id, content' },
        { status: 400 }
      );
    }
    
    // Vérifier les permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id')
      .eq('id', ticket_id)
      .single();
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    const isAdmin = profile?.role === 'ADMIN';
    
    // Un client ne peut pas poster sur un ticket d'une autre company
    if (!isAdmin && ticket.company_id !== profile?.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Un client ne peut pas créer de message interne
    if (!isAdmin && is_internal) {
      return NextResponse.json({ error: 'Cannot create internal message' }, { status: 403 });
    }
    
    // Un client doit avoir author_type = 'client'
    if (!isAdmin && author_type !== 'client') {
      return NextResponse.json({ error: 'Invalid author_type' }, { status: 403 });
    }
    
    // Créer le message
    const { data: message, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id,
        author_id: user.id,
        author_type,
        content,
        is_internal: isAdmin ? is_internal : false,
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating message:', error);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    logger.error('Support message creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
