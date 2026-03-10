'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import '@/app/(dashboard)/detail-pages-premium.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Edit, Phone, Mail, Calendar, CreditCard,
  Car, MapPin, AlertTriangle, CheckCircle2, Clock,
  Award, ShieldCheck, Truck, HeartPulse, FileText, User, FolderOpen, Plus,
} from 'lucide-react';
import { DocumentList } from '@/components/drivers/DocumentList';
import { DocumentUpload } from '@/components/drivers/DocumentUpload';
import { DriverAppAccessManager } from '@/components/drivers/DriverAppAccessManager';
import { useState } from 'react';
import { useDriver } from '@/hooks/use-drivers';
import { useDriverAssignments } from '@/hooks/use-assignments';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

// ─── Config statuts ────────────────────────────────────────────────────────────

const statusConfig = {
  active:     { label: 'Actif',    color: 'detail-badge-active' },
  inactive:   { label: 'Inactif',  color: 'detail-badge-inactive' },
  on_leave:   { label: 'En congé', color: 'detail-badge-maintenance' },
  suspended:  { label: 'Suspendu', color: 'detail-badge-critical' },
  terminated: { label: 'Terminé',  color: 'detail-badge-critical' },
};

const cqcCategoryLabels: Record<string, string> = {
  PASSENGER: 'Voyageurs',
  GOODS: 'Marchandises',
  BOTH: 'Les deux',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysLeft(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return differenceInDays(new Date(dateStr), new Date());
}

function ExpiryStatus({ days, label }: { days: number | null; label: string }) {
  if (days === null) return <span className="text-slate-500 text-sm">—</span>;
  const expired  = days < 0;
  const warning  = days <= 30;
  const soon     = days <= 60;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-sm font-medium',
      expired ? 'text-red-400' : warning ? 'text-red-400' : soon ? 'text-amber-400' : 'text-emerald-400'
    )}>
      {expired
        ? <><AlertTriangle className="h-3.5 w-3.5" /> Expiré ({Math.abs(days)}j)</>
        : warning
        ? <><Clock className="h-3.5 w-3.5" /> {days}j restants</>
        : soon
        ? <><Clock className="h-3.5 w-3.5" /> {days}j — {label && formatDate(label)}</>
        : <><CheckCircle2 className="h-3.5 w-3.5" /> Valide · {formatDate(label)}</>
      }
    </span>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: driver, isLoading } = useDriver(id);
  const { data: driverAssignments } = useDriverAssignments(id);
  const [showUpload, setShowUpload] = useState(false);
  const [docRefreshKey, setDocRefreshKey] = useState(0);

  if (isLoading) return <DriverDetailSkeleton />;
  if (!driver) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white">Conducteur non trouvé</h1>
        <Button asChild className="mt-4"><Link href="/drivers">Retour à la liste</Link></Button>
      </div>
    );
  }

  const d = driver as any;
  const status = statusConfig[d.status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="detail-header">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-cyan-500/10" asChild>
            <Link href="/drivers"><ArrowLeft className="h-5 w-5 text-cyan-400" /></Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 detail-avatar text-2xl">
              {d.first_name?.[0]}{d.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {d.first_name} {d.last_name}
                </h1>
                <Badge className={status.color} variant="outline">{status.label}</Badge>
              </div>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" />{d.email}
              </p>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/drivers/${id}/edit`}><Edit className="h-4 w-4 mr-2" />Modifier</Link>
        </Button>
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Informations personnelles */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem label="Téléphone"      value={d.phone}    icon={<Phone className="h-4 w-4 text-blue-500" />} />
            <InfoItem label="Email"          value={d.email}    icon={<Mail  className="h-4 w-4 text-blue-500" />} />
            {d.address && (
              <InfoItem
                label="Adresse"
                value={`${d.address}${d.city ? `, ${d.city}` : ''}`}
                icon={<MapPin className="h-4 w-4 text-blue-500" />}
              />
            )}
            {d.nationality && (
              <InfoItem label="Nationalité" value={d.nationality} icon={<FileText className="h-4 w-4 text-blue-500" />} />
            )}
            {d.birth_date && (
              <InfoItem label="Date de naissance" value={formatDate(d.birth_date)} icon={<Calendar className="h-4 w-4 text-blue-500" />} />
            )}
          </CardContent>
        </Card>

        {/* Qualifications */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-400" />
              Qualifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Permis */}
            <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-200">Permis de conduire</p>
                  <p className="text-sm text-slate-400">{d.license_number} · Type {d.license_type || 'B'}</p>
                </div>
              </div>
              <LicenseExpiryAlert expiryDate={d.license_expiry} />
            </div>

            {/* CQC */}
            {d.cqc_card_number ? (
              <CQCCard number={d.cqc_card_number} expiryDate={d.cqc_expiry_date || d.cqc_expiry} category={d.cqc_category} />
            ) : (
              <div className="rounded-xl p-4 bg-amber-950/40 border border-amber-700/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-300">Carte CQC non renseignée</p>
                    <p className="text-sm text-amber-400/70 mt-1">Obligatoire pour le transport de marchandises ou voyageurs.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Carte conducteur numérique */}
            {d.driver_card_number && (
              <DocRow
                icon={<Truck className="h-4 w-4 text-purple-400" />}
                title="Carte conducteur numérique"
                subtitle={`N° ${d.driver_card_number}`}
                days={daysLeft(d.driver_card_expiry)}
                expiryDate={d.driver_card_expiry}
              />
            )}

          </CardContent>
        </Card>
      </div>

      {/* ── Documents réglementaires ── */}
      {(d.fimo_date || d.fcos_expiry || d.qi_date || d.medical_certificate_expiry || d.adr_certificate_expiry) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              Documents réglementaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {d.fimo_date && (
                <DocCard
                  icon={<Award className="h-5 w-5 text-blue-400" />}
                  title="FIMO"
                  subtitle="Formation Initiale Minimum Obligatoire"
                  lines={[`Obtenu le ${formatDate(d.fimo_date)}`]}
                />
              )}

              {d.fcos_expiry && (
                <DocCard
                  icon={<Award className="h-5 w-5 text-cyan-400" />}
                  title="FCO"
                  subtitle="Formation Continue Obligatoire"
                  days={daysLeft(d.fcos_expiry)}
                  expiryDate={d.fcos_expiry}
                />
              )}

              {d.qi_date && (
                <DocCard
                  icon={<FileText className="h-5 w-5 text-indigo-400" />}
                  title="QI — Qualification Initiale"
                  lines={[`Obtenu le ${formatDate(d.qi_date)}`]}
                />
              )}

              {d.medical_certificate_expiry && (
                <DocCard
                  icon={<HeartPulse className="h-5 w-5 text-rose-400" />}
                  title="Aptitude médicale"
                  days={daysLeft(d.medical_certificate_expiry)}
                  expiryDate={d.medical_certificate_expiry}
                />
              )}

              {d.adr_certificate_expiry && (
                <DocCard
                  icon={<ShieldCheck className="h-5 w-5 text-amber-400" />}
                  title="Certificat ADR"
                  subtitle="Transport matières dangereuses"
                  days={daysLeft(d.adr_certificate_expiry)}
                  expiryDate={d.adr_certificate_expiry}
                  lines={
                    d.adr_classes?.length
                      ? [`Classes : ${d.adr_classes.map((c: string) => `Cl.${c}`).join(' · ')}`]
                      : undefined
                  }
                />
              )}

            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Contrat ── */}
      {(d.hire_date || d.contract_type) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Contrat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {d.hire_date && (
                <InfoItem
                  label="Date d'embauche"
                  value={formatDate(d.hire_date)}
                  icon={<Calendar className="h-4 w-4 text-blue-500" />}
                />
              )}
              {d.contract_type && (
                <InfoItem
                  label="Type de contrat"
                  value={d.contract_type}
                  icon={<FileText className="h-4 w-4 text-blue-500" />}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Véhicule(s) attribué(s) ── */}
      {(() => {
        const activeAssignments = driverAssignments?.filter(a => a.end_date === null) ?? [];
        if (activeAssignments.length === 0) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-400" />
                Véhicule{activeAssignments.length > 1 ? 's' : ''} attribué{activeAssignments.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeAssignments.map(a => (
                a.vehicles && (
                  <Link
                    key={a.id}
                    href={`/vehicles/${a.vehicles.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-700/80 transition-all"
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                      <Car className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg text-slate-200">{a.vehicles.registration_number}</p>
                      <p className="text-sm text-slate-400">
                        {a.vehicles.brand} {a.vehicles.model} · {a.vehicles.year}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="border-cyan-500/30 text-slate-300 hover:bg-cyan-500/10">
                      Voir la fiche
                    </Button>
                  </Link>
                )
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Documents officiels ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-cyan-400" />
              Documents officiels
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-500/30 text-slate-300 hover:bg-cyan-500/10"
              onClick={() => setShowUpload(v => !v)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {showUpload ? 'Fermer' : 'Ajouter'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUpload && (
            <div className="rounded-xl border border-slate-700 p-4 bg-slate-900/50">
              <p className="text-sm font-medium text-slate-300 mb-3">Nouveau document</p>
              <DocumentUpload
                driverId={id}
                companyId={d.company_id}
                onSuccess={() => {
                  setShowUpload(false);
                  setDocRefreshKey(k => k + 1);
                }}
              />
            </div>
          )}
          <DocumentList driverId={id} refreshKey={docRefreshKey} />
        </CardContent>
      </Card>

      {/* ── Scorecard ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScoreCard label="Sécurité"     value={d.safety_score || 0}          color="emerald" />
            <ScoreCard label="Éco-conduite" value={d.fuel_efficiency_score || 0}  color="blue" />
            <ScoreCard label="Ponctualité"  value={85}                            color="amber" />
          </div>
        </CardContent>
      </Card>

      {/* ── Accès Application Mobile ── */}
      <DriverAppAccessManager 
        driverId={id}
        driver={{
          id: d.id,
          user_id: d.user_id,
          has_app_access: d.has_app_access,
          first_name: d.first_name,
          last_name: d.last_name,
          email: d.email,
          company_id: d.company_id,
        }}
      />

    </div>
  );
}

// ─── Composants réutilisables ──────────────────────────────────────────────────

function InfoItem({ label, value, icon }: { label: string; value: string | undefined | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-medium text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function LicenseExpiryAlert({ expiryDate }: { expiryDate: string }) {
  if (!expiryDate) return null;
  const days = differenceInDays(new Date(expiryDate), new Date());
  const isExpired = days < 0;
  const isSoon    = days <= 30 && days >= 0;
  return (
    <div className={cn('flex items-center gap-2 text-sm',
      isExpired ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-emerald-400'
    )}>
      {isExpired ? <AlertTriangle className="h-4 w-4" /> : isSoon ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      <span>
        {isExpired && `Expiré depuis ${Math.abs(days)} jours`}
        {isSoon    && `Expire dans ${days} jours — ${formatDate(expiryDate)}`}
        {!isExpired && !isSoon && `Expire le ${formatDate(expiryDate)}`}
      </span>
    </div>
  );
}

function CQCCard({ number, expiryDate, category }: { number: string; expiryDate: string; category: string }) {
  const days = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;
  const isExpired = days !== null && days < 0;
  const isSoon    = days !== null && days <= 30 && days >= 0;
  return (
    <div className={cn('rounded-xl p-4 border',
      isExpired ? 'bg-red-950/40 border-red-700/50' :
      isSoon    ? 'bg-amber-950/40 border-amber-700/50' :
                  'bg-emerald-950/40 border-emerald-700/50'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center',
          isExpired ? 'bg-red-500/20' : isSoon ? 'bg-amber-500/20' : 'bg-emerald-500/20'
        )}>
          <Award className={cn('h-5 w-5', isExpired ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-emerald-400')} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-200">Carte Qualification Conducteur (CQC)</p>
          <p className="text-sm text-slate-400 mt-1">N° <span className="font-mono">****{number.slice(-4)}</span></p>
          <p className="text-sm text-slate-400">
            Catégorie : <Badge variant="outline" className="font-normal border-slate-600 text-slate-300">
              {cqcCategoryLabels[category] || category}
            </Badge>
          </p>
          {days !== null && (
            <p className={cn('text-sm mt-2 font-medium',
              isExpired ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-emerald-400'
            )}>
              {isExpired && `⚠️ Expirée depuis ${Math.abs(days)} jours`}
              {isSoon    && `⏰ Expire dans ${days} jours`}
              {!isExpired && !isSoon && `✅ Valide — expire le ${formatDate(expiryDate)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DocRow({ icon, title, subtitle, days, expiryDate }: {
  icon: React.ReactNode; title: string; subtitle?: string; days: number | null; expiryDate?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 bg-slate-800 border border-slate-700">
      <div className="h-9 w-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-200 text-sm">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>
      {expiryDate && <ExpiryStatus days={days} label={expiryDate} />}
    </div>
  );
}

function DocCard({ icon, title, subtitle, days, expiryDate, lines }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  days?: number | null; expiryDate?: string; lines?: string[];
}) {
  const expired = days !== null && days !== undefined && days < 0;
  const warning = days !== null && days !== undefined && days <= 30 && days >= 0;
  const soon    = days !== null && days !== undefined && days <= 60 && days >= 0;
  return (
    <div className={cn(
      'rounded-xl p-4 border',
      days === undefined || days === null
        ? 'bg-slate-800 border-slate-700'
        : expired ? 'bg-red-950/40 border-red-700/50'
        : warning ? 'bg-amber-950/40 border-amber-700/50'
        : soon    ? 'bg-amber-950/20 border-amber-700/30'
        :           'bg-emerald-950/30 border-emerald-700/40'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-lg bg-slate-700/80 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <p className="font-medium text-slate-200 text-sm leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {expiryDate && (
        <div className="mt-2">
          <ExpiryStatus days={days ?? null} label={expiryDate} />
        </div>
      )}
      {lines?.map((line, i) => (
        <p key={i} className="text-xs text-slate-400 mt-1">{line}</p>
      ))}
    </div>
  );
}

function ScoreCard({ label, value, color }: { label: string; value: number; color: 'emerald' | 'blue' | 'amber' }) {
  const barClass = { emerald: 'scorecard-bar-fill scorecard-bar-emerald', blue: 'scorecard-bar-fill scorecard-bar-cyan', amber: 'scorecard-bar-fill scorecard-bar-amber' };
  return (
    <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-sm text-slate-500 mb-1">/100</span>
      </div>
      <div className="mt-3 h-2 rounded-full overflow-hidden bg-slate-700">
        <div className={barClass[color]} style={{ width: `${value}%` }} />
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
        <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-32 mt-1" /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[250px]" />
        <Skeleton className="h-[250px] lg:col-span-2" />
      </div>
    </div>
  );
}
