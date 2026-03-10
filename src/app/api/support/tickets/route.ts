/**
 * API Route : Support Tickets
 * GET : Liste des tickets de l'utilisateur connecté
 * POST : Création d'un nouveau ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';

// GET /api/support/tickets
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Récupérer le profil pour la company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id(first_name, last_name, email),
        assigned_to_user:assigned_to(first_name, last_name)
      `)
      .order('created_at', { ascending: false });
    
    // Si pas admin, filtrer par company
    if (!profile?.role || profile.role !== 'ADMIN') {
      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Error fetching tickets:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    return NextResponse.json({ tickets: data });
  } catch (error) {
    logger.error('Support tickets API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/support/tickets
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
    const { subject, description, category, priority = 'medium', page_url } = body;
    
    // Validation
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, description, category' },
        { status: 400 }
      );
    }
    
    // Récupérer la company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    
    // Créer le ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        company_id: profile?.company_id,
        subject,
        description: page_url ? `[Page: ${page_url}]\n\n${description}` : description,
        category,
        priority,
        status: 'open',
      })
      .select()
      .single();
    
    if (ticketError) {
      logger.error('Error creating ticket:', ticketError);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
    
    // Envoyer une notification email à l'admin (async, ne bloque pas la réponse)
    // Note: À remplacer par votre service d'email (Resend)
    try {
      // await sendSupportNotification(ticket);
    } catch (emailError) {
      logger.error('Failed to send email notification:', emailError);
      // Ne pas bloquer la création du ticket si l'email échoue
    }
    
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    logger.error('Support ticket creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
