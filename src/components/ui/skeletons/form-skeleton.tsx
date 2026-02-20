'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FormSkeletonProps {
  fields?: number;
  columns?: 1 | 2;
  showHeader?: boolean;
  showActions?: boolean;
  className?: string;
}

/**
 * FormSkeleton - Loading state for forms
 * 
 * Usage:
 * ```tsx
 * if (isLoading) return <FormSkeleton fields={6} columns={2} showHeader />;
 * ```
 */
export function FormSkeleton({
  fields = 6,
  columns = 2,
  showHeader = true,
  showActions = true,
  className,
}: FormSkeletonProps) {
  const fieldCount = columns === 2 ? Math.ceil(fields / 2) : fields;

  return (
    <div className={cn('space-y-6 max-w-4xl', className)}>
      {/* Header */}
      {showHeader && (
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}

      {/* Form fields */}
      <div
        className={cn(
          'grid gap-6',
          columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {Array.from({ length: fieldCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-700">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  );
}
