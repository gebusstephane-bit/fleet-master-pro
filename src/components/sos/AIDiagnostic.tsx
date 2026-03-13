'use client';

import { Sparkles, X, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface SOSAIDiagnostic {
  diagnostic_probable: string;
  instructions_chauffeur: string[];
  ne_pas_faire: string[];
  severite: 'bloquant' | 'roulable' | 'urgent';
}

interface AIDiagnosticProps {
  diagnostic: SOSAIDiagnostic | null;
}

const SEVERITY_CONFIG = {
  bloquant: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/10',
    badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
    label: 'Bloquant',
    icon: '🔴',
  },
  urgent: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/10',
    badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    label: 'Urgent',
    icon: '🟠',
  },
  roulable: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    label: 'Roulable',
    icon: '🟢',
  },
} as const;

export function AIDiagnostic({ diagnostic }: AIDiagnosticProps) {
  if (!diagnostic) return null;

  const severity = SEVERITY_CONFIG[diagnostic.severite] || SEVERITY_CONFIG.urgent;

  return (
    <Card className={`border-l-4 ${severity.border} ${severity.bg} border-white/10`}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Diagnostic IA</span>
          </div>
          <Badge variant="outline" className={`text-xs ${severity.badgeBg}`}>
            {severity.icon} {severity.label}
          </Badge>
        </div>

        {/* Diagnostic */}
        <p className="text-sm text-slate-200 font-medium">
          {diagnostic.diagnostic_probable}
        </p>

        {/* Instructions */}
        {diagnostic.instructions_chauffeur.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Instructions
            </h4>
            <ol className="space-y-1.5">
              {diagnostic.instructions_chauffeur.map((instruction, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs text-cyan-400 font-medium mt-0.5">
                    {i + 1}
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Ne pas faire */}
        {diagnostic.ne_pas_faire.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-2">
              Ne pas faire
            </h4>
            <ul className="space-y-1.5">
              {diagnostic.ne_pas_faire.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-300/80">
                  <X className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimers */}
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3 text-slate-500" />
            <span className="text-[10px] text-slate-500">
              Diagnostic automatique — confirmer avec un technicien
            </span>
          </div>
          <p className="text-[10px] text-slate-500/70">
            Ce diagnostic est indicatif et ne remplace pas l&apos;avis d&apos;un professionnel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
