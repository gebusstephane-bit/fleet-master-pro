'use client';

import { motion } from 'framer-motion';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-800/50 rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-slate-800/30 rounded-lg animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="h-28 rounded-xl bg-slate-800/30 border border-slate-700/30 animate-pulse"
          />
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-xl bg-slate-800/30 border border-slate-700/30 animate-pulse" />
        <div className="h-80 rounded-xl bg-slate-800/30 border border-slate-700/30 animate-pulse" />
      </div>

      {/* Table Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-slate-800/50 rounded-lg animate-pulse" />
        <div className="h-64 rounded-xl bg-slate-800/30 border border-slate-700/30 animate-pulse" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="h-28 rounded-xl bg-slate-800/30 border border-slate-700/30 p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-slate-700/50 rounded" />
          <div className="h-8 w-16 bg-slate-700/50 rounded" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-slate-700/50" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-80 rounded-xl bg-slate-800/30 border border-slate-700/30 p-6 animate-pulse">
      <div className="h-6 w-32 bg-slate-700/50 rounded mb-6" />
      <div className="h-full pb-12 flex items-end justify-between gap-2">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-700/30 rounded-t"
            style={{ height: `${30 + Math.random() * 50}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="h-14 bg-slate-800/30 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="h-8 w-48 bg-slate-800/50 rounded-lg animate-pulse" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-12 bg-slate-800/30 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-12 w-32 bg-slate-700/50 rounded-lg animate-pulse" />
    </div>
  );
}
