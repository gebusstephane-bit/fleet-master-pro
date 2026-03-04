/**
 * Activity Feed - Dashboard SaaS 2026
 * Affiche les dernières activités de l'entreprise
 * Glassmorphism Design System
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, 
  Users, 
  Wrench, 
  ClipboardCheck, 
  Route, 
  Settings,
  LogIn,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ActivityItem {
  id: string;
  action_type: string;
  entity_name: string;
  description: string;
  created_at: string;
  user_name?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[] | null;
  isLoading: boolean;
}

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  VEHICLE_CREATED: { 
    label: 'Véhicule ajouté', 
    icon: Car, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10 border-blue-500/20' 
  },
  VEHICLE_UPDATED: { 
    label: 'Véhicule modifié', 
    icon: Car, 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-500/10 border-slate-500/20' 
  },
  DRIVER_CREATED: { 
    label: 'Chauffeur ajouté', 
    icon: Users, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/20' 
  },
  DRIVER_ASSIGNED: { 
    label: 'Chauffeur assigné', 
    icon: Users, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/20' 
  },
  MAINTENANCE_CREATED: { 
    label: 'Maintenance planifiée', 
    icon: Wrench, 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/10 border-amber-500/20' 
  },
  MAINTENANCE_COMPLETED: { 
    label: 'Maintenance terminée', 
    icon: Wrench, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/20' 
  },
  INSPECTION_CREATED: { 
    label: 'Inspection créée', 
    icon: ClipboardCheck, 
    color: 'text-violet-400', 
    bgColor: 'bg-violet-500/10 border-violet-500/20' 
  },
  INSPECTION_COMPLETED: { 
    label: 'Inspection terminée', 
    icon: ClipboardCheck, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/20' 
  },
  ROUTE_CREATED: { 
    label: 'Tournée créée', 
    icon: Route, 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10 border-cyan-500/20' 
  },
  ROUTE_COMPLETED: { 
    label: 'Tournée terminée', 
    icon: Route, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10 border-emerald-500/20' 
  },
  SETTINGS_UPDATED: { 
    label: 'Paramètres mis à jour', 
    icon: Settings, 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-500/10 border-slate-500/20' 
  },
  LOGIN: { 
    label: 'Connexion', 
    icon: LogIn, 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-500/10 border-slate-500/20' 
  },
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="bg-[#0f172a]/60 border-cyan-500/15 backdrop-blur-xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-slate-800/50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = activities || [];

  return (
    <Card className="h-full bg-[#0f172a]/60 border-cyan-500/15 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
          <Clock className="h-4 w-4 text-slate-400" />
          Activité récente
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-500/10 flex items-center justify-center border border-slate-500/20">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm">Aucune activité récente</p>
            <p className="text-xs mt-1 text-slate-600">
              Les actions effectuées apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
            {items.map((activity) => {
              const config = actionConfig[activity.action_type] || { 
                label: 'Action', 
                icon: Settings, 
                color: 'text-slate-400', 
                bgColor: 'bg-slate-500/10 border-slate-500/20' 
              };
              const Icon = config.icon;
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#0f172a]/40 transition-colors border border-transparent hover:border-cyan-500/10"
                >
                  <div className={cn("p-2 rounded-lg shrink-0 border", config.bgColor)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {config.label}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {activity.entity_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                      {activity.user_name && (
                        <>
                          <span className="text-slate-600">•</span>
                          <p className="text-xs text-slate-500">
                            {activity.user_name}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
