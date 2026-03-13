'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
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
  AlertTriangle as AlertTriangleIcon,
  Plus,
  Package,
  AlertOctagon,
  Truck,
  Construction,
  Heart,
  Maximize2,
  Activity,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import '@/app/(dashboard)/detail-pages-premium.css';
import { useVehicle } from '@/hooks/use-vehicles';
import { useVehicleCurrentActivity, useAssignVehicleActivity } from '@/hooks/use-vehicle-activities';
import type { TransportActivity } from '@/actions/vehicle-activities';
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
import { differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getSupabaseClient } from '@/lib/supabase/client';

// 🆕 NOUVEAUX COMPOSANTS REDESIGN
import { CriticalAlertBanner } from '@/components/vehicles/CriticalAlertBanner';
import { RegulatoryTimelineCompact } from '@/components/vehicles/RegulatoryTimelineCompact';
import { MaintenancePredictionsPanel } from '@/components/vehicles/MaintenancePredictionsPanel';
import { VehicleScoreCard } from '@/components/vehicles/VehicleScoreCard';

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
      <div className="flex items-center gap-1 rounded-xl bg-slate-900/50 p-1 border border-slate-800">
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            viewMode === 'list'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          <List className="h-4 w-4" />
          Liste
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            viewMode === 'timeline'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
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

const detailedTypeLabels: Record<string, string> = {
  PL_BACHE: 'PL Bâché',
  PL_FOURGON: 'PL Fourgon',
  PL_PLATEAU: 'PL Plateau',
  PL_FRIGO: 'PL Frigorifique',
  PL_CITERNE_VRAC: 'PL Citerne vrac',
  PL_CITERNE_CITERNE: 'PL Citerne citerne',
  PL_CITERNE_DISTRIB: 'PL Citerne distribution',
  PL_FOURGON_ADR: 'PL Fourgon ADR',
  PL_BENNE_TP: 'PL Benne TP',
  PL_PORTE_ENGINS: 'PL Porte-engins',
  PL_PLATEAU_EXCEPT: 'PL Plateau exceptionnel',
  TRACTEUR_ROUTIER: 'Tracteur routier',
  REMORQUE_FRIGO: 'Remorque frigorifique',
  REMORQUE_PLATEAU: 'Remorque plateau',
  REMORQUE_RIDEAUX: 'Remorque rideaux',
  REMORQUE_CITERNE: 'Remorque citerne',
  REMORQUE_BENNE: 'Remorque benne',
  VL_BERLINE: 'Berline',
  VL_BREAK: 'Break',
  VL_FOURGON: 'Fourgon',
  VL_PICKUP: 'Pickup',
  VL_BENNE: 'Benne',
  VL_FRIGO: 'Frigorifique',
  VL_CITERNE: 'Citerne',
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
  const [showQRModal, setShowQRModal] = useState(false);

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

  const activeMaintenances = maintenances?.filter(
    (m: any) => m.status === 'scheduled' || m.status === 'in_progress' || m.status === 'pending'
  ) || [];
  const alertCount = activeMaintenances.length;

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

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          ZONE 1 — EN-TÊTE VÉHICULE
          ═══════════════════════════════════════════════════════════════ */}
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
            
            <Badge className={cn('border', status.color)} variant="outline">
              {status.label}
            </Badge>
            
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
                {reliabilityScore.score}/100
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
            </Link>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 2 — ALERTE CRITIQUE (pleine largeur)
          ═══════════════════════════════════════════════════════════════ */}
      <CriticalAlertBanner vehicleId={id} vehicleMileage={vehicle.mileage ?? 0} />

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 3 — ÉCHÉANCES + INFOS TECHNIQUES (côte à côte)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Échéances réglementaires - Compact (1/4) */}
        <div className="lg:col-span-1">
          <RegulatoryTimelineCompact vehicle={vehicle} />
        </div>
        
        {/* Informations techniques (3/4) */}
        <div className="lg:col-span-3">
          <Card className="detail-card h-full">
            <CardHeader className="detail-card-header pb-3">
              <CardTitle className="detail-card-title">
                <FileText className="h-5 w-5" />
                Informations techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="detail-card-content">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                <InfoItem label="Marque" value={vehicle.brand} />
                <InfoItem label="Modèle" value={vehicle.model} />
                <InfoItem label="Année" value={String(vehicle.year || '—')} />
                <InfoItem 
                  label="Type" 
                  value={detailedTypeLabels[vehicle.detailed_type as any] 
                    || typeLabels[vehicle.type as any] 
                    || vehicle.type} 
                />
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
                <InfoItem 
                  label="Conducteur" 
                  value={vehicle.drivers ? `${vehicle.drivers.first_name} ${vehicle.drivers.last_name}` : 'Non assigné'}
                />
                <InfoItem 
                  label="Activité" 
                  value={vehicle.type?.includes('FRIGO') ? 'Frigorifique' : 'Marchandises'}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 4 — MAINTENANCES PRÉVENTIVES (pleine largeur)
          ═══════════════════════════════════════════════════════════════ */}
      <MaintenancePredictionsPanel vehicleId={id} />

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 5 — BARRE WIDGETS : Score IA | Score fiabilité | Conducteur | QR Code
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Score IA Global (gauche) */}
        <VehicleScoreCard
          score={(vehicle as any).ai_global_score}
          summary={(vehicle as any).ai_score_summary}
          detail={(vehicle as any).ai_score_detail}
          updatedAt={(vehicle as any).ai_score_updated_at}
        />

        {/* Score de fiabilité */}
        <ReliabilityScoreWidget vehicleId={id} />
        
        {/* Conducteur (centre) */}
        <DriverAssignment vehicleId={vehicle.id} />
        
        {/* QR Code (droite) */}
        <QRCodeWidget 
          vehicleId={vehicle.id}
          registrationNumber={vehicle.registration_number}
          brand={vehicle.brand}
          model={vehicle.model}
          onExpand={() => setShowQRModal(true)}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 6 — ACTIVITÉ DE TRANSPORT (si non assignée)
          ═══════════════════════════════════════════════════════════════ */}
      <VehicleActivitySection vehicleId={vehicle.id} />

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 7 — ALERTE PRÉDICTIVE IA (pleine largeur)
          ═══════════════════════════════════════════════════════════════ */}
      <PredictionCard vehicleId={id} />

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 8 — ONGLETS HISTORIQUE (pleine largeur)
          ═══════════════════════════════════════════════════════════════ */}
      <div ref={tabsRef} className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex h-11 items-center justify-start gap-1 rounded-xl bg-slate-900/50 p-1.5 border border-slate-800 w-full">
            <TabsTrigger 
              value="maintenance" 
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 flex-1 justify-center"
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Historique maintenance</span>
              <span className="sm:hidden">Historique</span>
              {alertCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs px-1.5 border border-red-500/30">
                  {alertCount}
                </span>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="inspections"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 flex-1 justify-center"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Contrôles</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="documents"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 flex-1 justify-center"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:inline">Docs</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tco"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 flex-1 justify-center"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Coûts</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="tires"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 flex-1 justify-center"
            >
              <Disc className="h-4 w-4" />
              <span>Pneus</span>
              {tireCriticalCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs px-1.5 border border-red-500/30">
                  {tireCriticalCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="maintenance" className="mt-6">
            <Card className="detail-card">
              <CardHeader className="detail-card-header">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-white">Historique des maintenances</CardTitle>
                    <CardDescription className="text-slate-400">
                      Toutes les interventions et réparations du véhicule
                    </CardDescription>
                  </div>
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

      {/* ═══════════════════════════════════════════════════════════════
          ZONE 9 — ÉQUIPEMENT RÉGLEMENTAIRE (si applicable)
          ═══════════════════════════════════════════════════════════════ */}
      <VehicleEquipmentSection vehicleId={vehicle.id} />

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-cyan-400" />
              QR Code — {vehicle.registration_number?.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Scannez ce code pour accéder rapidement à la fiche véhicule
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="bg-white rounded-xl p-4">
              <VehicleQRCode 
                vehicleId={vehicle.id}
                registrationNumber={vehicle.registration_number}
                brand={vehicle.brand}
                model={vehicle.model}
              />
            </div>
          </div>
          <div className="text-center text-sm text-slate-400">
            <p>{vehicle.brand} {vehicle.model}</p>
            <p className="text-xs mt-1">{vehicle.mileage?.toLocaleString('fr-FR')} km</p>
          </div>
        </DialogContent>
      </Dialog>
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

// Widget Score de fiabilité (compact pour la barre)
function ReliabilityScoreWidget({ vehicleId }: { vehicleId: string }) {
  const { data: score, isLoading } = useVehicleReliabilityScore(vehicleId);

  if (isLoading) {
    return (
      <Card className="detail-card">
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!score) return null;

  return (
    <Card className="detail-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <CardTitle className="text-base text-white">Score de fiabilité</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: score.color }}
          >
            {score.score}
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-white">{score.score}/100</p>
            <p className="text-sm" style={{ color: score.color }}>{score.grade} · {score.label}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <ScoreBar label="Inspection" value={score.breakdown.inspection} color="#3b82f6" />
          <ScoreBar label="Maintenance" value={score.breakdown.maintenance} color="#22c55e" />
          <ScoreBar label="Conformité" value={score.breakdown.compliance} color="#f59e0b" />
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full" 
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-slate-300 w-8 text-right">{value}</span>
    </div>
  );
}

// Widget QR Code
function QRCodeWidget({ 
  vehicleId, 
  registrationNumber, 
  brand, 
  model,
  onExpand 
}: { 
  vehicleId: string; 
  registrationNumber: string; 
  brand?: string; 
  model?: string;
  onExpand: () => void;
}) {
  return (
    <Card className="detail-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-base text-white">QR Code</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExpand}>
            <Maximize2 className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-lg p-1.5 shrink-0">
            <VehicleQRCode 
              vehicleId={vehicleId}
              registrationNumber={registrationNumber}
              brand={brand}
              model={model}
              compact
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300">
              Scan pour accès rapide
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Inspection · Carburant · Carnet
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 text-cyan-400 h-auto py-1"
              onClick={onExpand}
            >
              Agrandir
            </Button>
          </div>
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
      
      <Skeleton className="h-24" />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 lg:col-span-3" />
      </div>
      
      <Skeleton className="h-[400px]" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>
  );
}

// Map des icônes pour les activités
const VEHICLE_ACTIVITY_ICONS: Record<TransportActivity, React.ElementType> = {
  MARCHANDISES_GENERALES: Package,
  FRIGORIFIQUE: Snowflake,
  ADR_COLIS: AlertTriangle,
  ADR_CITERNE: AlertOctagon,
  CONVOI_EXCEPTIONNEL: Truck,
  BENNE_TRAVAUX_PUBLICS: Construction,
  ANIMAUX_VIVANTS: Heart,
};

const VEHICLE_ACTIVITIES_CONFIG: Record<TransportActivity, { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  MARCHANDISES_GENERALES: {
    label: 'Marchandises Générales',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.2)',
    description: 'Transport standard',
  },
  FRIGORIFIQUE: {
    label: 'Frigorifique',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    description: 'Température dirigée',
  },
  ADR_COLIS: {
    label: 'ADR Colis',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.2)',
    description: 'Matières dangereuses en colis',
  },
  ADR_CITERNE: {
    label: 'ADR Citerne',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.2)',
    description: 'Matières dangereuses vrac',
  },
  CONVOI_EXCEPTIONNEL: {
    label: 'Convoi Exceptionnel',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.2)',
    description: 'Hors gabarit',
  },
  BENNE_TRAVAUX_PUBLICS: {
    label: 'Benne TP',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.2)',
    description: 'Matériaux construction',
  },
  ANIMAUX_VIVANTS: {
    label: 'Animaux Vivants',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.2)',
    description: 'Transport animalier',
  },
};

function VehicleEquipmentSection({ vehicleId }: { vehicleId: string }) {
  const [equipment, setEquipment] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: currentActivity } = useVehicleCurrentActivity(vehicleId);

  useEffect(() => {
    async function fetchEquipment() {
      if (!currentActivity?.activity) {
        setEquipment([]);
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      const { data: rules } = await supabase
        .from('compliance_rules')
        .select('equipment_list, requires_equipment')
        .eq('activity', currentActivity.activity)
        .not('equipment_list', 'is', null);

      const allEquipment = rules
        ?.filter(r => r.requires_equipment && r.equipment_list)
        .flatMap(r => r.equipment_list || []) || [];
      
      setEquipment(Array.from(new Set(allEquipment)));
      setLoading(false);
    }

    fetchEquipment();
  }, [currentActivity?.activity]);

  if (loading || equipment.length === 0) return null;

  return (
    <Card className="detail-card border-orange-500/20">
      <CardHeader className="detail-card-header pb-3">
        <CardTitle className="detail-card-title text-lg text-orange-400">
          <Package className="h-5 w-5" />
          Équipement réglementaire obligatoire
        </CardTitle>
        <CardDescription className="text-slate-400">
          Vérifiez la présence de cet équipement lors de chaque départ
        </CardDescription>
      </CardHeader>
      <CardContent className="detail-card-content">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map((item, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-orange-500/30 transition-colors"
            >
              <Checkbox id={`equip-${vehicleId}-${index}`} className="mt-0.5 border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
              <Label 
                htmlFor={`equip-${vehicleId}-${index}`} 
                className="text-sm text-slate-300 cursor-pointer flex-1 leading-relaxed"
              >
                {item}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-orange-400/70 mt-4 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Absence d&apos;un équipement = sanction possible en contrôle routier
        </p>
      </CardContent>
    </Card>
  );
}

function VehicleActivitySection({ vehicleId }: { vehicleId: string }) {
  const { data: currentActivity, isLoading } = useVehicleCurrentActivity(vehicleId);
  const { mutate: assignActivity, isPending: isAssigning } = useAssignVehicleActivity();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<TransportActivity | ''>('');

  if (isLoading) {
    return (
      <Card className="detail-card">
        <CardHeader className="detail-card-header">
          <CardTitle className="detail-card-title">
            <Truck className="h-5 w-5" />
            Activité de transport
          </CardTitle>
        </CardHeader>
        <CardContent className="detail-card-content">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activityConfig = currentActivity ? 
    VEHICLE_ACTIVITIES_CONFIG[currentActivity.activity] : 
    null;
  const ActivityIcon = currentActivity ? 
    VEHICLE_ACTIVITY_ICONS[currentActivity.activity] : 
    null;

  const handleAssign = () => {
    if (!selectedActivity) return;
    
    assignActivity({ 
      vehicleId, 
      activity: selectedActivity,
      notes: 'Assignation depuis la fiche véhicule'
    });
    setIsDialogOpen(false);
    setSelectedActivity('');
  };

  // Si une activité est déjà assignée, ne pas afficher cette section
  if (currentActivity) return null;

  return (
    <Card className="detail-card border-dashed border-slate-600">
      <CardHeader className="detail-card-header pb-3">
        <CardTitle className="detail-card-title text-lg">
          <Truck className="h-5 w-5" />
          Activité de transport
        </CardTitle>
      </CardHeader>
      <CardContent className="detail-card-content">
        <div className="text-center py-4">
          <p className="text-slate-400 mb-4">
            Aucune activité assignée à ce véhicule
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="detail-btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Assigner une activité
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Assigner une activité</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Définissez le type de transport pour ce véhicule. 
                  Les échéances réglementaires seront calculées en conséquence.
                </DialogDescription>
              </DialogHeader>
              <Select 
                value={selectedActivity} 
                onValueChange={(value) => setSelectedActivity(value as TransportActivity)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Choisir une activité..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(VEHICLE_ACTIVITIES_CONFIG).map(([key, config]) => {
                    const Icon = VEHICLE_ACTIVITY_ICONS[key as TransportActivity];
                    return (
                      <SelectItem 
                        key={key} 
                        value={key}
                        className="text-white hover:bg-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" style={{ color: config.color }} />}
                          <div className="flex flex-col">
                            <span>{config.label}</span>
                            <span className="text-xs text-slate-400">{config.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="border-slate-600"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleAssign}
                  disabled={!selectedActivity || isAssigning}
                  className="detail-btn-primary"
                >
                  {isAssigning ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Assignation...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
