'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Wrench, Calendar, AlertTriangle, 
  CheckCircle2, Clock, MapPin, ChevronRight, Filter
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { getMaintenanceRequests, validateMaintenanceRequest } from '@/actions/maintenance-workflow';
import { MaintenanceStatusBadge } from '@/components/maintenance/maintenance-status-badge';
import { MaintenanceTypeBadge } from '@/components/maintenance/maintenance-type-badge';
import { CreateRequestDialog } from '@/components/maintenance/create-request-dialog';
import { ScheduleRDVDialog } from '@/components/maintenance/schedule-rdv-dialog';
import { CompleteMaintenanceDialog } from '@/components/maintenance/complete-maintenance-dialog';
import { useUser } from '@/hooks/use-user';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MaintenanceRequest {
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
  rdv_date?: string;
  rdv_time?: string;
  garage_name?: string;
  garage_address?: string;
  requester_first_name: string;
  requester_last_name: string;
  estimated_cost?: number;
}

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const { data: user } = useUser();

  const isDirector = user?.role === 'ADMIN' || user?.role === 'DIRECTEUR';

  const loadRequests = async () => {
    setLoading(true);
    try {
      const result = await getMaintenanceRequests({});
      if (result?.data?.success) {
        setRequests(result.data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleValidate = async (id: string, action: 'validate' | 'reject') => {
    try {
      await validateMaintenanceRequest({
        id,
        action,
      });
      loadRequests();
    } catch (error) {
      console.error('Erreur validation:', error);
    }
  };

  const openScheduleDialog = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setScheduleDialogOpen(true);
  };

  const openCompleteDialog = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setCompleteDialogOpen(true);
  };

  const filteredRequests = {
    pending: requests.filter(r => r.status === 'DEMANDE_CREEE'),
    toSchedule: requests.filter(r => r.status === 'VALIDEE_DIRECTEUR'),
    scheduled: requests.filter(r => ['RDV_PRIS', 'EN_COURS'].includes(r.status)),
    completed: requests.filter(r => ['TERMINEE', 'REFUSEE'].includes(r.status)),
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      width: '100px',
      render: (m: MaintenanceRequest) => (
        <div>
          <p className="font-medium">
            {format(new Date(m.requested_at), 'dd MMM yyyy', { locale: fr })}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(m.requested_at), 'HH:mm', { locale: fr })}
          </p>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule / Garage',
      width: '180px',
      render: (m: MaintenanceRequest) => (
        <div>
          <Link href={`/vehicles/${m.vehicle_id}`} className="font-medium hover:underline">
            {m.vehicle_registration}
          </Link>
          <p className="text-xs text-muted-foreground">
            {m.vehicle_brand} {m.vehicle_model}
          </p>
          {m.garage_name && (
            <p className="text-xs text-blue-600 mt-0.5">
              🔧 {m.garage_name}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '140px',
      render: (m: MaintenanceRequest) => <MaintenanceTypeBadge type={m.type} size="sm" />,
    },
    {
      key: 'priority',
      header: 'Priorité',
      width: '100px',
      render: (m: MaintenanceRequest) => {
        const priorityLabels: Record<string, string> = {
          'LOW': 'Basse',
          'NORMAL': 'Normal',
          'HIGH': 'Haute',
          'CRITICAL': 'Critique'
        };
        const priorityColors: Record<string, string> = {
          'LOW': 'bg-slate-100 text-slate-700 border-slate-200',
          'NORMAL': 'bg-blue-100 text-blue-700 border-blue-200',
          'HIGH': 'bg-amber-100 text-amber-700 border-amber-200',
          'CRITICAL': 'bg-red-100 text-red-700 border-red-200'
        };
        return (
          <Badge variant="outline" className={`text-xs ${priorityColors[m.priority] || ''}`}>
            {priorityLabels[m.priority] || m.priority}
          </Badge>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      width: '200px',
      render: (m: MaintenanceRequest) => (
        <p className="text-sm text-gray-700 truncate max-w-[180px]" title={m.description}>
          {m.description}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (m: MaintenanceRequest) => <MaintenanceStatusBadge status={m.status} size="sm" />,
    },
    {
      key: 'actions',
      header: '',
      width: '200px',
      align: 'right' as const,
      render: (m: MaintenanceRequest) => (
        <div className="flex items-center gap-1">
          {m.status === 'DEMANDE_CREEE' && isDirector && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600"
                onClick={() => handleValidate(m.id, 'validate')}
              >
                Valider
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => handleValidate(m.id, 'reject')}
              >
                Refuser
              </Button>
            </>
          )}
          
          {m.status === 'VALIDEE_DIRECTEUR' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600"
              onClick={() => openScheduleDialog(m)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Prendre RDV
            </Button>
          )}
          
          {['RDV_PRIS', 'EN_COURS'].includes(m.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600"
              onClick={() => openCompleteDialog(m)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Terminer
            </Button>
          )}
          
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/maintenance/${m.id}`}>
              Voir <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const scheduledColumns = [
    ...columns.slice(0, 5),
    {
      key: 'rdv',
      header: 'RDV',
      width: '120px',
      render: (m: MaintenanceRequest) => (
        m.rdv_date ? (
          <div>
      <p className="font-medium text-blue-600">
              {format(new Date(m.rdv_date), 'dd MMM', { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">{m.rdv_time}</p>
            {m.garage_name && (
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{m.garage_name}</p>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    columns[columns.length - 1],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Gestion des interventions et workflow de validation"
        action={{
          label: 'Nouvelle demande',
          onClick: () => setCreateDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            En attente
            {filteredRequests.pending.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredRequests.pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="toSchedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            À planifier
            {filteredRequests.toSchedule.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredRequests.toSchedule.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <MapPin className="h-4 w-4" />
            Planifiées
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Demandes en attente de validation
                {isDirector && (
                  <Badge variant="outline" className="ml-2">Directeur uniquement</Badge>
                )}
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtrer
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredRequests.pending}
                keyExtractor={(m) => m.id}
                isLoading={loading}
                emptyMessage="Aucune demande en attente"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toSchedule" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Interventions validées - À prendre RDV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredRequests.toSchedule}
                keyExtractor={(m) => m.id}
                isLoading={loading}
                emptyMessage="Aucune intervention à planifier"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-500" />
                Interventions planifiées
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/agenda">Voir l&apos;agenda</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={scheduledColumns}
                data={filteredRequests.scheduled}
                keyExtractor={(m) => m.id}
                isLoading={loading}
                emptyMessage="Aucune intervention planifiée"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Historique des interventions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredRequests.completed}
                keyExtractor={(m) => m.id}
                isLoading={loading}
                emptyMessage="Aucune intervention dans l'historique"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      {selectedRequest && (
        <>
          <ScheduleRDVDialog
            maintenanceId={selectedRequest.id}
            vehicleRegistration={selectedRequest.vehicle_registration}
            garageName={selectedRequest.garage_name}
            open={scheduleDialogOpen}
            onOpenChange={(open) => {
              setScheduleDialogOpen(open);
              if (!open) {
                setSelectedRequest(null);
                loadRequests();
              }
            }}
          />
          <CompleteMaintenanceDialog
            maintenanceId={selectedRequest.id}
            vehicleRegistration={selectedRequest.vehicle_registration}
            open={completeDialogOpen}
            onOpenChange={(open) => {
              setCompleteDialogOpen(open);
              if (!open) {
                setSelectedRequest(null);
                loadRequests();
              }
            }}
          />
        </>
      )}
    </div>
  );
}
