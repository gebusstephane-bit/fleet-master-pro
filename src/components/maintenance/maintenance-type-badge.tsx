'use client';

import { Badge } from '@/components/ui/badge';
import { maintenanceTypeConfig } from '@/lib/schemas/maintenance';
import { 
  Shield, Wrench, Search, Circle, Droplet, AlertCircle, 
  Filter, Cog, ClipboardCheck, MoreHorizontal 
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Shield,
  Wrench,
  Search,
  Circle,
  Droplet,
  AlertCircle,
  Filter,
  Cog,
  ClipboardCheck,
  MoreHorizontal,
};

interface MaintenanceTypeBadgeProps {
  type: keyof typeof maintenanceTypeConfig;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MaintenanceTypeBadge({ 
  type, 
  showLabel = true,
  size = 'md' 
}: MaintenanceTypeBadgeProps) {
  const config = maintenanceTypeConfig[type];
  if (!config) return null;

  const Icon = iconMap[config.icon] || Wrench;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge 
      className={`${config.color} border-0 font-medium gap-1.5 ${sizeClasses[size]}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      {showLabel && config.label}
    </Badge>
  );
}

export function MaintenanceTypeIcon({ type, className }: { type: keyof typeof maintenanceTypeConfig; className?: string }) {
  const config = maintenanceTypeConfig[type];
  if (!config) return null;
  
  const Icon = iconMap[config.icon] || Wrench;
  return <Icon className={className} />;
}
