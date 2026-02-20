'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showSubtitle?: boolean;
  showAction?: boolean;
  className?: string;
}

/**
 * ListSkeleton - Loading state for list items
 * 
 * Usage:
 * ```tsx
 * if (isLoading) return <ListSkeleton items={5} showAvatar showSubtitle />;
 * ```
 */
export function ListSkeleton({
  items = 5,
  showAvatar = true,
  showSubtitle = true,
  showAction = true,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 rounded-lg border border-slate-700/50 bg-[#18181b]/50"
        >
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
          
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-full max-w-[200px]" />
            {showSubtitle && <Skeleton className="h-3 w-full max-w-[140px]" />}
          </div>

          {showAction && <Skeleton className="h-8 w-8 rounded shrink-0" />}
        </div>
      ))}
    </div>
  );
}
