/**
 * Support Tickets - SuperAdmin
 * Gestion des tickets de support clients
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { SupportTicketsTable } from '@/components/superadmin/support-tickets-table';
import { Ticket, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Support | SuperAdmin',
};

async function getTickets() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      companies:company_id(name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }

  return data || [];
}

export default async function SupportPage() {
  const tickets = await getTickets();

  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Support</h1>
          <p className="text-white/50 mt-1">Gérez les tickets de support clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-white/50">Ouverts</span>
          </div>
          <p className="text-3xl font-bold text-white">{openCount}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-white/50">En cours</span>
          </div>
          <p className="text-3xl font-bold text-white">{inProgressCount}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm text-white/50">Résolus</span>
          </div>
          <p className="text-3xl font-bold text-white">{resolvedCount}</p>
        </div>
      </div>

      <SupportTicketsTable tickets={tickets} />
    </div>
  );
}
