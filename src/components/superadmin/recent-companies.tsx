'use client';

import Link from 'next/link';
import { Building2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  email: string;
  created_at: string;
  subscription_plan: string;
}

interface RecentCompaniesProps {
  companies: Company[];
}

const planColors: Record<string, string> = {
  STARTER: 'bg-gray-500/20 text-gray-300',
  BASIC: 'bg-blue-500/20 text-blue-300',
  PRO: 'bg-purple-500/20 text-purple-300',
  ENTERPRISE: 'bg-amber-500/20 text-amber-300',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Aujourd\'hui';
  if (diffInDays === 1) return 'Hier';
  if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function RecentCompanies({ companies }: RecentCompaniesProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Clients Récents</h3>
        <Link
          href="/superadmin/clients"
          className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
        >
          Voir tous
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {companies.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun client pour le moment</p>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
                    {company.name}
                  </p>
                  <p className="text-xs text-white/40">{company.email}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs border-0',
                    planColors[company.subscription_plan] || 'bg-gray-500/20 text-gray-300'
                  )}
                >
                  {company.subscription_plan}
                </Badge>
                <p className="text-xs text-white/30 mt-1">
                  {formatDate(company.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
