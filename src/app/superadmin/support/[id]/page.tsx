/**
 * Page détail d'un ticket - SuperAdmin
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { TicketConversation } from '@/components/superadmin/ticket-conversation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Mail, Building2, User, Clock } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, string> = {
  open: 'Nouveau',
  in_progress: 'En cours',
  waiting_client: 'En attente client',
  resolved: 'Résolu',
  closed: 'Clôturé',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-500/20 text-red-300 border-red-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  waiting_client: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Normale',
  high: 'Haute',
  critical: 'Critique',
};

async function getTicket(id: string) {
  const supabase = createAdminClient();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !ticket) {
    return null;
  }

  // Récupérer les infos du user
  const { data: user } = ticket.user_id ? await supabase
    .from('profiles')
    .select('first_name, last_name, email, company_id')
    .eq('id', ticket.user_id)
    .single() : { data: null };

  // Récupérer les infos de la company
  const { data: company } = ticket.company_id ? await supabase
    .from('companies')
    .select('name')
    .eq('id', ticket.company_id)
    .single() : { data: null };

  // Récupérer les messages
  const { data: messages } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return {
    ...ticket,
    user,
    company,
    messages: messages || [],
  };
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/support">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">#{ticket.id.slice(0, 8)}</h1>
            <p className="text-white/50">{ticket.subject}</p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={statusColors[ticket.status]}
        >
          {statusLabels[ticket.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Conversation */}
        <div className="lg:col-span-2">
          <TicketConversation 
            ticket={ticket} 
            messages={ticket.messages}
          />
        </div>

        {/* Colonne droite - Infos */}
        <div className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-white/50 mt-1" />
                <div>
                  <p className="text-sm text-white/50">Client</p>
                  <p className="text-white">
                    {ticket.user?.first_name} {ticket.user?.last_name}
                  </p>
                  <p className="text-sm text-white/50">{ticket.user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-white/50 mt-1" />
                <div>
                  <p className="text-sm text-white/50">Entreprise</p>
                  <p className="text-white">{ticket.company?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-white/50 mt-1" />
                <div>
                  <p className="text-sm text-white/50">Catégorie</p>
                  <p className="text-white capitalize">{ticket.category}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-white/50 mt-1" />
                <div>
                  <p className="text-sm text-white/50">Créé le</p>
                  <p className="text-white">
                    {new Date(ticket.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/50 mb-2">Priorité</p>
                <Badge variant="outline" className="bg-white/5">
                  {priorityLabels[ticket.priority]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
