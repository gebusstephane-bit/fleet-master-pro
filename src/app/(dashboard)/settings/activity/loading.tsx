"use client";

/**
 * Loading state pour la page Activity
 */

import { History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-64 h-4" />
          </div>
        </div>
        <Skeleton className="w-28 h-10" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-24 h-10" />
        <Skeleton className="w-24 h-10" />
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30">
          <div className="flex gap-4">
            <Skeleton className="w-8 h-4" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-40 h-4" />
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="flex-1 h-4" />
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-slate-800/50">
            <div className="flex gap-4 items-center">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-40 h-4" />
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-32 h-4" />
              <Skeleton className="flex-1 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
