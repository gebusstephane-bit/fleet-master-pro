'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  ArrowRight,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Maintenance {
  id: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'PNEUMATIQUE' | 'CARROSSERIE';
  description: string;
  status: 'DEMANDE_CREEE' | 'VALIDEE_DIRECTEUR' | 'RDV_PRIS' | 'EN_COURS' | 'TERMINEE' | 'REFUSEE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  requested_at: string;
  rdv_date?: string;
  completed_at?: string;
  garage_name?: string;
  estimated_cost?: number;
  final_cost?: number;
  requester_first_name?: string;
  requester_last_name?: string;
}

interface VehicleMaintenanceTimelineProps {
  maintenances: Maintenance[];
  vehicleId: string;
}

const statusConfig = {
  DEMANDE_CREEE: { 
    label: 'Demande créée', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock
  },
  VALIDEE_DIRECTEUR: { 
    label: 'Validée', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2
  },
  RDV_PRIS: { 
    label: 'RDV pris', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Calendar
  },
  EN_COURS: { 
    label: 'En cours', 
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Wrench
  },
  TERMINEE: { 
    label: 'Terminée', 
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2
  },
  REFUSEE: { 
    label: 'Refusée', 
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle
  },
};

const typeLabels: Record<string, string> = {
  PREVENTIVE: 'Préventive',
  CORRECTIVE: 'Corrective',
  PNEUMATIQUE: 'Pneumatique',
  CARROSSERIE: 'Carrosserie',
};

const priorityColors = {
  LOW: 'text-gray-400',
  NORMAL: 'text-blue-500',
  HIGH: 'text-orange-500',
  CRITICAL: 'text-red-500',
};

export function VehicleMaintenanceTimeline({ maintenances, vehicleId }: VehicleMaintenanceTimelineProps) {
  // Trier: en cours/planifiées d'abord, puis terminées
  const sortedMaintenances = [...maintenances].sort((a, b) => {
    // En cours/planifiées en premier
    const aIsActive = ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'].includes(a.status);
    const bIsActive = ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'].includes(b.status);
    
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    
    // Par date (plus récent en premier)
    const aDate = a.rdv_date || a.completed_at || a.requested_at;
    const bDate = b.rdv_date || b.completed_at || b.requested_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const activeMaintenances = sortedMaintenances.filter(m => 
    ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'].includes(m.status)
  );
  
  const completedMaintenances = sortedMaintenances.filter(m => 
    ['TERMINEE', 'REFUSEE'].includes(m.status)
  );

  return (
    <div className="space-y-6">
      {/* Header avec bouton nouvelle demande */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Historique des interventions</h3>
          <p className="text-sm text-slate-400">
            {maintenances.length} intervention{maintenances.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/maintenance/new?vehicleId=${vehicleId}`}>
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {/* Interventions en cours */}
      {activeMaintenances.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            En cours / Planifiées ({activeMaintenances.length})
          </h4>
          {activeMaintenances.map((m) => (
            <MaintenanceCard key={m.id} maintenance={m} />
          ))}
        </div>
      )}

      {/* Historique */}
      {completedMaintenances.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Historique ({completedMaintenances.length})
          </h4>
          {completedMaintenances.map((m) => (
            <MaintenanceCard key={m.id} maintenance={m} />
          ))}
        </div>
      )}

      {maintenances.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <Wrench className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400">Aucune maintenance enregistrée</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/maintenance/new?vehicleId=${vehicleId}`}>
              <Plus className="h-4 w-4 mr-1" />
              Créer une demande
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function MaintenanceCard({ maintenance }: { maintenance: Maintenance }) {
  const config = statusConfig[maintenance.status];
  const StatusIcon = config.icon;
  
  const isActive = ['DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS'].includes(maintenance.status);
  
  return (
    <Link 
      href={`/maintenance/${maintenance.id}`}
      className="block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-start gap-4">
        {/* Icône statut */}
        <div className={`p-2 rounded-lg ${config.color}`}>
          <StatusIcon className="h-5 w-5" />
        </div>
        
        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">
                {typeLabels[maintenance.type] || maintenance.type}
                {maintenance.priority === 'CRITICAL' && (
                  <span className="ml-2 text-red-500">⚠️ Critique</span>
                )}
              </p>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                {maintenance.description}
              </p>
            </div>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
          
          {/* Métadonnées */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
            {maintenance.rdv_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(maintenance.rdv_date), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
            
            {maintenance.garage_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {maintenance.garage_name}
              </span>
            )}
            
            {(maintenance.final_cost || maintenance.estimated_cost) && (
              <span className="font-medium">
                {maintenance.final_cost 
                  ? `${maintenance.final_cost.toLocaleString('fr-FR')} €`
                  : `~${maintenance.estimated_cost?.toLocaleString('fr-FR')} €`
                }
              </span>
            )}
            
            <span className="text-xs">
              Demande du {format(new Date(maintenance.requested_at), 'dd/MM/yyyy', { locale: fr })}
            </span>
          </div>
        </div>
        
        {/* Flèche */}
        <ArrowRight className="h-4 w-4 text-slate-300 self-center" />
      </div>
    </Link>
  );
}
