/**
 * Empty State - Design premium avec illustration
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        'bg-white/50 rounded-2xl border border-dashed border-slate-200',
        className
      )}
    >
      <div className="relative">
        {/* Background glow */}
        <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-2xl scale-150" />
        
        {/* Icon container */}
        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center mb-6">
          <Icon className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        {description}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          className="gap-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
