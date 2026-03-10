'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Car,
  Users,
  Download,
  Calendar,
  ChevronRight,
  Package,
  XCircle,
  Info,
  Snowflake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { cn } from '@/lib/utils';
import { useCompliance } from '@/hooks/use-compliance';
import { useCompanyActivities } from '@/hooks/use-company-activities';
import { useUserContext } from '@/components/providers/user-provider';
import {
  getDocumentStatus,
  calculateComplianceScore,
  type DocumentStatusResult,
} from '@/lib/compliance-utils';
import type { VehicleComplianceData, DriverComplianceData } from '@/hooks/use-compliance';

// ============================================
// TYPES
// ============================================
type FilterType = 'all' | 'critical' | 'expired' | 'valid';

interface VehicleWithScore extends VehicleComplianceData {
  score: number;
  documents: Array<{ name: string; code: string; status: DocumentStatusResult }>;
  activityType?: string | null;
}

interface DriverWithScore extends DriverComplianceData {
  score: number;
  isCompliant?: boolean;
  documents: Array<{ name: string; status: DocumentStatusResult }>;
}

import {
  ACTIVITY_DOCUMENTS,
  getDocumentsForActivities,
  type DocumentConfig,
  type TransportActivity
} from '@/lib/compliance-activities-config';
import { USER_ROLE } from '@/constants/enums';

// Équipements par type de document
const DOCUMENT_EQUIPMENT: Record<string, string[]> = {
  'ADR_EQUIPEMENT': [
    'Valise ADR complète',
    'Panneaux orange (2)',
    'Gilets jaunes',
    'Cônes de signalisation',
    'Lampes torches',
  ],
  'ETALONNAGE': [
    'Sondes de température',
    'Enregistreur',
    'Groupe frigorifique',
  ],
};

// Configuration DREAL simplifiée : uniquement les documents obligatoires
// CQC (FCO) = fusion de fcos_expiry et cqc_expiry (la date la plus restrictive)
const driverDocuments = [
  { key: 'license_expiry' as const, label: 'Permis de conduire' },
  { key: 'medical_certificate_expiry' as const, label: 'Visite médicale' },
  { key: 'cqc_fco' as const, label: 'CQC (FCO)' }, // Fusion CQC + FCO
  { key: 'adr_certificate_expiry' as const, label: 'ADR' },
];

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

/**
 * Badge de statut de document
 */
function DocumentStatusBadge({ status }: { status: DocumentStatusResult }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        status.bgColor,
        status.textColor,
        status.borderColor
      )}
    >
      {status.status === 'expired' && <AlertCircle className="h-3 w-3" />}
      {status.status === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {status.status === 'valid' && <CheckCircle className="h-3 w-3" />}
      {status.status === 'missing' && <span className="h-3 w-3">—</span>}
      {status.label}
    </span>
  );
}

/**
 * Badge de document avec tooltip pour l'équipement
 */
function DocumentStatusWithEquipment({ 
  status, 
  documentCode 
}: { 
  status: DocumentStatusResult; 
  documentCode?: string;
}) {
  const equipment = documentCode ? DOCUMENT_EQUIPMENT[documentCode] : null;
  const hasEquipment = equipment && equipment.length > 0;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        status.bgColor,
        status.textColor,
        status.borderColor
      )}
    >
      {status.status === 'expired' && <AlertCircle className="h-3 w-3" />}
      {status.status === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {status.status === 'valid' && <CheckCircle className="h-3 w-3" />}
      {status.status === 'missing' && <span className="h-3 w-3">—</span>}
      {status.label}
      {hasEquipment && (
        <Package className="h-3 w-3 ml-1 text-slate-400" />
      )}
    </span>
  );

  if (!hasEquipment) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Équipement requis:</p>
          <ul className="text-xs space-y-0.5">
            {equipment.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Score de conformité avec barre de progression (pour véhicules)
 */
function ComplianceScore({ score }: { score: number }) {
  const colorClass = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-sm font-medium w-12 text-right', colorClass)}>{score}%</span>
    </div>
  );
}

/**
 * Statut Global binaire DREAL : Conforme / Non-conforme
 * Non-conforme si au moins un document est expiré ou manquant
 */
function GlobalStatusBadge({ isCompliant }: { isCompliant: boolean }) {
  if (isCompliant) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
        <CheckCircle className="h-3.5 w-3.5" />
        Conforme
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-red-500/15 text-red-400 border-red-500/20">
      <AlertCircle className="h-3.5 w-3.5" />
      Non-conforme
    </span>
  );
}

/**
 * Carte KPI
 */
function KPICard({
  title,
  count,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', bgColor, color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white">
            <AnimatedNumber value={count} />
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================
// COMPOSANTS DE TABLEAUX
// ============================================

/**
 * Tableau des véhicules (desktop)
 */
function VehiclesTable({
  vehicles,
  onRowClick,
}: {
  vehicles: VehicleWithScore[];
  onRowClick?: (vehicle: VehicleWithScore) => void;
}) {
  // Les headers sont déterminés par le premier véhicule (tous ont les mêmes documents)
  const headers = vehicles.length > 0 ? vehicles[0].documents : [];
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Véhicule
            </th>
            {headers.map((doc, idx) => (
              <th
                key={idx}
                className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
              >
                {doc.name}
              </th>
            ))}
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider w-32">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {vehicles.map((vehicle) => (
            <tr
              key={vehicle.id}
              onClick={() => onRowClick?.(vehicle)}
              className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                    <Car className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{vehicle.immatriculation}</p>
                    <p className="text-xs text-slate-500">
                      {vehicle.marque} {vehicle.modele}
                    </p>
                  </div>
                </div>
              </td>
              {vehicle.documents.map((doc, idx) => (
                <td key={idx} className="py-3 px-4">
                  <DocumentStatusWithEquipment status={doc.status} documentCode={doc.code} />
                </td>
              ))}
              <td className="py-3 px-4">
                <ComplianceScore score={vehicle.score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Cartes véhicules (mobile)
 */
function VehiclesMobileCards({
  vehicles,
  onCardClick,
}: {
  vehicles: VehicleWithScore[];
  onCardClick?: (vehicle: VehicleWithScore) => void;
}) {
  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => (
        <GlassCard
          key={vehicle.id}
          onClick={() => onCardClick?.(vehicle)}
          className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Car className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-white">{vehicle.immatriculation}</p>
                <p className="text-xs text-slate-500">
                  {vehicle.marque} {vehicle.modele}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={cn(
                  'text-sm font-bold',
                  vehicle.score >= 80 ? 'text-emerald-400' : vehicle.score >= 50 ? 'text-amber-400' : 'text-red-400'
                )}
              >
                {vehicle.score}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {vehicle.documents.map((doc, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">{doc.name}</span>
                <DocumentStatusWithEquipment status={doc.status} documentCode={doc.code} />
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/**
 * Tableau des conducteurs (desktop)
 */
function DriversTable({
  drivers,
  onRowClick,
}: {
  drivers: DriverWithScore[];
  onRowClick?: (driver: DriverWithScore) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Conducteur
            </th>
            {driverDocuments.map((doc) => (
              <th
                key={doc.key}
                className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
              >
                {doc.label}
              </th>
            ))}
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider w-32">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {drivers.map((driver) => (
            <tr
              key={driver.id}
              onClick={() => onRowClick?.(driver)}
              className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {driver.first_name?.[0]}
                    {driver.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {driver.first_name} {driver.last_name}
                    </p>
                    <p className="text-xs text-slate-500">Conducteur</p>
                  </div>
                </div>
              </td>
              {driver.documents.map((doc, idx) => (
                <td key={idx} className="py-3 px-4">
                  <DocumentStatusBadge status={doc.status} />
                </td>
              ))}
              <td className="py-3 px-4">
                <GlobalStatusBadge isCompliant={driver.isCompliant ?? driver.score === 100} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Cartes conducteurs (mobile)
 */
function DriversMobileCards({
  drivers,
  onCardClick,
}: {
  drivers: DriverWithScore[];
  onCardClick?: (driver: DriverWithScore) => void;
}) {
  return (
    <div className="space-y-3">
      {drivers.map((driver) => (
        <GlassCard
          key={driver.id}
          onClick={() => onCardClick?.(driver)}
          className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {driver.first_name?.[0]}
                {driver.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-white">
                  {driver.first_name} {driver.last_name}
                </p>
                <p className="text-xs text-slate-500">Conducteur</p>
              </div>
            </div>
            <div className="text-right">
              <GlobalStatusBadge isCompliant={driver.isCompliant ?? driver.score === 100} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {driver.documents.map((doc, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">{doc.name}</span>
                <DocumentStatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function CompliancePage() {
  const router = useRouter();
  const { user } = useUserContext();
  const { data, isLoading, error } = useCompliance();
  const { data: companyActivities, isLoading: companyActivitiesLoading } = useCompanyActivities();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Déterminer les documents à afficher selon l'activité de l'entreprise
  const activeDocuments = useMemo(() => {
    if (!companyActivities || companyActivities.length === 0) {
      // Par défaut: marchandises générales
      return ACTIVITY_DOCUMENTS.MARCHANDISES_GENERALES;
    }

    // Si l'entreprise a une activité principale, on l'utilise
    const primaryActivity = companyActivities.find(a => a.is_primary)?.activity;
    
    // Si plusieurs activités, on merge les documents (sans doublons)
    const allDocs: DocumentConfig[] = [];
    const addedCodes = new Set<string>();

    // Priorité à l'activité principale
    const activitiesToShow = primaryActivity 
      ? [primaryActivity, ...companyActivities.filter(a => a.activity !== primaryActivity).map(a => a.activity)]
      : companyActivities.map(a => a.activity);

    for (const activity of activitiesToShow as TransportActivity[]) {
      const docs = ACTIVITY_DOCUMENTS[activity] || ACTIVITY_DOCUMENTS.MARCHANDISES_GENERALES;
      for (const doc of docs) {
        if (!addedCodes.has(doc.code)) {
          allDocs.push(doc);
          addedCodes.add(doc.code);
        }
      }
    }

    return allDocs;
  }, [companyActivities]);

  // ─── Export PDF handler ───────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/reports/compliance?type=full&period=current');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conformite-flotte-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[Compliance] Erreur export PDF:', err);
      alert(`Erreur lors de l'export PDF: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Vérifier l'accès (Admin, Directeur, Agent de parc uniquement)
  useEffect(() => {
    const allowedRoles: string[] = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
    if (user?.role && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [user, router]);

  // Date du rapport
  const reportDate = useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Déterminer les colonnes à afficher (basées sur l'activité de l'entreprise)
  // Note: On garde les mêmes colonnes pour tous les véhicules pour éviter les décalages
  const tableColumns = useMemo(() => {
    // Vérifier si au moins un véhicule a besoin du tachygraphe
    const hasPL = data?.vehicles.some(v => 
      ['POIDS_LOURD', 'POIDS_LOURD_FRIGO', 'TRACTEUR_ROUTIER'].includes(v.type || '')
    );
    
    // Si pas de PL, on filtre le tachygraphe pour tout le tableau
    if (!hasPL) {
      return activeDocuments.filter(doc => doc.code !== 'TACHY');
    }
    
    return activeDocuments;
  }, [activeDocuments, data?.vehicles]);

  // Préparer les données des véhicules avec scores
  const vehiclesWithScores: VehicleWithScore[] = useMemo(() => {
    if (!data?.vehicles) return [];

    return data.vehicles.map((vehicle) => {
      // Pour chaque colonne du tableau, récupérer la valeur du véhicule
      const documents = tableColumns.map((doc) => {
        const date = (vehicle[doc.key] as string | null) || (doc.fallback ? (vehicle[doc.fallback] as string | null) : null);
        return {
          name: doc.label,
          code: doc.code,
          status: getDocumentStatus(date),
        };
      });

      const scoreData = calculateComplianceScore(
        documents.map((d) => ({ name: d.name, expiryDate: d.status.daysRemaining !== null ? new Date(Date.now() + d.status.daysRemaining * 24 * 60 * 60 * 1000).toISOString() : null }))
      );

      return {
        ...vehicle,
        documents,
        score: scoreData.score,
      };
    });
  }, [data?.vehicles, tableColumns]);

  // Préparer les données des conducteurs avec statut DREAL
  const driversWithScores: DriverWithScore[] = useMemo(() => {
    if (!data?.drivers) return [];

    return data.drivers.map((driver) => {
      // Calculer la date CQC/FCO fusionnée (la plus restrictive = la plus proche)
      const fcosDate = driver.fcos_expiry;
      const cqcDate = driver.cqc_expiry || driver.cqc_expiry_date;
      
      let cqcFcoDate: string | null = null;
      if (fcosDate && cqcDate) {
        // Prendre la date la plus proche (la plus restrictive)
        cqcFcoDate = new Date(fcosDate) < new Date(cqcDate) ? fcosDate : cqcDate;
      } else {
        cqcFcoDate = fcosDate || cqcDate || null;
      }

      const documents = driverDocuments.map((doc) => {
        let date: string | null = null;
        
        if (doc.key === 'cqc_fco') {
          date = cqcFcoDate;
        } else {
          date = (driver[doc.key as keyof DriverComplianceData] as string | null) || null;
        }
        
        return {
          name: doc.label,
          status: getDocumentStatus(date),
        };
      });

      // Statut Global DREAL : Non-conforme si au moins un document OBLIGATOIRE expiré ou manquant
      // L'ADR est exclu du calcul car non obligatoire pour tous (ex: transport frigo)
      const obligatoryDocs = documents.filter(d => d.name !== 'ADR');
      const hasExpired = obligatoryDocs.some(d => d.status.status === 'expired');
      const hasMissing = obligatoryDocs.some(d => d.status.status === 'missing');
      const isCompliant = !hasExpired && !hasMissing;

      return {
        ...driver,
        documents,
        score: isCompliant ? 100 : 0, // 100 = Conforme, 0 = Non-conforme
        isCompliant,
      };
    });
  }, [data?.drivers]);

  // ─── Export CSV handler (DREAL format) ──────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (!driversWithScores.length) return;

    // Headers DREAL simplifiés
    const headers = [
      'CONDUCTEUR',
      'PERMIS_EXPIRATION',
      'PERMIS_JOURS_RESTANTS',
      'VISITE_MEDICALE_EXPIRATION',
      'VISITE_MEDICALE_JOURS_RESTANTS',
      'CQC_FCO_EXPIRATION',
      'CQC_FCO_JOURS_RESTANTS',
      'ADR_EXPIRATION',
      'ADR_JOURS_RESTANTS',
      'STATUT_GLOBAL',
    ];

    const rows = driversWithScores.map((driver) => {
      const permis = driver.documents.find(d => d.name === 'Permis de conduire')?.status;
      const visite = driver.documents.find(d => d.name === 'Visite médicale')?.status;
      const cqcFco = driver.documents.find(d => d.name === 'CQC (FCO)')?.status;
      const adr = driver.documents.find(d => d.name === 'ADR')?.status;

      const formatDate = (status: DocumentStatusResult | undefined) => {
        if (!status || status.daysRemaining === null) return 'NON_RENSEIGNE';
        const date = new Date();
        date.setDate(date.getDate() + status.daysRemaining);
        return date.toISOString().split('T')[0];
      };

      return [
        `${driver.first_name} ${driver.last_name}`,
        formatDate(permis),
        permis?.daysRemaining?.toString() ?? 'N/A',
        formatDate(visite),
        visite?.daysRemaining?.toString() ?? 'N/A',
        formatDate(cqcFco),
        cqcFco?.daysRemaining?.toString() ?? 'N/A',
        formatDate(adr),
        adr?.daysRemaining?.toString() ?? 'N/A',
        driver.isCompliant ? 'CONFORME' : 'NON_CONFORME',
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conformite-DREAL-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [driversWithScores]);

  // Filtrer les véhicules
  const filteredVehicles = useMemo(() => {
    let filtered = [...vehiclesWithScores];

    if (filter === 'critical') {
      filtered = filtered.filter((v) => v.documents.some((d) => d.status.status === 'expired'));
    } else if (filter === 'expired') {
      filtered = filtered.filter((v) => v.documents.some((d) => d.status.status === 'expired' && d.status.daysRemaining !== null && d.status.daysRemaining <= 0));
    } else if (filter === 'valid') {
      filtered = filtered.filter((v) => v.documents.every((d) => d.status.status === 'valid'));
    }

    // Trier par score (les plus critiques en premier)
    return filtered.sort((a, b) => a.score - b.score);
  }, [vehiclesWithScores, filter]);

  // Filtrer les conducteurs
  const filteredDrivers = useMemo(() => {
    let filtered = [...driversWithScores];

    if (filter === 'critical') {
      filtered = filtered.filter((d) => d.documents.some((doc) => doc.status.status === 'expired'));
    } else if (filter === 'expired') {
      filtered = filtered.filter((d) => d.documents.some((doc) => doc.status.status === 'expired' && doc.status.daysRemaining !== null && doc.status.daysRemaining <= 0));
    } else if (filter === 'valid') {
      filtered = filtered.filter((d) => d.documents.every((doc) => doc.status.status === 'valid'));
    }

    // Trier par score (les plus critiques en premier)
    return filtered.sort((a, b) => a.score - b.score);
  }, [driversWithScores, filter]);

  // Calculer les statistiques KPI
  const stats = useMemo(() => {
    let critical30Days = 0;
    let warning60Days = 0;
    let missing = 0;

    // Véhicules
    vehiclesWithScores.forEach((v) => {
      v.documents.forEach((d) => {
        if (d.status.status === 'expired') critical30Days++;
        else if (d.status.status === 'warning') warning60Days++;
        else if (d.status.status === 'missing') missing++;
      });
    });

    // Conducteurs
    driversWithScores.forEach((d) => {
      d.documents.forEach((doc) => {
        if (doc.status.status === 'expired') critical30Days++;
        else if (doc.status.status === 'warning') warning60Days++;
        else if (doc.status.status === 'missing') missing++;
      });
    });

    return { critical30Days, warning60Days, missing };
  }, [vehiclesWithScores, driversWithScores]);

  // Redirection vers la page de détail
  const handleVehicleClick = (vehicle: VehicleWithScore) => {
    window.location.href = `/vehicles/${vehicle.id}`;
  };

  const handleDriverClick = (driver: DriverWithScore) => {
    window.location.href = `/drivers/${driver.id}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Conformité Réglementaire</h1>
            <p className="text-slate-400 mt-1">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Conformité Réglementaire</h1>
          </div>
        </div>
        <GlassCard className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-medium">Erreur lors du chargement des données</p>
            <p className="text-slate-400 text-sm mt-1">{error.message}</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Conformité Réglementaire</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Rapport du {reportDate}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleExportCSV}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleExportPDF}
              disabled={isExporting || isLoading}
            >
              {isExporting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Exporter PDF
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Bannière si aucune activité configurée */}
        {!companyActivitiesLoading && companyActivities?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertTitle className="text-amber-400">Configuration incomplète</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 mt-1">
                <p>Votre entreprise n&apos;a pas encore défini ses activités de transport.</p>
                <p className="text-sm text-amber-300/70">
                  Configurez vos activités pour obtenir un suivi des échéances réglementaires précis (ADR, Frigo, etc.).
                </p>
                <Button asChild variant="outline" size="sm" className="w-fit mt-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200">
                  <Link href="/settings/company">Configurer mes activités</Link>
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <KPICard
            title="À renouveler dans 30 jours"
            count={stats.critical30Days}
            icon={AlertCircle}
            color="text-red-400"
            bgColor="bg-red-500/15"
          />
          <KPICard
            title="À renouveler dans 60 jours"
            count={stats.warning60Days}
            icon={AlertTriangle}
            color="text-amber-400"
            bgColor="bg-amber-500/15"
          />
          <KPICard
            title="Documents manquants"
            count={stats.missing}
            icon={FileText}
            color="text-slate-400"
            bgColor="bg-slate-500/15"
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="bg-slate-800/50 border border-slate-700/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">
                Tous
              </TabsTrigger>
              <TabsTrigger value="critical" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                ⚠️ À renouveler
              </TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                🔴 Expirés
              </TabsTrigger>
              <TabsTrigger value="valid" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                ✅ Conformes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Vehicles Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/15">
                  <Car className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Véhicules</h2>
                  <p className="text-sm text-slate-400">
                    {filteredVehicles.length} véhicule{filteredVehicles.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Link
                href="/vehicles"
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                Voir tous
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              {filteredVehicles.length > 0 ? (
                <VehiclesTable vehicles={filteredVehicles} onRowClick={handleVehicleClick} />
              ) : (
                <div className="p-8 text-center">
                  <Car className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Aucun véhicule ne correspond aux critères</p>
                </div>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4">
              {filteredVehicles.length > 0 ? (
                <VehiclesMobileCards vehicles={filteredVehicles} onCardClick={handleVehicleClick} />
              ) : (
                <div className="p-8 text-center">
                  <Car className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Aucun véhicule ne correspond aux critères</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Drivers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/15">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Conducteurs</h2>
                  <p className="text-sm text-slate-400">
                    {filteredDrivers.length} conducteur{filteredDrivers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Link
                href="/drivers"
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                Voir tous
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
              {filteredDrivers.length > 0 ? (
                <DriversTable drivers={filteredDrivers} onRowClick={handleDriverClick} />
              ) : (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Aucun conducteur ne correspond aux critères</p>
                </div>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4">
              {filteredDrivers.length > 0 ? (
                <DriversMobileCards drivers={filteredDrivers} onCardClick={handleDriverClick} />
              ) : (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Aucun conducteur ne correspond aux critères</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
