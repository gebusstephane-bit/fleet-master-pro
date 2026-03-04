'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import '@/app/(dashboard)/detail-pages-premium.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Calendar, MapPin, Phone, User, 
  Clock, Euro, FileText, Wrench, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { updateMaintenanceStatus } from '@/actions/maintenance';
import { getMaintenanceById } from '@/actions/maintenance-workflow';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenanceTypeBadge } from '@/components/maintenance/maintenance-type-badge';
import { MaintenanceTimeline } from '@/components/maintenance/maintenance-timeline';
import { ScheduleRDVDialog } from '@/components/maintenance/schedule-rdv-dialog';
import { CompleteMaintenanceDialog } from '@/components/maintenance/complete-maintenance-dialog';
import { useUser } from '@/hooks/use-user';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getSupabaseClient } from '@/lib/supabase/client';

interface LinkedIncident {
  id: string;
  incident_number: string | null;
  incident_date: string;
  incident_type: string;
  severity: string | null;
  status: string;
  location_description: string | null;
  estimated_damage: number | null;
  drivers?: { first_name: string; last_name: string } | null;
}

interface MaintenanceDetail {
  id: string;
  vehicle_id: string;
  vehicle_registration: string;
  vehicle_brand: string;
  vehicle_model: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'PNEUMATIQUE' | 'CARROSSERIE';
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'DEMANDE_CREEE' | 'VALIDEE' | 'VALIDEE_DIRECTEUR' | 'RDV_PRIS' | 'EN_COURS' | 'TERMINEE' | 'REFUSEE';
  requested_at: string;
  validated_at?: string;
  rdv_date?: string;
  rdv_time?: string;
  completed_at?: string;
  garage_name?: string;
  garage_address?: string;
  garage_phone?: string;
  requester_first_name: string;
  requester_last_name: string;
  estimated_cost?: number;
  estimated_days?: number;
  estimated_hours?: number;
  final_cost?: number;
  notes_request?: string;
  notes_validation?: string;
  notes_completion?: string;
  history?: {
    old_status: string;
    new_status: string;
    changed_at: string;
    user?: { first_name: string; last_name: string };
  }[];
  agendaEvent?: {
    event_date: string;
    start_time: string;
    end_time: string;
  };
  linkedIncidents?: LinkedIncident[];
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: user, isLoading: userLoading } = useUser();

  // Rôles autorisés à voir les boutons de transition
  const isManagerOrAbove = ['ADMIN', 'MANAGER', 'DIRECTEUR'].includes(user?.role || '');

  const loadMaintenance = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getMaintenanceById({ id });
      if (result?.data?.success) {
        const maintenanceData = result.data.data;
        
        // Récupérer les incidents liés à cette maintenance
        const supabase = getSupabaseClient();
        const { data: linkedIncidents } = await supabase
          .from('incidents')
          .select(`
            id,
            incident_number,
            incident_date,
            incident_type,
            severity,
            status,
            location_description,
            estimated_damage,
            drivers(first_name, last_name)
          `)
          .eq('maintenance_record_id', id)
          .order('incident_date', { ascending: false });
        
        setMaintenance({
          ...maintenanceData,
          linkedIncidents: (linkedIncidents || []) as LinkedIncident[],
        } as unknown as MaintenanceDetail);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, [id]);

  const handleStatusChange = async (newStatus: string, additionalData?: { notes?: string }) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const result = await updateMaintenanceStatus(id, newStatus, additionalData);
      if (result.success) {
        loadMaintenance();
      } else {
        setErrorMessage(result.error || 'Erreur lors de la transition');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setErrorMessage('Erreur inattendue');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="p-6">
        <p className="text-red-600">Intervention non trouvée</p>
        <Button asChild className="mt-4">
          <Link href="/maintenance">Retour</Link>
        </Button>
      </div>
    );
  }

  // Déterminer quels boutons afficher selon le statut
  const showValidateButtons = maintenance.status === 'DEMANDE_CREEE' && isManagerOrAbove;
  const showScheduleButton = (maintenance.status === 'VALIDEE' || maintenance.status === 'VALIDEE_DIRECTEUR') && isManagerOrAbove;
  const showStartButton = maintenance.status === 'RDV_PRIS' && isManagerOrAbove;
  const showCompleteButton = maintenance.status === 'EN_COURS' && isManagerOrAbove;

  return (
    <div className="space-y-6 p-6">
      {/* Header Premium */}
      <div className="detail-header">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="detail-btn-secondary" asChild>
            <Link href="/maintenance">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Intervention <span className="text-cyan-400">{maintenance.vehicle_registration}</span>
            </h1>
            <p className="text-slate-400">
              Créée le {format(new Date(maintenance.requested_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Message d'erreur */}
          {errorMessage && (
            <div className="text-sm text-red-400 mr-2">
              {errorMessage}
            </div>
          )}
          
          {showValidateButtons && (
            <>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => handleStatusChange('REFUSEE')}
                disabled={actionLoading}
              >
                Refuser
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => handleStatusChange('VALIDEE')}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Valider
              </Button>
            </>
          )}

          {showScheduleButton && (
            <Button onClick={() => setScheduleDialogOpen(true)} disabled={actionLoading}>
              <Calendar className="h-4 w-4 mr-1" />
              Prendre RDV
            </Button>
          )}

          {showStartButton && (
            <Button onClick={() => handleStatusChange('EN_COURS')} disabled={actionLoading}>
              <Wrench className="h-4 w-4 mr-1" />
              Commencer
            </Button>
          )}

          {showCompleteButton && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setCompleteDialogOpen(true)}
              disabled={actionLoading}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marquer Terminée
            </Button>
          )}
        </div>
      </div>

      {/* Timeline Premium */}
      <Card className="detail-card">
        <CardHeader className="detail-card-header">
          <CardTitle className="detail-card-title">
            Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="detail-card-content">
          <MaintenanceTimeline 
            currentStatus={maintenance.status} 
            history={maintenance.history || []} 
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infos intervention Premium */}
        <Card className="detail-card">
          <CardHeader className="detail-card-header">
            <CardTitle className="detail-card-title">
              <Wrench className="h-5 w-5" />
              Détails de l&apos;intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="detail-card-content space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <MaintenanceTypeBadge type={maintenance.type as any} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Statut</p>
                <MaintenanceStatusBadge status={maintenance.status} />
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">Description</p>
              <p className="mt-1 text-white">{maintenance.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Priorité</p>
                <Badge variant={maintenance.priority === 'CRITICAL' ? 'destructive' : 'outline'}>
                  {maintenance.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">Demandeur</p>
                <p className="text-white">{maintenance.requester_first_name} {maintenance.requester_last_name}</p>
              </div>
            </div>

            {maintenance.estimated_cost && (
              <div>
                <p className="text-sm text-gray-400">Coût estimé</p>
                <p className="font-medium text-white">{maintenance.estimated_cost.toLocaleString('fr-FR')} €</p>
              </div>
            )}

            {maintenance.final_cost && (
              <div>
                <p className="text-sm text-gray-400">Coût final</p>
                <p className="font-medium text-emerald-600">
                  {maintenance.final_cost.toLocaleString('fr-FR')} €
                </p>
              </div>
            )}

            {maintenance.notes_request && (
              <div>
                <p className="text-sm text-gray-400">Notes création</p>
                <p className="text-sm mt-1 text-white">{maintenance.notes_request}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Infos RDV / Garage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenance.rdv_date || maintenance.agendaEvent ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {(() => {
                        const dateStr = maintenance.rdv_date || maintenance.agendaEvent?.event_date;
                        if (!dateStr) return 'Date non spécifiée';
                        try {
                          return format(new Date(dateStr), 'EEEE d MMMM yyyy', { locale: fr });
                        } catch {
                          return dateStr;
                        }
                      })()}
                    </p>
                    <p className="text-sm text-blue-800">
                      {maintenance.rdv_time || maintenance.agendaEvent?.start_time || 'Heure non spécifiée'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Garage</p>
                  <p className="font-medium text-white">{maintenance.garage_name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Adresse</p>
                  <p className="text-gray-200">{maintenance.garage_address}</p>
                </div>

                {maintenance.garage_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-200">{maintenance.garage_phone}</p>
                  </div>
                )}

                {/* Durée estimée */}
                {(maintenance.estimated_days !== undefined || maintenance.estimated_hours !== undefined) && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-900">
                      <span className="font-medium">Durée estimée:</span>{' '}
                      {maintenance.estimated_days ? `${maintenance.estimated_days} jour${maintenance.estimated_days > 1 ? 's' : ''}` : ''}
                      {maintenance.estimated_days && maintenance.estimated_hours ? ' et ' : ''}
                      {maintenance.estimated_hours ? `${maintenance.estimated_hours} heure${maintenance.estimated_hours > 1 ? 's' : ''}` : ''}
                      {(!maintenance.estimated_days && !maintenance.estimated_hours) && 'Non spécifiée'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-300">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun rendez-vous planifié</p>
                {(maintenance.status === 'VALIDEE' || maintenance.status === 'VALIDEE_DIRECTEUR') && isManagerOrAbove && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setScheduleDialogOpen(true)}
                  >
                    Planifier un RDV
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes de clôture */}
      {maintenance.notes_completion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes de clôture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">{maintenance.notes_completion}</p>
            {maintenance.completed_at && (
              <p className="text-sm text-gray-400 mt-2">
                Terminée le {format(new Date(maintenance.completed_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Incidents liés */}
      {maintenance.linkedIncidents && maintenance.linkedIncidents.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Incidents liés ({maintenance.linkedIncidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {maintenance.linkedIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {incident.incident_number || 'Sans numéro'}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={
                          incident.severity === 'très_grave' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          incident.severity === 'grave' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          incident.severity === 'moyen' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }
                      >
                        {incident.severity || 'Non classé'}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={
                          incident.status === 'clôturé' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          incident.status === 'en_cours' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }
                      >
                        {incident.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {format(new Date(incident.incident_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      {incident.drivers && ` — ${incident.drivers.first_name} ${incident.drivers.last_name}`}
                    </p>
                    {incident.location_description && (
                      <p className="text-xs text-slate-500 mt-1">
                        {incident.location_description}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    {incident.estimated_damage !== null && incident.estimated_damage > 0 && (
                      <p className="text-sm font-medium text-amber-400">
                        {incident.estimated_damage.toLocaleString('fr-FR')} €
                      </p>
                    )}
                    <Button variant="ghost" size="sm" asChild className="mt-1">
                      <Link href={`/incidents/${incident.id}`}>
                        Voir le sinistre →
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ScheduleRDVDialog
        maintenanceId={maintenance.id}
        vehicleRegistration={maintenance.vehicle_registration}
        garageName={maintenance.garage_name}
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) loadMaintenance();
        }}
      />
      
      <CompleteMaintenanceDialog
        maintenanceId={maintenance.id}
        vehicleRegistration={maintenance.vehicle_registration}
        open={completeDialogOpen}
        onOpenChange={(open) => {
          setCompleteDialogOpen(open);
          if (!open) loadMaintenance();
        }}
      />
    </div>
  );
}
