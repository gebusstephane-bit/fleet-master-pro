'use client';

import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Car,
  Flame,
  Lock,
  ShieldAlert,
  Wrench,
  CircleDot,
  CheckCircle,
  Clock,
  FileWarning,
} from 'lucide-react';

// ============================================================
// STATUT DOSSIER
// ============================================================

const STATUS_CONFIG = {
  ouvert: {
    label: 'Ouvert',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Clock,
  },
  en_cours: {
    label: 'En cours',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: CircleDot,
  },
  clôturé: {
    label: 'Clôturé',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle,
  },
};

export function IncidentStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ouvert;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ============================================================
// GRAVITÉ
// ============================================================

const SEVERITY_CONFIG = {
  mineur: {
    label: 'Mineur',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dot: 'bg-slate-400',
  },
  moyen: {
    label: 'Moyen',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  grave: {
    label: 'Grave',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dot: 'bg-orange-400',
  },
  'très_grave': {
    label: 'Très grave',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-400',
  },
};

export function IncidentSeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG];
  if (!config) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

// ============================================================
// TYPE D'INCIDENT
// ============================================================

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  'accident_matériel': {
    label: 'Accident matériel',
    icon: Car,
    className: 'bg-orange-500/10 text-orange-400',
  },
  'accident_corporel': {
    label: 'Accident corporel',
    icon: ShieldAlert,
    className: 'bg-red-500/10 text-red-400',
  },
  vol: {
    label: 'Vol',
    icon: Lock,
    className: 'bg-purple-500/10 text-purple-400',
  },
  vandalisme: {
    label: 'Vandalisme',
    icon: AlertTriangle,
    className: 'bg-pink-500/10 text-pink-400',
  },
  incendie: {
    label: 'Incendie',
    icon: Flame,
    className: 'bg-red-500/10 text-red-400',
  },
  panne_grave: {
    label: 'Panne grave',
    icon: Wrench,
    className: 'bg-amber-500/10 text-amber-400',
  },
  autre: {
    label: 'Autre',
    icon: FileWarning,
    className: 'bg-slate-500/10 text-slate-400',
  },
};

export function IncidentTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.autre;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ============================================================
// STATUT ASSURANCE
// ============================================================

const CLAIM_CONFIG = {
  'non_declaré': { label: 'Non déclaré', className: 'text-slate-400' },
  'déclaré': { label: 'Déclaré', className: 'text-blue-400' },
  'en_instruction': { label: 'En instruction', className: 'text-amber-400' },
  'accepté': { label: 'Accepté', className: 'text-emerald-400' },
  'refusé': { label: 'Refusé', className: 'text-red-400' },
  'réglé': { label: 'Réglé', className: 'text-cyan-400' },
};

export function ClaimStatusBadge({ status }: { status: string }) {
  const config = CLAIM_CONFIG[status as keyof typeof CLAIM_CONFIG] ?? CLAIM_CONFIG['non_declaré'];
  return (
    <span className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}

// ============================================================
// Labels utilitaires (pour les selects)
// ============================================================

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  'accident_matériel': 'Accident matériel',
  'accident_corporel': 'Accident corporel',
  vol: 'Vol',
  vandalisme: 'Vandalisme',
  incendie: 'Incendie',
  panne_grave: 'Panne grave',
  autre: 'Autre',
};

export const SEVERITY_LABELS: Record<string, string> = {
  mineur: 'Mineur',
  moyen: 'Moyen',
  grave: 'Grave',
  très_grave: 'Très grave',
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  'non_declaré': 'Non déclaré',
  'déclaré': 'Déclaré',
  'en_instruction': 'En instruction',
  'accepté': 'Accepté',
  'refusé': 'Refusé',
  'réglé': 'Réglé',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  constat: 'Constat amiable',
  photo: 'Photo',
  rapport_police: 'Rapport de police',
  devis: 'Devis de réparation',
  facture: 'Facture',
  autre: 'Autre',
};
