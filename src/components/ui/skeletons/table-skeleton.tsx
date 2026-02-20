'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  showToolbar?: boolean;
  className?: string;
}

/**
 * TableSkeleton - Loading state for data tables
 * 
 * Usage:
 * ```tsx
 * if (isLoading) return <TableSkeleton columns={5} rows={8} showToolbar />;
 * ```
 */
export function TableSkeleton({
  columns = 5,
  rows = 8,
  showHeader = true,
  showToolbar = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden bg-[#18181b]">
        {/* Header */}
        {showHeader && (
          <div className="flex gap-4 p-4 border-b border-slate-700 bg-[#27272a]/50">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-5 rounded flex-1"
                style={{ flex: i === 0 ? 2 : 1 }}
              />
            ))}
          </div>
        )}

        {/* Rows */}
        <div className="p-4 space-y-4">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className="h-4 rounded flex-1"
                  style={{ flex: colIndex === 0 ? 2 : 1 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}
