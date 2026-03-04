'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Edit,
  FileText,
  Wrench,
  ClipboardCheck,
  Brain,
  TrendingUp,
  Disc,
  MapPin,
  Fuel,
  Gauge,
  User,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Snowflake,
} from 'lucide-react';
import '@/app/(dashboard)/detail-pages-premium.css';
import { useVehicle } from '@/hooks/use-vehicles';
import { useMaintenancesByVehicle } from '@/hooks/use-maintenance';
import { useFuelRecordsByVehicle } from '@/hooks/use-fuel';
import { useVehicleReliabilityScore } from '@/hooks/use-reliability-score';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { DriverAssignment } from '@/components/vehicles/DriverAssignment';
import { CarnetPdfButton } from '@/components/vehicles/carnet-pdf-button';
import { VehicleMaintenanceTimeline } from '@/components/maintenance/vehicle-maintenance-timeline';
import { MaintenanceTimeline } from '@/components/maintenance/MaintenanceTimeline';
import { List, GitBranch } from 'lucide-react';
import { VehicleQRCode } from '@/components/vehicle-qr-code';
import { PredictionCard } from '@/components/ai-predict/prediction-card';
import { UpcomingMaintenance } from '@/components/vehicles/UpcomingMaintenance';
import { VehicleInspections } from '@/components/vehicles/vehicle-inspections';
import { TCODashboard } from '@/components/vehicles/TCODashboard';
import { VehicleTiresTab } from '@/components/tires/VehicleTiresTab';
import { VehicleKPIBar } from '@/components/vehicles/VehicleKPIBar';
import { differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Composant interne pour le toggle Liste/Timeline
function MaintenanceViewToggle({
  vehicleId,
  vehicleCurrentKm,
  maintenances,
  maintenanceLoading,
}: {
  vehicleId: string
  vehicleCurrentKm: number
  maintenances: any[]
  maintenanceLoading: boolean
}) {
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            viewMode === 'list'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          )}
        >
          <List className="h-4 w-4" />
          Liste
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            viewMode === 'timeline'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          )}
        >
          <GitBranch className="h-4 w-4" />
          Timeline
        </button>
      </div>

      {viewMode === 'timeline' && (
        <div className="mt-4">
          <MaintenanceTimeline
            vehicleId={vehicleId}
            vehicleCurrentKm={vehicleCurrentKm}
          />
        </div>
      )}
    </div>
  )
}

const statusConfig = {
  ACTIF: { label: 'Actif', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  INACTIF: { label: 'Inactif', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  EN_MAINTENANCE: { label: 'En maintenance', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ARCHIVE: { label: 'Archivé', color: 'bg-slate-700/30 text-slate-300 border-slate-600/30' },
};

const typeLabels: Record<string, string> = {
  VOITURE: '🚗 Voiture',
  FOURGON: '🚐 Fourgon',
  POIDS_LOURD: '🚛 Poids Lourd',
  POIDS_LOURD_FRIGO: '🚛❄️ PL Frigorifique',
};

const fuelLabels: Record<string, string> = {
  diesel: 'Diesel',
  gasoline: 'Essence',
  electric: 'Électrique',
  hybrid: 'Hybride',
  lpg: 'GPL',
};

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(id);
  const { data: maintenances, isLoading: maintenanceLoading } = useMaintenancesByVehicle(id);
  const { data: fuelRecords } = useFuelRecordsByVehicle(id);
  const { data: reliabilityScore } = useVehicleReliabilityScore(id);
  const [tireCriticalCount, setTireCriticalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('maintenance');

  // Calculer la consommation moyenne
  const consumptionByType = fuelRecords?.reduce((acc: Record<string, number[]>, record: any) => {
    if (record.consumption_l_per_100km && record.fuel_type) {
      if (!acc[record.fuel_type]) acc[record.fuel_type] = [];
      acc[record.fuel_type].push(record.consumption_l_per_100km);
    }
    return acc;
  }, {});

  const dieselConsumption = consumptionByType?.diesel?.length 
    ? consumptionByType.diesel.reduce((a: number, b: number) => a + b, 0) / consumptionByType.diesel.length
    : null;

  // Calculer les alertes actives (maintenances en cours)
  const activeMaintenances = maintenances?.filter(
    (m: any) => m.status === 'scheduled' || m.status === 'in_progress' || m.status === 'pending'
  ) || [];
  const alertCount = activeMaintenances.length;
  const urgentAlertCount = activeMaintenances.filter(
    (m: any) => m.priority === 'critical' || m.priority === 'high'
  ).length;

  // Prochain entretien estimé (à remplacer par une vraie logique si disponible)
  const nextMaintenanceKm = vehicle?.mileage ? Math.max(0, 15000 - (vehicle.mileage % 15000)) : null;

  const handleKPIClick = (tabId: string) => {
    const tabMap: Record<string, string> = {
      maintenance: 'maintenance',
      fuel: 'maintenance',
      inspections: 'inspections',
      alerts: 'maintenance',
    };
    setActiveTab(tabMap[tabId] || 'maintenance');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (vehicleLoading) {
    return <VehicleDetailSkeleton />;
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white">Véhicule non trouvé</h1>
        <p className="text-gray-400 mt-2">Le véhicule demandé n&apos;existe pas ou a été supprimé.</p>
        <Button asChild className="mt-4">
          <Link href="/vehicles">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.INACTIF;

  // Calcul des jours pour le CT
  const daysUntilCT = vehicle.technical_control_expiry
    ? differenceInDays(parseISO(vehicle.technical_control_expiry), new Date())
    : null;

  return (
    <div className="space-y-6">
      {/* ZONE 1 — EN-TÊTE VÉHICULE */}
      <div className="detail-header">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 hover:bg-cyan-500/10 shrink-0"
              onClick={() => router.push('/vehicles')}
            >
              <ArrowLeft className="h-5 w-5 text-cyan-400" />
            </Button>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {vehicle.registration_number?.toUpperCase()}
            </h1>
            
            <Badge 
              className={cn('border', status.color)}
              variant="outline"
            >
              {status.label}
            </Badge>
            
            {/* Score de fiabilité inline */}
            {reliabilityScore && (
              <Badge 
                className="border shrink-0"
                style={{ 
                  backgroundColor: `${reliabilityScore.color}20`,
                  borderColor: `${reliabilityScore.color}40`,
                  color: reliabilityScore.color 
                }}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                {reliabilityScore.score}/100 · {reliabilityScore.grade}
              </Badge>
            )}
          </div>
          
          <p className="text-slate-400 ml-[52px] mt-1 text-sm sm:text-base">
            {vehicle.brand} {vehicle.model} · {vehicle.year} · {fuelLabels[vehicle.fuel_type as any] || vehicle.fuel_type} · {vehicle.color || '—'} · {vehicle.mileage?.toLocaleString('fr-FR')} km
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <CarnetPdfButton
            vehicleId={id}
            registrationNumber={vehicle.registration_number}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-700 hidden sm:flex"
          />
          <Button asChild className="detail-btn-primary">
            <Link href={`/vehicles/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Modifier</span>
              <span className="sm:hidden">Edit</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ZONE 2 — CARTES KPI */}
      <VehicleKPIBar
        nextMaintenanceKm={nextMaintenanceKm}
        consumption={dieselConsumption}
        fuelType={fuelLabels[vehicle.fuel_type as any] || vehicle.fuel_type}
        technicalControlExpiry={vehicle.technical_control_expiry}
        technicalControlDate={vehicle.technical_control_date}
        alertCount={alertCount}
        urgentAlertCount={urgentAlertCount}
        onCardClick={handleKPIClick}
      />

      {/* ZONE 3 — CONTENU PRINCIPAL (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Colonne gauche 60% */}
        <div className="lg:col-span-3 space-y-6">
          {/* Informations véhicule */}
          <Card className="detail-card">
            <CardHeader className="detail-card-header">
              <CardTitle className="detail-card-title">
                <FileText className="h-5 w-5" />
                Informations véhicule
              </CardTitle>
            </CardHeader>
            <CardContent className="detail-card-content">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Marque" value={vehicle.brand} />
                <InfoItem label="Modèle" value={vehicle.model} />
                <InfoItem label="Année" value={String(vehicle.year || '—')} />
                <InfoItem label="Type" value={typeLabels[vehicle.type as any] || vehicle.type} />
                <InfoItem label="Carburant" value={fuelLabels[vehicle.fuel_type as any] || vehicle.fuel_type} />
                <InfoItem label="Couleur" value={vehicle.color || '—'} />
                <InfoItem 
                  label="Kilométrage" 
                  value={vehicle.mileage ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '—'}
                />
                <InfoItem 
                  label="Conso. moyenne" 
                  value={dieselConsumption ? `${dieselConsumption.toFixed(1)} L/100` : '—'}
                />
                <InfoItem 
                  label="Immatriculation" 
                  value={vehicle.registration_number?.toUpperCase() || '—'}
                />
                <InfoItem label="VIN" value={vehicle.vin || '—'} />
              </div>
            </CardContent>
          </Card>

          {/* Conducteur attitré */}
          <DriverAssignment vehicleId={vehicle.id} />

          {/* QR Code */}
          <VehicleQRCode 
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            brand={vehicle.brand}
            model={vehicle.model}
          />
        </div>

        {/* Colonne droite 40% */}
        <div className="lg:col-span-2 space-y-6">
          {/* Maintenances préventives par règles kilométriques */}
          <UpcomingMaintenance vehicleId={vehicle.id} />

          {/* Maintenance Prédictive IA */}
          <PredictionCard vehicleId={vehicle.id} />

          {/* Score de fiabilité */}
          <ReliabilityScoreDisplay vehicleId={vehicle.id} />

          {/* Échéances réglementaires */}
          <ComplianceCard vehicle={vehicle} />
        </div>
      </div>

      {/* ZONE 4 — ONGLETS */}
      <div ref={tabsRef} className="overflow-x-auto -mx-2 px-2 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-max">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-slate-800/50 p-1 text-slate-400">
            <TabsTrigger 
              value="maintenance" 
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
              <span className="sm:hidden">Maint.</span>
              {alertCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
                  {alertCount}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="inspections"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Contrôles</span>
              <span className="sm:hidden">Ctrl.</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="documents"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tco"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Coûts & TCO</span>
              <span className="sm:hidden">TCO</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="prediction"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">IA Prédiction</span>
              <span className="sm:hidden">IA</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tires"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              <Disc className="h-4 w-4" />
              <span className="hidden sm:inline">Pneumatiques</span>
              <span className="sm:hidden">Pneus</span>
              {tireCriticalCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
                  {tireCriticalCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="maintenance" className="mt-6">
            <Card className="detail-card">
              <CardHeader className="detail-card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Historique des maintenances</CardTitle>
                    <CardDescription className="text-slate-400">
                      Toutes les interventions et réparations du véhicule
                    </CardDescription>
                  </div>
                  {/* Toggle Liste / Timeline */}
                  <MaintenanceViewToggle 
                    vehicleId={id}
                    vehicleCurrentKm={vehicle?.mileage ?? 0}
                    maintenances={maintenances || []}
                    maintenanceLoading={maintenanceLoading}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {maintenanceLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <VehicleMaintenanceTimeline 
                    maintenances={(maintenances || []) as any} 
                    vehicleId={id as any}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-6">
            <Card className="detail-card">
              <CardHeader className="detail-card-header">
                <CardTitle className="text-white">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Documents à venir</p>
                  <p className="text-sm">Fonctionnalité en développement</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inspections" className="mt-6">
            <VehicleInspections vehicleId={id} />
          </TabsContent>
          
          <TabsContent value="tco" className="mt-6">
            <Card className="detail-card">
              <CardContent className="pt-6">
                <TCODashboard vehicleId={id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prediction" className="mt-6">
            <PredictionCard vehicleId={id} />
          </TabsContent>

          <TabsContent value="tires" className="mt-6">
            <VehicleTiresTab
              vehicleId={id}
              vehicleType={vehicle.type}
              vehicleCurrentKm={vehicle.mileage ?? 0}
              onAlertCount={setTireCriticalCount}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────────────────────

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {icon}
        <p className="font-medium text-white">{value || '—'}</p>
      </div>
    </div>
  );
}

function ReliabilityScoreDisplay({ vehicleId }: { vehicleId: string }) {
  const { data: score, isLoading } = useVehicleReliabilityScore(vehicleId);

  if (isLoading) {
    return (
      <Card className="detail-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/3" />
            <div className="h-8 bg-slate-700 rounded w-1/2" />
            <div className="h-20 bg-slate-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) return null;

  const ScoreBar = ({ label, value, weight }: { label: string; value: number; weight: string }) => {
    const color =
      value >= 85 ? 'bg-emerald-500' :
      value >= 70 ? 'bg-green-500' :
      value >= 55 ? 'bg-yellow-500' :
      value >= 40 ? 'bg-orange-500' : 'bg-red-500';

    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-300">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{weight}</span>
            <span className="font-semibold text-white w-8 text-right">{value}</span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${value}%` }} />
        </div>
      </div>
    );
  };

  return (
    <Card className="detail-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            Score de fiabilité
          </CardTitle>
          <div
            className="px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: score.color }}
          >
            {score.grade}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: score.color }}
          >
            {score.score}
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{score.score}/100</p>
            <p className="text-sm" style={{ color: score.color }}>{score.label}</p>
          </div>
        </div>

        <ScoreBar label="Inspection" value={score.breakdown.inspection} weight="30%" />
        <ScoreBar label="Maintenance" value={score.breakdown.maintenance} weight="35%" />
        <ScoreBar label="Carburant" value={score.breakdown.fuel} weight="20%" />
        <ScoreBar label="Conformité" value={score.breakdown.compliance} weight="15%" />

        <p className="mt-4 text-xs text-slate-500 pt-3 border-t border-slate-700">
          — Stable · Calculé le {(score.lastCalculated instanceof Date ? score.lastCalculated : new Date(score.lastCalculated)).toLocaleDateString('fr-FR')} à{' '}
          {(score.lastCalculated instanceof Date ? score.lastCalculated : new Date(score.lastCalculated)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </CardContent>
    </Card>
  );
}

function ComplianceCard({ vehicle }: { vehicle: any }) {
  const vehicleType = vehicle.type;
  const typeLabels: Record<string, { label: string; emoji: string; ctPeriod: string }> = {
    VOITURE: { label: 'Voiture', emoji: '🚗', ctPeriod: '2 ans' },
    FOURGON: { label: 'Fourgon', emoji: '🚐', ctPeriod: '1 an' },
    POIDS_LOURD: { label: 'Poids Lourd', emoji: '🚛', ctPeriod: '1 an' },
    POIDS_LOURD_FRIGO: { label: 'PL Frigorifique', emoji: '🚛❄️', ctPeriod: '1 an' },
  };
  const typeConfig = typeLabels[vehicleType] || { label: vehicleType, emoji: '🚗', ctPeriod: '2 ans' };

  const daysUntilCT = vehicle.technical_control_expiry
    ? differenceInDays(parseISO(vehicle.technical_control_expiry), new Date())
    : null;

  const isExpired = daysUntilCT !== null && daysUntilCT < 0;
  const isUrgent = daysUntilCT !== null && daysUntilCT >= 0 && daysUntilCT < 30;

  return (
    <Card className="detail-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-cyan-400" />
            Échéances réglementaires
          </CardTitle>
          <span className="text-sm text-slate-400">
            {typeConfig.emoji} {typeConfig.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicle.technical_control_expiry ? (
          <div className={cn(
            'p-4 rounded-lg border',
            isExpired ? 'bg-red-950/20 border-red-700/30' :
            isUrgent ? 'bg-amber-950/20 border-amber-700/30' :
            'bg-emerald-950/20 border-emerald-700/30'
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-full shrink-0',
                isExpired ? 'bg-red-500/20 text-red-400' :
                isUrgent ? 'bg-amber-500/20 text-amber-400' :
                'bg-emerald-500/20 text-emerald-400'
              )}>
                {isExpired ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Contrôle Technique</p>
                <p className={cn(
                  'text-lg font-bold',
                  isExpired ? 'text-red-400' :
                  isUrgent ? 'text-amber-400' :
                  'text-emerald-400'
                )}>
                  {new Date(vehicle.technical_control_expiry).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className={cn('text-sm mt-1',
                  isExpired ? 'text-red-400' :
                  isUrgent ? 'text-amber-400' :
                  'text-slate-400'
                )}>
                  {isExpired 
                    ? `Expiré depuis ${Math.abs(daysUntilCT!)} jours`
                    : `Valide encore ${daysUntilCT} jours`
                  }
                </p>
                {vehicle.technical_control_date && (
                  <p className="text-xs text-slate-500 mt-1">
                    Dernier : {new Date(vehicle.technical_control_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-slate-400" />
              <p className="text-slate-400">Aucune échéance configurée</p>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            <Info className="h-3 w-3 inline mr-1" />
            Périodicités {typeConfig.label} : CT {typeConfig.ctPeriod}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
      </div>
      
      {/* KPI Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      
      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[400px]" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    </div>
  );
}
