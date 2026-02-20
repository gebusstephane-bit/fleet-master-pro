'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Calendar, 
  Fuel, 
  Gauge, 
  User, 
  FileText,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Brain
} from 'lucide-react';
import '@/app/(dashboard)/detail-pages-premium.css';
import { useVehicle } from '@/hooks/use-vehicles';
import { useMaintenancesByVehicle } from '@/hooks/use-maintenance';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate } from '@/lib/utils';
import { RegulatoryDatesCard } from '@/components/vehicles/regulatory-dates-card';
import { VehicleMaintenanceTimeline } from '@/components/maintenance/vehicle-maintenance-timeline';
import { VehicleQRCode } from '@/components/vehicle-qr-code';
import { PredictionCard } from '@/components/ai-predict';
import { VehicleInspections } from '@/components/vehicles/vehicle-inspections';
import dynamic from 'next/dynamic';

// Import dynamique de Mapbox (côté client uniquement)
const VehicleMap = dynamic(() => import('@/components/vehicles/detail/vehicle-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-gray-500/20 rounded-lg">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  ),
});

const statusConfig = {
  active: { label: 'Actif', color: 'detail-badge-active' },
  inactive: { label: 'Inactif', color: 'detail-badge-inactive' },
  maintenance: { label: 'En maintenance', color: 'detail-badge-maintenance' },
  retired: { label: 'Retiré', color: 'detail-badge-critical' },
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
  const id = params.id as string;
  
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(id);
  const { data: maintenances, isLoading: maintenanceLoading } = useMaintenancesByVehicle(id);

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

  const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="detail-header">
        <div className="detail-header-title">
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-cyan-500/10" asChild>
            <Link href="/vehicles">
              <ArrowLeft className="h-5 w-5 text-cyan-400" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {vehicle.registration_number}
              </h1>
              <Badge className={`${status.color} detail-header-badge`} variant="outline">
                {status.label}
              </Badge>
            </div>
            <p className="text-slate-400">{vehicle.brand} {vehicle.model} • {vehicle.year}</p>
          </div>
        </div>
        <Button asChild className="detail-btn-primary">
          <Link href={`/vehicles/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 : Carte */}
        <Card className="lg:col-span-1 detail-card">
          <CardHeader className="detail-card-header">
            <CardTitle className="detail-card-title">
              <MapPin className="h-5 w-5" />
              Position
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <VehicleMap 
              vehicle={{
                id: vehicle.id,
                registration: vehicle.registration_number,
                lat: 48.8566,
                lng: 2.3522,
                lastUpdate: new Date().toISOString(),
              }} 
            />
          </CardContent>
        </Card>

        {/* Colonne 2 : Infos */}
        <Card className="lg:col-span-1 detail-card">
          <CardHeader className="detail-card-header">
            <CardTitle className="detail-card-title">
              <FileText className="h-5 w-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="detail-card-content space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Marque" value={vehicle.brand} />
              <InfoItem label="Modèle" value={vehicle.model} />
              <InfoItem label="Année" value={String(vehicle.year)} />
              <InfoItem label="Type" value={typeLabels[vehicle.type as any] || vehicle.type} />
              <InfoItem label="Carburant" value={fuelLabels[vehicle.fuel_type as any] || vehicle.fuel_type} />
              <InfoItem label="Couleur" value={vehicle.color || ''} />
            </div>
            
            <div className="pt-4 border-t">
              <InfoItem 
                label="Kilométrage" 
                value={`${vehicle.mileage?.toLocaleString('fr-FR')} km`}
                icon={<Gauge className="h-4 w-4 text-blue-500" />}
              />
            </div>

            {vehicle.drivers && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-400 mb-2">Chauffeur assigné</p>
                <Link 
                  href={`/drivers/${vehicle.drivers.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-gray-500/20 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {vehicle.drivers.first_name?.[0]}{vehicle.drivers.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {vehicle.drivers.first_name} {vehicle.drivers.last_name}
                    </p>
                    <p className="text-sm text-gray-400">Voir la fiche</p>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colonne 3 : Échéances réglementaires */}
        <RegulatoryDatesCard vehicle={vehicle} />
        
        {/* Colonne 4 : QR Code */}
        <VehicleQRCode 
          vehicleId={vehicle.id}
          registrationNumber={vehicle.registration_number}
          brand={vehicle.brand}
          model={vehicle.model}
        />
        
        {/* Colonne 5 : Prédiction IA */}
        <PredictionCard vehicleId={vehicle.id} />
      </div>

      {/* Onglets Documents, Maintenance & Contrôles */}
      <Tabs defaultValue="maintenance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
            {maintenances && maintenances.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {maintenances.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Contrôles
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="prediction" className="gap-2">
            <Brain className="h-4 w-4" />
            IA Prédiction
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des maintenances</CardTitle>
              <CardDescription>
                Toutes les interventions et réparations du véhicule
              </CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
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
        
        <TabsContent value="prediction" className="mt-6">
          <PredictionCard vehicleId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {icon}
        <p className="font-medium text-white">{value || '-'}</p>
      </div>
    </div>
  );
}

function DateAlert({ label, date, icon }: { label: string; date: string; icon: React.ReactNode }) {
  if (!date) return null;
  
  const dateObj = new Date(date);
  const now = new Date();
  const daysUntil = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let status: 'ok' | 'warning' | 'danger' = 'ok';
  if (daysUntil < 0) status = 'danger';
  else if (daysUntil < 30) status = 'warning';
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      status === 'danger' ? 'bg-red-50 border border-red-200' :
      status === 'warning' ? 'bg-amber-50 border border-amber-200' :
      'bg-white/5'
    }`}>
      <div className={`p-2 rounded-full ${
        status === 'danger' ? 'bg-red-100 text-red-600' :
        status === 'warning' ? 'bg-amber-100 text-amber-600' :
        'bg-blue-100 text-blue-600'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-sm ${
          status === 'danger' ? 'text-red-600 font-semibold' :
          status === 'warning' ? 'text-amber-600' :
          'text-gray-400'
        }`}>
          {formatDate(date)}
          {status === 'danger' && ' (Expiré)'}
          {status === 'warning' && ` (${daysUntil} jours)`}
        </p>
      </div>
    </div>
  );
}

function VehicleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
