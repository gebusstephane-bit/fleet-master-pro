/**
 * Page Header - Composant réutilisable premium
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  };
  backHref?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  backHref,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-slate-100"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-slate-500 mt-1 text-sm sm:text-base">{description}</p>
          )}
        </div>
      </div>
      
      {action && (
        action.href ? (
          <Button asChild className="gap-2 shadow-sm hover:shadow-md transition-shadow">
            <Link href={action.href}>
              {action.icon || <Plus className="h-4 w-4" />}
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button 
            onClick={action.onClick} 
            className="gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            {action.icon || <Plus className="h-4 w-4" />}
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
