'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * StatsGridSkeleton - Loading state for statistics cards grid
 * 
 * Usage:
 * ```tsx
 * if (isLoading) return <StatsGridSkeleton count={4} columns={4} />;
 * ```
 */
export function StatsGridSkeleton({
  count = 4,
  columns = 4,
  className,
}: StatsGridSkeletonProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-700 bg-[#18181b] p-6"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
