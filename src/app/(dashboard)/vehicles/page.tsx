'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search, Truck, MoreHorizontal, Edit, Trash2, AlertTriangle, Car, Upload, Snowflake, Construction, AlertOctagon, Container, Heart, Box, Gauge, TrainFront, ArrowUpFromLine } from 'lucide-react';
import { ReliabilityScoreBadge } from '@/components/vehicles/ReliabilityScore';
import { useFleetReliabilityScores } from '@/hooks/use-reliability-score';
import { ImportWizard } from '@/components/import/ImportWizard';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useVehicles, useDeleteVehicle, Vehicle } from '@/hooks/use-vehicles';
import { useSubscriptionLimits } from '@/hooks/use-subscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { PaginatedDataTable, Column } from '@/components/ui/paginated-data-table';
import { EmptyState } from '@/components/ui/data-table';
import { StatsGridSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeletons';
import { ExportButton } from '@/components/export/export-button';
import { useSelection } from '@/hooks/use-selection';
import { DataTableBulkActions } from '@/components/ui/data-table-bulk-actions';
import { VEHICLE_STATUS } from '@/constants/enums';

const typeLabels: Record<string, string> = {
  truck: 'Camion',
  van: 'Fourgon',
  car: 'Voiture',
  motorcycle: 'Moto',
  trailer: 'Remorque',
  VOITURE: 'Voiture',
  FOURGON: 'Fourgon',
  POIDS_LOURD: 'Poids Lourd',
  POIDS_LOURD_FRIGO: 'PL Frigorifique',
};

// Labels pour les types détaillés
const detailedTypeLabels: Record<string, string> = {
  // PL Marchandises générales
  PL_BACHE: 'PL Bâché',
  PL_FOURGON: 'PL Fourgon',
  PL_PLATEAU: 'PL Plateau',
  PL_FRIGO: 'PL Frigorifique',
  // PL ADR
  PL_CITERNE_VRAC: 'PL Citerne vrac',
  PL_CITERNE_CITERNE: 'PL Citerne citerne',
  PL_CITERNE_DISTRIB: 'PL Citerne distribution',
  PL_FOURGON_ADR: 'PL Fourgon ADR',
  // PL Spéciaux
  PL_BENNE_TP: 'PL Benne TP',
  PL_PORTE_ENGINS: 'PL Porte-engins',
  PL_PLATEAU_EXCEPT: 'PL Plateau exceptionnel',
  // Tracteur
  TRACTEUR_ROUTIER: 'Tracteur routier',
  // Remorques
  REMORQUE_FRIGO: 'Remorque frigorifique',
  REMORQUE_PLATEAU: 'Remorque plateau',
  REMORQUE_RIDEAUX: 'Remorque rideaux',
  REMORQUE_CITERNE: 'Remorque citerne',
  REMORQUE_BENNE: 'Remorque benne',
  // VL
  VL_BERLINE: 'Berline',
  VL_BREAK: 'Break',
  VL_FOURGON: 'Fourgon',
  VL_PICKUP: 'Pickup',
  VL_BENNE: 'Benne',
  VL_FRIGO: 'Frigorifique',
  VL_CITERNE: 'Citerne',
};

// Icônes véhicules style 2026 - Minimalistes avec gradient glass
function TracteurIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        {/* Cabine minimaliste */}
        <rect x="3" y="7" width="7" height="9" rx="2" stroke="url(#tracteur-gradient)" />
        <defs>
          <linearGradient id="tracteur-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        {/* Attelage */}
        <path d="M18 14h4" className="text-cyan-500" strokeLinecap="round" />
        {/* Roues stylisées */}
        <circle cx="6.5" cy="18.5" r="2" className="fill-cyan-500/30" />
        <circle cx="17.5" cy="18.5" r="2" className="fill-cyan-500/30" />
      </svg>
    </div>
  );
}

function RemorqueFrigoIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        {/* Caisson avec thermomètre stylisé */}
        <rect x="4" y="6" width="14" height="11" rx="2" stroke="url(#frigo-gradient)" />
        <defs>
          <linearGradient id="frigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {/* Symbole froid */}
        <circle cx="17" cy="9" r="2.5" className="fill-blue-400/40" />
        <path d="M17 6v2M17 10v2M15 8h2M19 8h2" className="text-blue-300" strokeWidth="1" />
        {/* Roues */}
        <circle cx="7" cy="19" r="1.8" className="fill-blue-500/30" />
        <circle cx="15" cy="19" r="1.8" className="fill-blue-500/30" />
      </svg>
    </div>
  );
}

function RemorqueIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/10 flex items-center justify-center border border-slate-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        {/* Caisson simple */}
        <rect x="4" y="7" width="14" height="9" rx="1.5" className="text-slate-400" />
        {/* Portes */}
        <line x1="17" y1="7" x2="17" y2="16" className="text-slate-500" strokeDasharray="2 2" />
        {/* Roues */}
        <circle cx="7" cy="19" r="1.8" className="fill-slate-500/30" />
        <circle cx="15" cy="19" r="1.8" className="fill-slate-500/30" />
      </svg>
    </div>
  );
}

function CamionCiterneIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <defs>
          <linearGradient id="citerne-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" stroke="url(#citerne-gradient)" />
        {/* Citerne arrondie */}
        <rect x="10" y="7" width="11" height="9" rx="4.5" stroke="url(#citerne-gradient)" />
        {/* Bande centrale */}
        <line x1="15.5" y1="7" x2="15.5" y2="16" className="text-emerald-400" strokeWidth="2" />
        {/* Roues */}
        <circle cx="6" cy="19" r="1.8" className="fill-emerald-500/30" />
        <circle cx="15.5" cy="19" r="1.8" className="fill-emerald-500/30" />
      </svg>
    </div>
  );
}

function CamionFrigoIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <defs>
          <linearGradient id="camion-frigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" stroke="url(#camion-frigo-gradient)" />
        {/* Caisson avec vague froid */}
        <path d="M10 8h11v10H10z" rx="1.5" stroke="url(#camion-frigo-gradient)" />
        <path d="M12 12q1.5-1.5 3 0t3 0" className="text-blue-300" fill="none" strokeWidth="1" />
        {/* Roues */}
        <circle cx="6" cy="19" r="1.8" className="fill-blue-500/30" />
        <circle cx="15.5" cy="19" r="1.8" className="fill-blue-500/30" />
      </svg>
    </div>
  );
}

function CamionBenneIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <defs>
          <linearGradient id="benne-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" stroke="url(#benne-gradient)" />
        {/* Benne inclinée stylisée */}
        <path d="M10 17l2-9h10l-2 9z" stroke="url(#benne-gradient)" />
        {/* Roues */}
        <circle cx="6" cy="19" r="1.8" className="fill-amber-500/30" />
        <circle cx="17" cy="19" r="1.8" className="fill-amber-500/30" />
      </svg>
    </div>
  );
}

function CamionPlateauIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/10 flex items-center justify-center border border-slate-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" className="text-slate-400" />
        {/* Plateau plat */}
        <rect x="10" y="14" width="11" height="3" rx="0.5" className="text-slate-400" />
        {/* Roues */}
        <circle cx="6" cy="19" r="1.8" className="fill-slate-500/30" />
        <circle cx="15.5" cy="19" r="1.8" className="fill-slate-500/30" />
      </svg>
    </div>
  );
}

function CamionAdrIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center border border-orange-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <defs>
          <linearGradient id="adr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" stroke="url(#adr-gradient)" />
        {/* Fourgon avec bandes ADR */}
        <rect x="10" y="7" width="11" height="10" rx="1" stroke="url(#adr-gradient)" />
        <line x1="13" y1="7" x2="13" y2="17" className="text-orange-400" strokeWidth="2" />
        <line x1="18" y1="7" x2="18" y2="17" className="text-orange-400" strokeWidth="2" />
        {/* Roues */}
        <circle cx="6" cy="19" r="1.8" className="fill-orange-500/30" />
        <circle cx="15.5" cy="19" r="1.8" className="fill-orange-500/30" />
      </svg>
    </div>
  );
}

function ConvoiExceptionnelIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <defs>
          <linearGradient id="convoi-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" stroke="url(#convoi-gradient)" />
        {/* Charge longue */}
        <rect x="10" y="14" width="11" height="2.5" rx="0.5" stroke="url(#convoi-gradient)" />
        {/* Flèche direction */}
        <path d="M15 9h5M19 7l2 2-2 2" className="text-purple-400" strokeWidth="1.5" strokeLinecap="round" />
        {/* Essieux multiples */}
        <circle cx="6" cy="19" r="1.5" className="fill-purple-500/30" />
        <circle cx="13" cy="19" r="1.5" className="fill-purple-500/30" />
        <circle cx="18" cy="19" r="1.5" className="fill-purple-500/30" />
      </svg>
    </div>
  );
}

function CamionStandardIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/10 flex items-center justify-center border border-slate-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        {/* Cabine */}
        <rect x="3" y="9" width="6" height="7" rx="1.5" className="text-slate-400" />
        {/* Fourgon */}
        <rect x="10" y="7" width="11" height="10" rx="1" className="text-slate-400" />
        {/* Roues */}
        <circle cx="6" cy="19" r="1.8" className="fill-slate-500/30" />
        <circle cx="15.5" cy="19" r="1.8" className="fill-slate-500/30" />
      </svg>
    </div>
  );
}

function VoitureIcon() {
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 flex items-center justify-center border border-slate-500/10">
      <Car className="h-5 w-5 text-slate-400" />
    </div>
  );
}

// Fonction principale pour obtenir l'icône (retourne ReactNode avec son container)
function getVehicleIcon(detailedType?: string | null, type?: string | null): React.ReactNode {
  if (!detailedType && !type) return <VoitureIcon />;
  
  const dt = detailedType || '';
  const t = type || '';
  
  // === TRACTEUR ROUTIER ===
  if (dt === 'TRACTEUR_ROUTIER' || t === 'TRACTEUR_ROUTIER') {
    return <TracteurIcon />;
  }
  
  // === REMORQUES ===
  if (dt.startsWith('REMORQUE')) {
    if (dt.includes('FRIGO')) return <RemorqueFrigoIcon />;
    return <RemorqueIcon />;
  }
  
  // === CITERNE ===
  if (dt.includes('CITERNE')) {
    return <CamionCiterneIcon />;
  }
  
  // === FRIGORIFIQUE ===
  if (dt.includes('FRIGO')) {
    return <CamionFrigoIcon />;
  }
  
  // === BENNE / TP ===
  if (dt.includes('BENNE') || dt.includes('TP')) {
    return <CamionBenneIcon />;
  }
  
  // === PLATEAU ===
  if (dt.includes('PLATEAU') && !dt.includes('EXCEPT')) {
    return <CamionPlateauIcon />;
  }
  
  // === ADR ===
  if (dt.includes('ADR')) {
    return <CamionAdrIcon />;
  }
  
  // === CONVOI EXCEPTIONNEL ===
  if (dt.includes('EXCEPT') || dt.includes('PORTE_ENGINS')) {
    return <ConvoiExceptionnelIcon />;
  }
  
  // === PL standard ===
  if (dt.startsWith('PL_') || t === 'POIDS_LOURD' || t === 'POIDS_LOURD_FRIGO') {
    return <CamionStandardIcon />;
  }
  
  // === VL général ===
  return <VoitureIcon />;
}

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
  ACTIF: { color: 'text-emerald-400', label: 'Actif', bg: 'bg-emerald-500/15' },
  INACTIF: { color: 'text-gray-400', label: 'Inactif', bg: 'bg-slate-500/15' },
  EN_MAINTENANCE: { color: 'text-amber-400', label: 'En maintenance', bg: 'bg-amber-500/15' },
  ARCHIVE: { color: 'text-slate-400', label: 'Archivé', bg: 'bg-slate-700/30' },
};

const statusFilters = [
  { value: VEHICLE_STATUS.ACTIF, label: 'Actif' },
  { value: VEHICLE_STATUS.EN_MAINTENANCE, label: 'En maintenance' },
  { value: VEHICLE_STATUS.INACTIF, label: 'Inactif' },
  { value: VEHICLE_STATUS.ARCHIVE, label: 'Archivé' },
];

const typeFilters = [
  { value: 'VOITURE', label: 'Voiture' },
  { value: 'FOURGON', label: 'Fourgon' },
  { value: 'POIDS_LOURD', label: 'Poids Lourd' },
  { value: 'POIDS_LOURD_FRIGO', label: 'PL Frigorifique' },
];

/**
 * Composant bouton d'ajout de véhicule avec vérification de limite
 */
function AddVehicleButton() {
  const { data: limits, isLoading } = useSubscriptionLimits();
  
  if (isLoading) {
    return (
      <Button disabled className="gap-2 bg-blue-600 opacity-50">
        <Plus className="h-4 w-4" />
        Ajouter un véhicule
      </Button>
    );
  }
  
  const canAdd = limits?.canAddVehicle ?? true;
  const currentCount = limits?.vehicleCount ?? 0;
  const limit = limits?.vehicleLimit ?? 0;
  
  if (!canAdd) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button 
          disabled 
          className="gap-2 bg-blue-600 opacity-50 cursor-not-allowed"
          title="Limite de véhicules atteinte"
        >
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </Button>
        <p className="text-xs text-amber-400">
          Limite atteinte ({currentCount}/{limit}) — 
          <Link href="/settings/billing" className="underline hover:text-amber-300 ml-1">
            Passer au plan supérieur
          </Link>
        </p>
      </div>
    );
  }
  
  return (
    <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-500">
      <Link href="/vehicles/new">
        <Plus className="h-4 w-4" />
        Ajouter un véhicule
      </Link>
    </Button>
  );
}

export default function VehiclesPage() {
  const router = useRouter();
  const { data: vehicles, isLoading, error } = useVehicles();
  const deleteMutation = useDeleteVehicle();
  const selection = useSelection(vehicles ?? [], 'id');
  const { data: reliabilityScores } = useFleetReliabilityScores();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({
    status: null,
    type: null,
  });
  const [importOpen, setImportOpen] = useState(false);

  // Filter vehicles based on search and filters
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((vehicle) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          vehicle.registration_number?.toLowerCase().includes(searchLower) ||
          vehicle.brand?.toLowerCase().includes(searchLower) ||
          vehicle.model?.toLowerCase().includes(searchLower) ||
          vehicle.vin?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (activeFilters.status && vehicle.status !== activeFilters.status) {
        return false;
      }

      // Type filter
      if (activeFilters.type && vehicle.type !== activeFilters.type) {
        return false;
      }

      return true;
    });
  }, [vehicles, searchQuery, activeFilters]);

  // Stats calculation
  const stats = {
    total: vehicles?.length || 0,
    active: vehicles?.filter((v) => v.status === VEHICLE_STATUS.ACTIF).length || 0,
    maintenance: vehicles?.filter((v) => v.status === VEHICLE_STATUS.EN_MAINTENANCE).length || 0,
    inactive: vehicles?.filter((v) => ([VEHICLE_STATUS.INACTIF, VEHICLE_STATUS.ARCHIVE] as string[]).includes(v.status)).length || 0,
  };

  // Bulk delete handler
  const handleBulkDelete = () => {
    selection.selectedIds.forEach((id) => {
      deleteMutation.mutate({ id } as any);
    });
    selection.clear();
  };

  // Table columns
  const columns: Column<Vehicle>[] = [
    {
      key: 'select',
      header: '',
      width: '44px',
      render: (vehicle) => (
        <input
          type="checkbox"
          checked={selection.isSelected(vehicle.id)}
          onChange={() => selection.toggle(vehicle.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-cyan-500 cursor-pointer"
        />
      ),
    },
    {
      key: 'registration_number',
      header: 'Immatriculation',
      width: '200px',
      render: (vehicle) => (
        <div className="flex items-center gap-3">
          {reliabilityScores?.get(vehicle.id) && (
            <ReliabilityScoreBadge score={reliabilityScores.get(vehicle.id)!} />
          )}
          <div>
            <p className="font-medium text-white">{vehicle.registration_number}</p>
            <p className="text-xs text-slate-500">{vehicle.vin || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Véhicule',
      render: (vehicle) => {
        const typeLabel = detailedTypeLabels[vehicle.detailed_type as string] 
          || typeLabels[vehicle.type] 
          || vehicle.type;
        return (
          <div className="flex items-center gap-3">
            {getVehicleIcon(vehicle.detailed_type, vehicle.type)}
            <div>
              <p className="font-medium text-white">{vehicle.brand} {vehicle.model}</p>
              <p className="text-xs text-slate-500">{vehicle.year} • {typeLabel}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'mileage',
      header: 'Kilométrage',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (vehicle) => (
        <span className="font-medium text-white font-mono">
          {vehicle.mileage?.toLocaleString('fr-FR')} km
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      sortable: true,
      render: (vehicle) => (
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            statusConfig[vehicle.status]?.bg,
            statusConfig[vehicle.status]?.color
          )}
        >
          {statusConfig[vehicle.status]?.label || vehicle.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      render: (vehicle) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#18181b] border-slate-700">
            <DropdownMenuItem
              onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)}
              className="text-slate-300 focus:text-white focus:bg-slate-800"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
              onClick={() => deleteMutation.mutate({ id: vehicle.id } as any)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Afficher l'erreur de récursion
  const isRecursionError = error?.message?.includes('RLS_RECURSION') || error?.message?.includes('infinite recursion');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <StatsGridSkeleton count={4} columns={4} />
        <TableSkeleton columns={5} rows={8} showToolbar />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Véhicules</h1>
          <p className="text-slate-400 mt-1">Gérez votre parc automobile</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="vehicles" count={filteredVehicles.length} />
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Importer
          </Button>
          <AddVehicleButton />
        </div>
      </motion.div>

      {/* Erreur de récursion */}
      {isRecursionError && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Problème de sécurité détecté</AlertTitle>
          <AlertDescription className="text-slate-400">
            Les politiques de sécurité (RLS) créent une boucle infinie.
          </AlertDescription>
        </Alert>
      )}

      {/* Erreur générale */}
      {error && !isRecursionError && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Erreur</AlertTitle>
          <AlertDescription className="text-slate-400">{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total véhicules</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.total} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <div className="h-6 w-6 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Actifs</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.active} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <div className="h-6 w-6 rounded-full bg-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">En maintenance</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.maintenance} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-500/20 text-slate-400">
              <div className="h-6 w-6 rounded-full bg-slate-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Inactifs</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.inactive} />
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Toolbar with Search and Filters */}
      <DataTableToolbar
        searchPlaceholder="Rechercher un véhicule..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          { key: 'status', label: 'Statut', options: statusFilters },
          { key: 'type', label: 'Type', options: typeFilters },
        ]}
        activeFilters={activeFilters}
        onFilterChange={(key, value) =>
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }
        onClearFilters={() => setActiveFilters({ status: null, type: null })}
      />

      {/* Bulk Actions */}
      <DataTableBulkActions
        selectedCount={selection.selectedCount}
        onExport={() => {/* handled by ExportButton logic */}}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
        isDeleting={deleteMutation.isPending}
      />

      {/* Import Wizard */}
      <ImportWizard type="vehicles" open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <PaginatedDataTable
          columns={columns}
          data={filteredVehicles as Vehicle[]}
          keyExtractor={(v) => v.id}
          onRowClick={(vehicle) => router.push(`/vehicles/${vehicle.id}`)}
          pageSize={10}
          searchable
          searchKeys={['registration_number', 'brand', 'model', 'vin']}
          searchValue={searchQuery}
          emptyState={
            <EmptyState
              icon={<Truck className="h-8 w-8 text-slate-500" />}
              title={searchQuery || Object.values(activeFilters).some(Boolean) ? 'Aucun résultat' : 'Aucun véhicule'}
              description={
                searchQuery || Object.values(activeFilters).some(Boolean)
                  ? 'Modifiez vos critères de recherche ou filtres.'
                  : 'Commencez par ajouter votre premier véhicule à la flotte.'
              }
              action={
                !searchQuery && !Object.values(activeFilters).some(Boolean) ? (
                  <Button asChild className="bg-blue-600 hover:bg-blue-500">
                    <Link href="/vehicles/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un véhicule
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilters({ status: null, type: null });
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )
              }
            />
          }
        />
      </GlassCard>
    </div>
  );
}
