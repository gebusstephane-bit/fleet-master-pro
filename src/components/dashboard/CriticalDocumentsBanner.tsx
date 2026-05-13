'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCriticalDocumentsCount } from '@/hooks/use-compliance';

/**
 * Bannière sticky affichée en haut du dashboard quand au moins un document
 * réglementaire (véhicule ou conducteur) est expiré. Lien direct vers la liste
 * véhicules filtrée sur les expirés.
 *
 * Lecture pure côté client via useCriticalDocumentsCount — pas de fetch
 * supplémentaire, le hook se branche sur le cache React Query de useCompliance.
 */
export function CriticalDocumentsBanner() {
  const { critical30Days } = useCriticalDocumentsCount();

  if (!critical30Days || critical30Days === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-200 text-sm sm:text-base">
            {critical30Days} document{critical30Days > 1 ? 's' : ''} réglementaire
            {critical30Days > 1 ? 's' : ''} expiré{critical30Days > 1 ? 's' : ''}
          </h3>
          <p className="text-xs sm:text-sm text-red-200/80 mt-1">
            Risque d&apos;immobilisation en cas de contrôle routier. Renouvelez
            les documents pour éviter les sanctions.
          </p>
          <Link
            href="/vehicles?filter=expired"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-red-300 hover:text-red-200 mt-2 underline-offset-2 hover:underline"
          >
            Voir les véhicules concernés
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
