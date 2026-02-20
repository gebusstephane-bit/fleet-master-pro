'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardSkeletonProps {
  children?: ReactNode;
  className?: string;
  header?: boolean;
  titleWidth?: string;
}

/**
 * CardSkeleton - Loading state for cards
 * 
 * Usage:
 * ```tsx
 * // Simple card
 * <CardSkeleton />
 * 
 * // Card with custom content
 * <CardSkeleton>
 *   <Skeleton className="h-20 w-full" />
 *   <Skeleton className="h-4 w-3/4 mt-2" />
 * </CardSkeleton>
 * 
 * // Card with header
 * <CardSkeleton header titleWidth="w-32" />
 * ```
 */
export function CardSkeleton({
  children,
  className,
  header = false,
  titleWidth = 'w-32',
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700 bg-[#18181b] p-6',
        className
      )}
    >
      {header && <Skeleton className={cn('h-6 mb-4', titleWidth)} />}
      {children || (
        <>
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </>
      )}
    </div>
  );
}
