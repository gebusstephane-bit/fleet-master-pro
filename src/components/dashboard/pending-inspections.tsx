/**
 * Pending Inspections - Dashboard
 * Affiche les inspections en attente
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface InspectionPending {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  inspection_type: string;
  created_at: string;
  days_pending: number;
}

interface PendingInspectionsProps {
  inspections: InspectionPending[] | null;
  isLoading: boolean;
}

export function PendingInspections({ inspections, isLoading }: PendingInspectionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = inspections || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-purple-600" />
            Inspections en attente
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-300">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune inspection en attente</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {items.map((inspection) => (
              <Link
                key={inspection.id}
                href={`/inspections`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "p-2 rounded-full shrink-0",
                    inspection.days_pending > 7 ? "bg-red-100 text-red-600" : "bg-purple-100 text-purple-600"
                  )}>
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{inspection.vehicle_name}</p>
                    <p className="text-xs text-gray-400">{inspection.inspection_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {inspection.days_pending > 7 && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge 
                    variant={inspection.days_pending > 7 ? "destructive" : "secondary"}
                    className={cn(
                      "text-xs",
                      inspection.days_pending > 7 ? "" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {inspection.days_pending === 0 ? "Aujourd'hui" : `J+${inspection.days_pending}`}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
