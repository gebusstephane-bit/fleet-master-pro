'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Eye, Ticket } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  companies?: {
    name: string;
    email: string;
  } | null;
}

interface SupportTicketsTableProps {
  tickets: Ticket[];
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-500/20 text-red-300 border-red-500/30',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  RESOLVED: 'bg-green-500/20 text-green-300 border-green-500/30',
  CLOSED: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-blue-500/20 text-blue-300',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300',
  HIGH: 'bg-orange-500/20 text-orange-300',
  CRITICAL: 'bg-red-500/20 text-red-300',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SupportTicketsTable({ tickets }: SupportTicketsTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <Ticket className="w-16 h-16 mx-auto mb-4 text-white/20" />
        <h3 className="text-lg font-medium text-white mb-2">Aucun ticket</h3>
        <p className="text-white/50">Les tickets de support apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase">Ticket</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase">Client</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase">Statut</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase">Priorité</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase">Créé</th>
            <th className="px-6 py-4 text-right text-xs font-medium text-white/50 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-white/[0.03]">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <p className="text-sm font-medium text-white">{ticket.subject}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-white">{ticket.companies?.name}</p>
                <p className="text-xs text-white/40">{ticket.companies?.email}</p>
              </td>
              <td className="px-6 py-4">
                <Badge variant="outline" className={cn('text-xs', statusColors[ticket.status])}>
                  {ticket.status}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant="secondary" className={cn('text-xs border-0', priorityColors[ticket.priority])}>
                  {ticket.priority}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-white/60">{formatDate(ticket.created_at)}</p>
              </td>
              <td className="px-6 py-4 text-right">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                  <Eye className="w-4 h-4 mr-2" />
                  Voir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
