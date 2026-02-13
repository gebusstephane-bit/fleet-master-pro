'use client';

import { 
  UserPlus, 
  Car, 
  Wrench, 
  FileText, 
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  profiles?: { email: string } | null;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons: Record<string, typeof UserPlus> = {
  CREATE: UserPlus,
  UPDATE: Settings,
  DELETE: AlertCircle,
  COMPLETE: CheckCircle2,
  INSPECTION: FileText,
  MAINTENANCE: Wrench,
  VEHICLE: Car,
};

const activityColors: Record<string, string> = {
  CREATE: 'bg-green-500/20 text-green-400',
  UPDATE: 'bg-blue-500/20 text-blue-400',
  DELETE: 'bg-red-500/20 text-red-400',
  COMPLETE: 'bg-purple-500/20 text-purple-400',
  INSPECTION: 'bg-amber-500/20 text-amber-400',
  MAINTENANCE: 'bg-orange-500/20 text-orange-400',
  VEHICLE: 'bg-cyan-500/20 text-cyan-400',
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
  if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getActivityLabel(action: string, entityType: string): string {
  const labels: Record<string, string> = {
    'CREATE-VEHICLE': 'Nouveau véhicule ajouté',
    'UPDATE-VEHICLE': 'Véhicule modifié',
    'CREATE-DRIVER': 'Nouveau conducteur ajouté',
    'UPDATE-DRIVER': 'Conducteur modifié',
    'CREATE-MAINTENANCE': 'Maintenance créée',
    'COMPLETE-MAINTENANCE': 'Maintenance terminée',
    'CREATE-INSPECTION': 'Inspection réalisée',
    'CREATE-USER': 'Nouvel utilisateur inscrit',
    'UPDATE-COMPANY': 'Entreprise mise à jour',
  };
  
  return labels[`${action}-${entityType}`] || `${action} ${entityType.toLowerCase()}`;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Activité Récente</h3>
        <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          Voir tout l&apos;historique
        </button>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = activityIcons[activity.action] || activityIcons[activity.entity_type] || Settings;
            const colorClass = activityColors[activity.action] || activityColors[activity.entity_type] || 'bg-gray-500/20 text-gray-400';
            
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${colorClass}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">
                    {getActivityLabel(activity.action, activity.entity_type)}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Par {activity.profiles?.email || 'Système'} • {formatTime(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
