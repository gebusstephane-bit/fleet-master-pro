'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MoreHorizontal, ExternalLink, RefreshCw, XCircle } from 'lucide-react';

interface Subscription {
  id: string;
  company_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  vehicle_limit: number;
  user_limit: number;
  created_at: string;
  companies?: {
    name: string;
    email: string;
  } | null;
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
}

const planPrices: Record<string, number> = {
  STARTER: 0,
  BASIC: 29,
  PRO: 49,
  ENTERPRISE: 0,
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-300 border-green-500/30',
  TRIALING: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PAST_DUE: 'bg-red-500/20 text-red-300 border-red-500/30',
  CANCELED: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  UNPAID: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const planColors: Record<string, string> = {
  STARTER: 'bg-gray-500/20 text-gray-300',
  BASIC: 'bg-blue-500/20 text-blue-300',
  PRO: 'bg-purple-500/20 text-purple-300',
  ENTERPRISE: 'bg-amber-500/20 text-amber-300',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function SubscriptionsTable({ subscriptions }: SubscriptionsTableProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <CreditCard className="w-16 h-16 mx-auto mb-4 text-white/20" />
        <h3 className="text-lg font-medium text-white mb-2">Aucun abonnement</h3>
        <p className="text-white/50">Les abonnements apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Période
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-white/50 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {subscriptions.map((sub) => {
              const daysLeft = getDaysUntil(sub.current_period_end);
              const price = planPrices[sub.plan] || 0;

              return (
                <tr key={sub.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {sub.companies?.name || 'Inconnu'}
                      </p>
                      <p className="text-xs text-white/40">{sub.companies?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs border-0', planColors[sub.plan])}
                    >
                      {sub.plan}
                    </Badge>
                    <p className="text-xs text-white/40 mt-1">
                      {sub.vehicle_limit} véh. / {sub.user_limit} users
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-medium',
                        statusColors[sub.status] || 'bg-gray-500/20 text-gray-300'
                      )}
                    >
                      {sub.status}
                    </Badge>
                    {sub.trial_ends_at && sub.status === 'TRIALING' && (
                      <p className="text-xs text-blue-400 mt-1">
                        Essai fin dans {getDaysUntil(sub.trial_ends_at)}j
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-white/60">{formatDate(sub.current_period_end)}</p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      daysLeft < 7 ? 'text-red-400' : 'text-white/40'
                    )}>
                      {daysLeft > 0 ? `${daysLeft} jours restants` : 'Expiré'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">
                      {price > 0 ? `€${price}/mois` : 'Gratuit'}
                    </p>
                    {sub.stripe_subscription_id && (
                      <p className="text-xs text-white/40 font-mono mt-0.5">
                        {sub.stripe_subscription_id.slice(-8)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-[#1a1a1a] border-white/10 text-white"
                      >
                        {sub.stripe_customer_id && (
                          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Voir sur Stripe
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Synchroniser
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-red-500/20 cursor-pointer text-red-400">
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler abonnement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { CreditCard } from 'lucide-react';
