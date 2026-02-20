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
  Clock, Euro, FileText, Wrench, CheckCircle2 
} from 'lucide-react';
import { getMaintenanceById, validateMaintenanceRequest, markMaintenanceInProgress } from '@/actions/maintenance-workflow';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenanceTypeBadge } from '@/components/maintenance/maintenance-type-badge';
import { MaintenanceTimeline } from '@/components/maintenance/maintenance-timeline';
import { ScheduleRDVDialog } from '@/components/maintenance/schedule-rdv-dialog';
import { CompleteMaintenanceDialog } from '@/components/maintenance/complete-maintenance-dialog';
import { useUser } from '@/hooks/use-user';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MaintenanceDetail {
  id: string;
  vehicle_id: string;
  vehicle_registration: string;
  vehicle_brand: string;
  vehicle_model: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'PNEUMATIQUE' | 'CARROSSERIE';
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'DEMANDE_CREEE' | 'VALIDEE_DIRECTEUR' | 'RDV_PRIS' | 'EN_COURS' | 'TERMINEE' | 'REFUSEE';
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
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const { data: user, isLoading: userLoading } = useUser();

  const isDirector = user?.role === 'ADMIN' || user?.role === 'DIRECTEUR';
  
  console.log('Debug - User:', user);
  console.log('Debug - Role:', user?.role);
  console.log('Debug - isDirector:', isDirector);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const result = await getMaintenanceById({ id });
      if (result?.data?.success) {
        setMaintenance(result.data.data);
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

  const handleValidate = async (action: 'validate' | 'reject') => {
    try {
      await validateMaintenanceRequest({ id, action });
      loadMaintenance();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleStartWork = async () => {
    try {
      await markMaintenanceInProgress({ id });
      loadMaintenance();
    } catch (error) {
      console.error('Erreur:', error);
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

  const showValidateButtons = maintenance.status === 'DEMANDE_CREEE' && isDirector;
  const showScheduleButton = maintenance.status === 'VALIDEE_DIRECTEUR';
  const showStartButton = maintenance.status === 'RDV_PRIS';
  const showCompleteButton = ['RDV_PRIS', 'EN_COURS'].includes(maintenance.status);

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

        <div className="flex items-center gap-2">
          {/* DEBUG INFO */}
          <div className="text-xs text-gray-400 mr-4">
            Role: {user?.role || 'N/A'} | Admin: {isDirector ? 'OUI' : 'NON'}
          </div>
          
          {showValidateButtons && (
            <>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => handleValidate('reject')}
              >
                Refuser
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleValidate('validate')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Valider
              </Button>
            </>
          )}

          {showScheduleButton && (
            <Button onClick={() => setScheduleDialogOpen(true)}>
              <Calendar className="h-4 w-4 mr-1" />
              Prendre RDV
            </Button>
          )}

          {showStartButton && (
            <Button onClick={handleStartWork}>
              <Wrench className="h-4 w-4 mr-1" />
              Marquer en cours
            </Button>
          )}

          {showCompleteButton && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setCompleteDialogOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Terminer
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
                {maintenance.status === 'VALIDEE_DIRECTEUR' && (
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
