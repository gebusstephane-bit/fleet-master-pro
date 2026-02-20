/**
 * Gestion des Clients - SuperAdmin
 * Liste et gestion de toutes les entreprises clientes
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { ClientsTable } from '@/components/superadmin/clients-table';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Users, Filter } from 'lucide-react';

export const metadata = {
  title: 'Clients | SuperAdmin',
};

interface Company {
  id: string;
  name: string;
  siret: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

async function getCompanies(search?: string, plan?: string): Promise<Company[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('companies')
    .select(`
      *,
      profiles:profiles(count),
      subscriptions:subscriptions(*)
    `)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,siret.ilike.%${search}%`);
  }

  if (plan && plan !== 'all') {
    query = query.eq('subscription_plan', plan);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }

  // @ts-ignore
  return (data || []) as Company[];
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { search?: string; plan?: string };
}) {
  const companies = await getCompanies(searchParams.search, searchParams.plan);

  // Stats
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c: any) => c.subscription_status === 'active').length;
  const trialCompanies = companies.filter((c: any) => c.subscription_status === 'trialing').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clients</h1>
          <p className="text-white/50 mt-1">
            Gérez toutes les entreprises inscrites sur la plateforme
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalCompanies}</p>
            <p className="text-sm text-white/50">Total clients</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeCompanies}</p>
            <p className="text-sm text-white/50">Abonnements actifs</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Filter className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{trialCompanies}</p>
            <p className="text-sm text-white/50">En période d&apos;essai</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher par nom, email, SIRET..."
            className="w-full h-11 pl-4 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
          />
        </div>
        <select className="h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50">
          <option value="all">Tous les plans</option>
          <option value="STARTER">Starter</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select className="h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50">
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="trialing">En essai</option>
          <option value="past_due">Impayé</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      {/* Table */}
      <ClientsTable companies={companies as any} />
    </div>
  );
}
