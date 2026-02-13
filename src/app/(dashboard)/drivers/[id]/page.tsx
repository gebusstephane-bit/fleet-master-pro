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
  Phone, 
  Mail, 
  Calendar, 
  CreditCard,
  Car,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Award
} from 'lucide-react';
import { useDriver } from '@/hooks/use-drivers';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

const statusConfig = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactif', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  on_leave: { label: 'En congé', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  terminated: { label: 'Terminé', color: 'bg-red-100 text-red-700 border-red-200' },
};

const cqcCategoryLabels: Record<string, string> = {
  PASSENGER: 'Voyageurs',
  GOODS: 'Marchandises',
  BOTH: 'Les deux',
};

export default function DriverDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: driver, isLoading } = useDriver(id);

  if (isLoading) {
    return <DriverDetailSkeleton />;
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white">Conducteur non trouvé</h1>
        <p className="text-gray-400 mt-2">Le conducteur demandé n'existe pas ou a été supprimé.</p>
        <Button asChild className="mt-4">
          <Link href="/drivers">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[driver.status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
            <Link href="/drivers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {driver.first_name?.[0]}{driver.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {driver.first_name} {driver.last_name}
                </h1>
                <Badge className={status.color} variant="outline">
                  {status.label}
                </Badge>
              </div>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {driver.email}
              </p>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/drivers/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 : Infos personnelles */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem 
              label="Téléphone" 
              value={driver.phone}
              icon={<Phone className="h-4 w-4 text-blue-500" />}
            />
            <InfoItem 
              label="Email" 
              value={driver.email}
              icon={<Mail className="h-4 w-4 text-blue-500" />}
            />
            <InfoItem 
              label="Date d'embauche" 
              value={driver.hire_date ? formatDate(driver.hire_date) : 'Non renseignée'}
              icon={<Calendar className="h-4 w-4 text-blue-500" />}
            />
            {driver.address && (
              <InfoItem 
                label="Adresse" 
                value={`${driver.address}${driver.city ? `, ${driver.city}` : ''}`}
                icon={<MapPin className="h-4 w-4 text-blue-500" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Colonne 2 & 3 : Permis et CQC */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Qualifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Permis */}
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Permis de conduire</p>
                  <p className="text-sm text-gray-400">{driver.license_number}</p>
                </div>
              </div>
              <LicenseExpiryAlert expiryDate={driver.license_expiry} />
            </div>

            {/* CQC */}
            {driver.cqc_card_number ? (
              <CQCCard 
                number={driver.cqc_card_number}
                expiryDate={driver.cqc_expiry_date}
                category={driver.cqc_category}
              />
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Carte CQC non renseignée</p>
                    <p className="text-sm text-amber-700 mt-1">
                      La qualification conducteur est obligatoire pour le transport de marchandises ou voyageurs.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Véhicule assigné */}
      {driver.vehicles && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-500" />
              Véhicule assigné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link 
              href={`/vehicles/${driver.vehicles.id}`}
              className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                <Car className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-lg">{driver.vehicles.registration_number}</p>
                <p className="text-sm text-gray-400">
                  {driver.vehicles.brand} {driver.vehicles.model} • {driver.vehicles.year}
                </p>
              </div>
              <Button variant="outline" size="sm">Voir la fiche</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Scorecard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScoreCard 
              label="Sécurité"
              value={driver.safety_score || 0}
              max={100}
              color="emerald"
            />
            <ScoreCard 
              label="Éco-conduite"
              value={driver.fuel_efficiency_score || 0}
              max={100}
              color="blue"
            />
            <ScoreCard 
              label="Ponctualité"
              value={85}
              max={100}
              color="amber"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5">{icon}</div>}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-medium text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function LicenseExpiryAlert({ expiryDate }: { expiryDate: string }) {
  if (!expiryDate) return null;
  
  const daysUntil = differenceInDays(new Date(expiryDate), new Date());
  const isExpired = daysUntil < 0;
  const isExpiringSoon = daysUntil <= 30 && daysUntil >= 0;
  
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-green-600"
    )}>
      {isExpired ? (
        <AlertTriangle className="h-4 w-4" />
      ) : isExpiringSoon ? (
        <Clock className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      <span>
        Expire le {formatDate(expiryDate)}
        {isExpired && ` (Expiré depuis ${Math.abs(daysUntil)} jours)`}
        {isExpiringSoon && ` (${daysUntil} jours restants)`}
      </span>
    </div>
  );
}

function CQCCard({ number, expiryDate, category }: { 
  number: string; 
  expiryDate: string; 
  category: string;
}) {
  const daysUntil = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;
  const isExpired = daysUntil !== null && daysUntil < 0;
  const isExpiringSoon = daysUntil !== null && daysUntil <= 30 && daysUntil >= 0;
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      isExpired ? "bg-red-50 border-red-200" :
      isExpiringSoon ? "bg-amber-50 border-amber-200" :
      "bg-green-50 border-green-200"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center",
          isExpired ? "bg-red-100" :
          isExpiringSoon ? "bg-amber-100" :
          "bg-green-100"
        )}>
          <Award className={cn("h-5 w-5",
            isExpired ? "text-red-600" :
            isExpiringSoon ? "text-amber-600" :
            "text-green-600"
          )} />
        </div>
        <div className="flex-1">
          <p className="font-medium">Carte Qualification Conducteur (CQC)</p>
          <p className="text-sm text-gray-300 mt-1">
            Numéro : <span className="font-mono">****{number.slice(-4)}</span>
          </p>
          <p className="text-sm text-gray-300">
            Catégorie : <Badge variant="outline" className="font-normal">
              {cqcCategoryLabels[category] || category}
            </Badge>
          </p>
          <p className={cn("text-sm mt-2 font-medium",
            isExpired ? "text-red-600" :
            isExpiringSoon ? "text-amber-600" :
            "text-green-600"
          )}>
            {isExpired && `⚠️ Expirée depuis ${Math.abs(daysUntil)} jours`}
            {isExpiringSoon && `⏰ Expire dans ${daysUntil} jours`}
            {!isExpired && !isExpiringSoon && daysUntil !== null && `✅ Valide (${daysUntil} jours)`}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, max, color }: { 
  label: string; 
  value: number; 
  max: number;
  color: 'emerald' | 'blue' | 'amber';
}) {
  const percentage = (value / max) * 100;
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };
  
  return (
    <div className="p-4 rounded-lg bg-slate-50">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-sm text-gray-400 mb-1">/{max}</span>
      </div>
      <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DriverDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px] lg:col-span-2" />
      </div>
    </div>
  );
}
