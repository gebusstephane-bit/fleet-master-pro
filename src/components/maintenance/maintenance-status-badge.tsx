'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type MaintenanceStatus = 
  | 'DEMANDE_CREEE'
  | 'VALIDEE'
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
    className: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200',
  },
  VALIDEE: {
    label: 'Validée',
    className: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
  },
  VALIDEE_DIRECTEUR: {
    label: 'Validée',
    className: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
  },
  RDV_PRIS: {
    label: 'RDV pris',
    className: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
  },
  EN_COURS: {
    label: 'En cours',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  },
  TERMINEE: {
    label: 'Terminée',
    className: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
  },
  REFUSEE: {
    label: 'Refusée',
    className: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
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
