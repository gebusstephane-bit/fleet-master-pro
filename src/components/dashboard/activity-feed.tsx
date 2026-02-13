/**
 * Activity Feed - Dashboard Production
 * Affiche les dernières activités de l'entreprise
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

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  VEHICLE_CREATED: { label: 'Véhicule ajouté', icon: Car, color: 'text-blue-600 bg-blue-50' },
  VEHICLE_UPDATED: { label: 'Véhicule modifié', icon: Car, color: 'text-gray-300 bg-slate-50' },
  DRIVER_CREATED: { label: 'Chauffeur ajouté', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
  DRIVER_ASSIGNED: { label: 'Chauffeur assigné', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
  MAINTENANCE_CREATED: { label: 'Maintenance planifiée', icon: Wrench, color: 'text-amber-600 bg-amber-50' },
  MAINTENANCE_COMPLETED: { label: 'Maintenance terminée', icon: Wrench, color: 'text-green-600 bg-green-50' },
  INSPECTION_CREATED: { label: 'Inspection créée', icon: ClipboardCheck, color: 'text-purple-600 bg-purple-50' },
  INSPECTION_COMPLETED: { label: 'Inspection terminée', icon: ClipboardCheck, color: 'text-green-600 bg-green-50' },
  ROUTE_CREATED: { label: 'Tournée créée', icon: Route, color: 'text-indigo-600 bg-indigo-50' },
  ROUTE_COMPLETED: { label: 'Tournée terminée', icon: Route, color: 'text-green-600 bg-green-50' },
  SETTINGS_UPDATED: { label: 'Paramètres mis à jour', icon: Settings, color: 'text-gray-300 bg-slate-50' },
  LOGIN: { label: 'Connexion', icon: LogIn, color: 'text-gray-300 bg-slate-50' },
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = activities || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          Activité récente
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-300">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune activité récente</p>
            <p className="text-xs mt-1">
              Les actions effectuées apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
            {items.map((activity) => {
              const config = actionConfig[activity.action_type] || { 
                label: 'Action', 
                icon: Settings, 
                color: 'text-gray-300 bg-slate-50' 
              };
              const Icon = config.icon;
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={cn("p-2 rounded-full shrink-0", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {config.label}
                    </p>
                    <p className="text-sm text-gray-300 truncate">
                      {activity.entity_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-300">
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                      {activity.user_name && (
                        <>
                          <span className="text-gray-500">•</span>
                          <p className="text-xs text-gray-300">
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
