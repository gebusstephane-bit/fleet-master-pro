'use client';

/**
 * Hooks React Query pour le système de support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import type { 
  SupportTicket, 
  SupportMessage, 
  CreateTicketInput, 
  CreateMessageInput,
  TicketStatus
} from '@/types/support';

// Clés de cache
const supportKeys = {
  all: ['support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
  messages: (ticketId: string) => [...supportKeys.all, 'messages', ticketId] as const,
  stats: () => [...supportKeys.all, 'stats'] as const,
};

// Hook: Récupérer les tickets de l'utilisateur (simplifié, sans jointures complexes)
export function useSupportTickets(options?: { enabled?: boolean }) {
  const { user } = useUserContext();
  
  return useQuery<SupportTicket[]>({
    queryKey: supportKeys.tickets(),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      // Requête simple sans jointures problématiques
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('useSupportTickets error:', error);
        throw error;
      }
      
      return (data || []) as SupportTicket[];
    },
    enabled: !!user && options?.enabled !== false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook: Récupérer un ticket spécifique avec ses messages
export function useSupportTicket(ticketId: string) {
  const { user } = useUserContext();
  
  return useQuery<{ ticket: SupportTicket; messages: SupportMessage[] }>({
    queryKey: supportKeys.ticket(ticketId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      // Récupérer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      
      if (ticketError) {
        console.error('useSupportTicket - ticket error:', ticketError);
        throw ticketError;
      }
      
      // Récupérer les messages
      const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        console.error('useSupportTicket - messages error:', messagesError);
        throw messagesError;
      }
      
      return {
        ticket: ticket as SupportTicket,
        messages: (messages || []) as SupportMessage[],
      };
    },
    enabled: !!user && !!ticketId,
    staleTime: 1000 * 30, // 30 secondes
  });
}

// Hook: Créer un ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }
      
      const supabase = getSupabaseClient();
      
      // Récupérer la company_id du user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Impossible de récupérer votre profil');
      }
      
      if (!profile?.company_id) {
        throw new Error('Vous devez être associé à une entreprise pour créer un ticket');
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { page_url, ...ticketData } = input;
      
      // Inclure l'URL de la page dans la description si fournie
      const fullDescription = page_url 
        ? `[Page: ${page_url}]\n\n${input.description}` 
        : input.description;
      
      const insertData = {
        subject: ticketData.subject,
        description: fullDescription,
        category: ticketData.category,
        priority: input.priority || 'medium',
        user_id: user.id,
        company_id: profile.company_id,
        status: 'open' as const,
      };
      
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Erreur création ticket: ${error.message}`);
      }
      
      return data as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
  });
}

// Hook: Mettre à jour le statut d'un ticket (pour le workflow)
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId)
        .select()
        .single();
      
      if (error) {
        console.error('Update status error:', error);
        throw error;
      }
      
      return data as SupportTicket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: supportKeys.ticket(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
  });
}

// Hook: Ajouter un message
export function useCreateMessage() {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  
  return useMutation({
    mutationFn: async (input: CreateMessageInput) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          ...input,
          author_id: user.id,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Create message error:', error);
        throw error;
      }
      
      return data as SupportMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: supportKeys.messages(variables.ticket_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: supportKeys.ticket(variables.ticket_id) 
      });
    },
  });
}

// Hook: Statistiques (pour le badge)
export function useSupportStats() {
  const { user } = useUserContext();
  
  return useQuery<{ open: number; in_progress: number; resolved: number }>({
    queryKey: supportKeys.stats(),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('status');
      
      if (error) throw error;
      
      const tickets = data || [];
      
      return {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 secondes
  });
}
