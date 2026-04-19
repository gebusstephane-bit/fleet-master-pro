'use client';

/**
 * Liste des tickets de support avec filtres
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupportTickets } from '@/hooks/use-support';
import { 
  TICKET_STATUS_LABELS, 
  TICKET_PRIORITY_LABELS,
  type SupportTicket,
  type TicketStatus 
} from '@/types/support';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const statusConfig: Record<TicketStatus, { icon: React.ElementType; color: string; bg: string }> = {
  open: { 
    icon: AlertCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10 border-red-500/20' 
  },
  in_progress: { 
    icon: Clock, 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10 border-yellow-500/20' 
  },
  waiting_client: { 
    icon: MessageSquare, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10 border-blue-500/20' 
  },
  resolved: { 
    icon: CheckCircle2, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10 border-emerald-500/20' 
  },
  closed: { 
    icon: CheckCircle2, 
    color: 'text-slate-400', 
    bg: 'bg-slate-500/10 border-slate-500/20' 
  },
};

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

interface TicketListProps {
  onSelectTicket?: (ticket: SupportTicket) => void;
  selectedTicketId?: string;
}

export function TicketList({ onSelectTicket, selectedTicketId }: TicketListProps) {
  const { data: tickets, isLoading } = useSupportTickets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  
  // Filtrer les tickets
  const filteredTickets = tickets?.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  // Grouper par statut pour l'affichage
  const groupedTickets = filteredTickets?.reduce((acc, ticket) => {
    if (!acc[ticket.status]) acc[ticket.status] = [];
    acc[ticket.status].push(ticket);
    return acc;
  }, {} as Record<TicketStatus, SupportTicket[]>);
  
  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-slate-900 border-slate-700 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-cyan-400" />
          Mes tickets
          {tickets && tickets.length > 0 && (
            <Badge className="bg-slate-700 text-slate-300">
              {tickets.length}
            </Badge>
          )}
        </CardTitle>
        
        {/* Filtres */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Rechercher un ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <FilterChip 
              label="Tous" 
              active={statusFilter === 'all'} 
              onClick={() => setStatusFilter('all')}
              count={tickets?.length}
            />
            {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map(status => {
              const count = tickets?.filter(t => t.status === status).length;
              if (count === 0) return null;
              return (
                <FilterChip
                  key={status}
                  label={TICKET_STATUS_LABELS[status]}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                  count={count}
                />
              );
            })}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {!filteredTickets || filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Aucun ticket trouvé</p>
            <p className="text-sm mt-1">
              {tickets?.length === 0 
                ? "Vous n'avez pas encore créé de ticket."
                : "Aucun ticket ne correspond à votre recherche."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredTickets.map(ticket => (
              <TicketItem 
                key={ticket.id} 
                ticket={ticket}
                isSelected={ticket.id === selectedTicketId}
                onClick={() => onSelectTicket?.(ticket)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilterChip({ 
  label, 
  active, 
  onClick, 
  count 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        active 
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 text-slate-500">{count}</span>
      )}
    </button>
  );
}

function TicketItem({ 
  ticket, 
  isSelected, 
  onClick 
}: { 
  ticket: SupportTicket; 
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const config = statusConfig[ticket.status];
  const StatusIcon = config.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all',
        'hover:bg-slate-800/50',
        isSelected 
          ? 'bg-slate-800 border-cyan-500/30 ring-1 ring-cyan-500/20' 
          : 'bg-slate-800/30 border-slate-700'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('p-1 rounded', config.bg)}>
              <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
            </div>
            <span className={cn('text-xs', config.color)}>
              {TICKET_STATUS_LABELS[ticket.status]}
            </span>
            <Badge 
              variant="outline" 
              className={cn('text-xs ml-auto', priorityColors[ticket.priority])}
            >
              {TICKET_PRIORITY_LABELS[ticket.priority]}
            </Badge>
          </div>
          
          <h4 className="font-medium text-white text-sm truncate">
            #{ticket.id.slice(0, 8)} - {ticket.subject}
          </h4>
          
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {ticket.description}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
            {ticket.message_count !== undefined && ticket.message_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.message_count} message{ticket.message_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
      </div>
    </button>
  );
}
