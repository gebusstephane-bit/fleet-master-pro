import { 
  LucideIcon, 
  TrendingUp, 
  TrendingDown,
  Building2,
  Users,
  CreditCard,
  Clock,
  Car,
  Wrench,
  ClipboardCheck,
  TrendingUpIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapping des noms d'icônes vers les composants
const iconMap: Record<string, LucideIcon> = {
  Building2,
  Users,
  CreditCard,
  Clock,
  Car,
  Wrench,
  ClipboardCheck,
  TrendingUpIcon,
};

interface StatCardProps {
  title: string;
  value: number | string;
  iconName: keyof typeof iconMap;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  iconName, 
  trend, 
  description,
  className 
}: StatCardProps) {
  const Icon = iconMap[iconName];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6",
      "transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20",
      "group",
      className
    )}>
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{title}</p>
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            {Icon && <Icon className="w-5 h-5 text-white/70" />}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {description && (
            <span className="text-xs text-white/40">{description}</span>
          )}
        </div>
      </div>
    </div>
  );
}
