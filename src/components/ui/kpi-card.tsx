/**
 * KPI Card - Design haut de gamme avec glassmorphism
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-blue-100 text-blue-600',
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn(
      'group relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm',
      'transition-all duration-300 ease-out',
      'hover:shadow-xl hover:-translate-y-1 hover:border-slate-300',
      className
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        <div className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
          iconBg
        )}>
          {icon}
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">
            {value}
          </span>
          {subtitle && (
            <span className="text-sm text-slate-500">{subtitle}</span>
          )}
        </div>
        
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full',
              trend.positive 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-red-100 text-red-700'
            )}>
              {trend.positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-slate-400">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton pour loading state
export function KpiCardSkeleton() {
  return (
    <Card className="border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}
