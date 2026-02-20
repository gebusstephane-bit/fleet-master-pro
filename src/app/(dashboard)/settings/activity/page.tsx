"use client";

/**
 * Page Historique d'activité (Audit Log)
 * Journal des actions effectuées sur la flotte
 */

import { useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import {
  useActivityLogs,
  type ActivityFilters,
} from "@/hooks/use-activity-logs";
import { ActivityTable } from "@/components/activity-log/activity-table";

export default function ActivityPage() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const companyId = user?.company_id;

  const [filters, setFilters] = useState<ActivityFilters>({});

  const {
    data: logs = [],
    isLoading,
    error,
    refetch,
  } = useActivityLogs(companyId, filters);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <History className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                Historique d&apos;activité
              </h1>
              <p className="text-sm text-slate-500">
                Journal des actions effectuées sur votre flotte
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Content */}
      <ActivityTable
        logs={logs}
        isLoading={isLoading || isUserLoading}
        error={error}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
