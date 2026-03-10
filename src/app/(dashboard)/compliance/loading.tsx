/**
 * Loading state pour la page de conformité réglementaire
 */

import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/glass-card';
import { StatsGridSkeleton, TableSkeleton } from '@/components/ui/skeletons';

export default function ComplianceLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* KPI Cards */}
      <StatsGridSkeleton count={3} columns={3} />

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Vehicles Section */}
      <GlassCard className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <TableSkeleton columns={7} rows={5} />
      </GlassCard>

      {/* Drivers Section */}
      <GlassCard className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <TableSkeleton columns={8} rows={5} />
      </GlassCard>
    </div>
  );
}
