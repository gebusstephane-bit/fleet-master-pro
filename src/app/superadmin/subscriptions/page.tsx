/**
 * Gestion des Abonnements - SuperAdmin
 * Vue d'ensemble de tous les abonnements Stripe
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { SubscriptionsTable } from '@/components/superadmin/subscriptions-table';
import { Button } from '@/components/ui/button';
import { CreditCard, TrendingUp, AlertCircle, Clock } from 'lucide-react';

export const metadata = {
  title: 'Abonnements | SuperAdmin',
};

interface Subscription {
  id: string;
  company_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
  updated_at: string;
  companies?: {
    name: string;
    email: string;
  } | null;
}

async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      companies:company_id(name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }

  // @ts-ignore
  return (data || []) as Subscription[];
}

export default async function SubscriptionsPage() {
  const subscriptions = await getSubscriptions();

  // Stats
  const totalMrr = subscriptions
    .filter((s: any) => s.status === 'ACTIVE')
    .reduce((acc: number, s: any) => {
      const price = s.plan === 'PRO' ? 49 : s.plan === 'BASIC' ? 29 : 0;
      return acc + price;
    }, 0);

  const activeCount = subscriptions.filter((s: any) => s.status === 'ACTIVE').length;
  const trialCount = subscriptions.filter((s: any) => s.status === 'TRIALING').length;
  const pastDueCount = subscriptions.filter((s: any) => s.status === 'PAST_DUE').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Abonnements</h1>
          <p className="text-white/50 mt-1">
            Gérez tous les abonnements et facturations
          </p>
        </div>
        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
          <CreditCard className="w-4 h-4" />
          Voir Stripe Dashboard
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-sm text-white/50">MRR Total</span>
          </div>
          <p className="text-3xl font-bold text-white">€{totalMrr}</p>
          <p className="text-xs text-white/40 mt-1">Revenu mensuel récurrent</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-white/50">Actifs</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeCount}</p>
          <p className="text-xs text-white/40 mt-1">Abonnements payants</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-white/50">En essai</span>
          </div>
          <p className="text-3xl font-bold text-white">{trialCount}</p>
          <p className="text-xs text-white/40 mt-1">Période d&apos;essai 14j</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-white/50">Impayés</span>
          </div>
          <p className="text-3xl font-bold text-white">{pastDueCount}</p>
          <p className="text-xs text-white/40 mt-1">Paiement en échec</p>
        </div>
      </div>

      {/* Subscriptions Table */}
      <SubscriptionsTable subscriptions={subscriptions as any} />
    </div>
  );
}
