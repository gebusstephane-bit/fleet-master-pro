/**
 * Types du système de support
 */

export type TicketStatus = 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'bug' | 'billing' | 'feature' | 'training' | 'other';
export type AuthorType = 'client' | 'admin' | 'system';

export interface SupportTicket {
  id: string;
  company_id: string | null;
  user_id: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  assigned_to_user?: {
    first_name: string;
    last_name: string;
  } | null;
  message_count?: number;
  last_message_at?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_type: AuthorType;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  page_url?: string;
}

export interface CreateMessageInput {
  ticket_id: string;
  content: string;
  author_type: AuthorType;
  is_internal?: boolean;
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: '🐛 Bug technique',
  billing: '💳 Facturation',
  feature: '✨ Nouvelle fonctionnalité',
  training: '🎓 Formation / Aide',
  other: '📝 Autre',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Nouveau',
  in_progress: 'En cours',
  waiting_client: 'En attente',
  resolved: 'Résolu',
  closed: 'Clôturé',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Normale',
  high: 'Haute',
  critical: 'Critique',
};
