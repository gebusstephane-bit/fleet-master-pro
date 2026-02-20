"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  height?: number;
  showHeader?: boolean;
}

export function ChartSkeleton({
  height = 300,
  showHeader = true,
}: ChartSkeletonProps) {
  return (
    <div className="space-y-4">
      {showHeader && <Skeleton className="h-6 w-48" />}
      <Skeleton className="w-full rounded-xl" style={{ height }} />
    </div>
  );
}

export function AnalyticsSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton height={320} />
      <ChartSkeleton height={320} />
      <ChartSkeleton height={280} />
      <ChartSkeleton height={280} />
    </div>
  );
}
