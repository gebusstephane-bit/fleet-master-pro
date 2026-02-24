'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import '@/app/(dashboard)/detail-pages-premium.css';
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
  active: { label: 'Actif', color: 'detail-badge-active' },
  inactive: { label: 'Inactif', color: 'detail-badge-inactive' },
  on_leave: { label: 'En congé', color: 'detail-badge-maintenance' },
  terminated: { label: 'Terminé', color: 'detail-badge-critical' },
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

  const status = statusConfig[(driver as any).status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="detail-header">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-cyan-500/10" asChild>
            <Link href="/drivers">
              <ArrowLeft className="h-5 w-5 text-cyan-400" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 detail-avatar text-2xl">
              {(driver as any).first_name?.[0]}{(driver as any).last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {(driver as any).first_name} {(driver as any).last_name}
                </h1>
                <Badge className={status.color} variant="outline">
                  {status.label}
                </Badge>
              </div>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {(driver as any).email}
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
              value={(driver as any).phone || undefined}
              icon={<Phone className="h-4 w-4 text-blue-500" />}
            />
            <InfoItem 
              label="Email" 
              value={(driver as any).email || undefined}
              icon={<Mail className="h-4 w-4 text-blue-500" />}
            />
            <InfoItem 
              label="Date d'embauche" 
              value={(driver as any).hire_date ? formatDate((driver as any).hire_date) : undefined}
              icon={<Calendar className="h-4 w-4 text-blue-500" />}
            />
            {(driver as any).address && (
              <InfoItem 
                label="Adresse" 
                value={`${(driver as any).address}${(driver as any).city ? `, ${(driver as any).city}` : ''}`}
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
            <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-200">Permis de conduire</p>
                  <p className="text-sm text-slate-400">{(driver as any).license_number}</p>
                </div>
              </div>
              <LicenseExpiryAlert expiryDate={(driver as any).license_expiry} />
            </div>

            {/* CQC */}
            {(driver as any).cqc_card_number ? (
              <CQCCard
                number={(driver as any).cqc_card_number}
                expiryDate={(driver as any).cqc_expiry_date}
                category={(driver as any).cqc_category}
              />
            ) : (
              <div className="rounded-xl p-4 bg-amber-950/40 border border-amber-700/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-300">Carte CQC non renseignée</p>
                    <p className="text-sm text-amber-400/70 mt-1">
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
      {(driver as any).vehicles && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-400" />
              Véhicule assigné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/vehicles/${(driver as any).vehicles.id}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-700/80 transition-all"
            >
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                <Car className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-lg text-slate-200">{(driver as any).vehicles.registration_number}</p>
                <p className="text-sm text-slate-400">
                  {(driver as any).vehicles.brand} {(driver as any).vehicles.model} • {(driver as any).vehicles.year}
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-cyan-500/30 text-slate-300 hover:bg-cyan-500/10">Voir la fiche</Button>
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
              value={(driver as any).safety_score || 0}
              max={100}
              color="emerald"
            />
            <ScoreCard 
              label="Éco-conduite"
              value={(driver as any).fuel_efficiency_score || 0}
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

function InfoItem({ label, value, icon }: { label: string; value: string | undefined; icon?: React.ReactNode }) {
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
      "rounded-xl p-4 border",
      isExpired ? "bg-red-950/40 border-red-700/50" :
      isExpiringSoon ? "bg-amber-950/40 border-amber-700/50" :
      "bg-emerald-950/40 border-emerald-700/50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center",
          isExpired ? "bg-red-500/20" :
          isExpiringSoon ? "bg-amber-500/20" :
          "bg-emerald-500/20"
        )}>
          <Award className={cn("h-5 w-5",
            isExpired ? "text-red-400" :
            isExpiringSoon ? "text-amber-400" :
            "text-green-400"
          )} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-200">Carte Qualification Conducteur (CQC)</p>
          <p className="text-sm text-slate-400 mt-1">
            Numéro : <span className="font-mono">****{number.slice(-4)}</span>
          </p>
          <p className="text-sm text-slate-400">
            Catégorie : <Badge variant="outline" className="font-normal border-slate-600 text-slate-300">
              {cqcCategoryLabels[category] || category}
            </Badge>
          </p>
          <p className={cn("text-sm mt-2 font-medium",
            isExpired ? "text-red-400" :
            isExpiringSoon ? "text-amber-400" :
            "text-green-400"
          )}>
            {isExpired && `⚠️ Expirée depuis ${Math.abs(daysUntil!)} jours`}
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
  const barClasses = {
    emerald: 'scorecard-bar-fill scorecard-bar-emerald',
    blue: 'scorecard-bar-fill scorecard-bar-cyan',
    amber: 'scorecard-bar-fill scorecard-bar-amber',
  };

  return (
    <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-sm text-slate-500 mb-1">/{max}</span>
      </div>
      <div className="mt-3 h-2 rounded-full overflow-hidden bg-slate-700">
        <div
          className={barClasses[color]}
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
