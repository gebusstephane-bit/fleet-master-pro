'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type MaintenanceStatus = 
  | 'DEMANDE_CREEE'
  | 'VALIDEE_DIRECTEUR'
  | 'RDV_PRIS'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'REFUSEE';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<MaintenanceStatus, { label: string; className: string }> = {
  DEMANDE_CREEE: {
    label: 'Demande créée',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  },
  VALIDEE_DIRECTEUR: {
    label: 'Validée',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  },
  RDV_PRIS: {
    label: 'RDV pris',
    className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  },
  EN_COURS: {
    label: 'En cours',
    className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
  },
  TERMINEE: {
    label: 'Terminée',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  },
  REFUSEE: {
    label: 'Refusée',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  },
};

export function MaintenanceStatusBadge({ status, size = 'md' }: MaintenanceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DEMANDE_CREEE;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'px-2.5 py-0.5'
      )}
    >
      {config.label}
    </Badge>
  );
}
