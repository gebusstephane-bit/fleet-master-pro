'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  ExternalLink,
  Edit,
  Trash2,
  Ban
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  siret: string;
  city: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  profiles?: { count: number }[];
  subscriptions?: {
    vehicle_limit: number;
    user_limit: number;
  }[];
}

interface ClientsTableProps {
  companies: Company[];
}

const planColors: Record<string, string> = {
  STARTER: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  BASIC: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PRO: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ENTERPRISE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  trialing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  past_due: 'bg-red-500/20 text-red-300 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ClientsTable({ companies }: ClientsTableProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  if (companies.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <Building2 className="w-16 h-16 mx-auto mb-4 text-white/20" />
        <h3 className="text-lg font-medium text-white mb-2">Aucun client trouvé</h3>
        <p className="text-white/50">Essayez de modifier vos filtres de recherche</p>
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
                Entreprise
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Utilisateurs
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Inscription
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-white/50 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {companies.map((company) => (
              <tr 
                key={company.id}
                className="hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {company.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{company.name}</p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Mail className="w-3 h-3" />
                        {company.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-medium',
                      planColors[company.subscription_plan] || 'bg-gray-500/20 text-gray-300'
                    )}
                  >
                    {company.subscription_plan}
                  </Badge>
                  {company.subscriptions && company.subscriptions[0] && (
                    <p className="text-xs text-white/40 mt-1">
                      {company.subscriptions[0].vehicle_limit} véh. / {company.subscriptions[0].user_limit} users
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-medium capitalize',
                      statusColors[company.subscription_status] || 'bg-gray-500/20 text-gray-300'
                    )}
                  >
                    {company.subscription_status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-white">
                    {company.profiles?.[0]?.count || 0} utilisateurs
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-white/60">{formatDate(company.created_at)}</p>
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
                      <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir détails
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="focus:bg-white/10 cursor-pointer text-yellow-400">
                        <Ban className="w-4 h-4 mr-2" />
                        Suspendre
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-red-500/20 cursor-pointer text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
