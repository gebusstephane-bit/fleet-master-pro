/**
 * Dashboard SuperAdmin
 * Vue d'ensemble de la plateforme Fleet Master Pro
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { StatCard } from '@/components/superadmin/stat-card';
import { RevenueChart } from '@/components/superadmin/revenue-chart';
import { RecentCompanies } from '@/components/superadmin/recent-companies';
import { ActivityFeed } from '@/components/superadmin/activity-feed';
import { 
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard SuperAdmin | Fleet Master Pro',
};

interface Company {
  id: string;
  name: string;
  email: string;
  created_at: string;
  subscription_plan: string | null;
}

interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

async function getDashboardStats() {
  const supabase = createAdminClient();

  // Total clients
  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  // Total utilisateurs
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Abonnements actifs
  const { count: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    // @ts-ignore
    .eq('status', 'active');

  // Abonnements en essai
  const { count: trialSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    // @ts-ignore
    .eq('status', 'trialing');

  // Tickets support ouverts
  const { count: openTickets } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })
    // @ts-ignore
    .eq('status', 'open');

  // Récupérer les entreprises récentes
  const { data: recentCompanies } = await supabase
    .from('companies')
    .select('id, name, email, created_at, subscription_plan')
    .order('created_at', { ascending: false })
    .limit(5);

  // Récupérer les activités récentes
  const { data: recentActivities } = await supabase
    .from('activity_logs')
    // @ts-ignore
    .select('id, action, entity_type, entity_id, created_at, profiles(email)')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    totalCompanies: totalCompanies || 0,
    totalUsers: totalUsers || 0,
    activeSubscriptions: activeSubscriptions || 0,
    trialSubscriptions: trialSubscriptions || 0,
    openTickets: openTickets || 0,
    recentCompanies: (recentCompanies || []) as Company[],
    recentActivities: ((recentActivities as unknown) || []) as Activity[],
  };
}

export default async function SuperAdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 mt-1">
          Vue d&apos;ensemble de votre plateforme Fleet Master Pro
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Clients Total"
          value={stats.totalCompanies}
          iconName="Building2"
          trend={{ value: 12, isPositive: true }}
          description="Entreprises inscrites"
        />
        <StatCard
          title="Utilisateurs"
          value={stats.totalUsers}
          iconName="Users"
          trend={{ value: 8, isPositive: true }}
          description="Comptes actifs"
        />
        <StatCard
          title="Abonnements Actifs"
          value={stats.activeSubscriptions}
          iconName="CreditCard"
          trend={{ value: 5, isPositive: true }}
          description="Paiements à jour"
        />
        <StatCard
          title="Essais en Cours"
          value={stats.trialSubscriptions}
          iconName="Clock"
          description="Clients en période d&apos;essai"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-sm text-white/50">Uptime plateforme</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.openTickets}</p>
              <p className="text-sm text-white/50">Tickets ouverts</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">€2,450</p>
              <p className="text-sm text-white/50">MRR (Monthly Recurring Revenue)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <RecentCompanies companies={stats.recentCompanies as any} />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={stats.recentActivities as any} />
    </div>
  );
}
