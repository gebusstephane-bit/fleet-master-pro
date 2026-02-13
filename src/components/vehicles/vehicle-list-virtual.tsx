/**
 * Liste de véhicules avec virtualisation pour performance
 * Supporte 1000+ véhicules sans lag
 */

'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import { VehicleWithDriver, useVehiclesInfinite } from '@/hooks/use-vehicles-paginated';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, AlertTriangle } from 'lucide-react';

interface VehicleListVirtualProps {
  statusFilter?: string;
  onVehicleClick?: (vehicle: VehicleWithDriver) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-red-100 text-red-800',
};

export function VehicleListVirtual({ statusFilter, onVehicleClick }: VehicleListVirtualProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useVehiclesInfinite({
    pageSize: 50, // Charger 50 par page
    status: statusFilter,
  });

  // Aplatir les pages en une seule liste
  const allVehicles = data?.pages.flatMap((page) => page.data) || [];

  // Référence au conteneur scrollable
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualiseur
  const virtualizer = useVirtualizer({
    count: allVehicles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Hauteur estimée d'une ligne
    overscan: 5, // Pré-rendre 5 éléments en dehors du viewport
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Callback pour détecter quand on approche de la fin (infinite scroll)
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && hasNextPage && !isFetchingNextPage) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              fetchNextPage();
            }
          },
          { threshold: 0.5 }
        );
        observer.observe(node);
        return () => observer.disconnect();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-2" />
        <p>Erreur: {(error as Error)?.message}</p>
      </div>
    );
  }

  if (allVehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Truck className="h-12 w-12 mb-2" />
        <p>Aucun véhicule trouvé</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border rounded-lg"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const vehicle = allVehicles[virtualItem.index];
          const isLastItem = virtualItem.index === allVehicles.length - 1;

          return (
            <div
              key={vehicle.id}
              ref={isLastItem ? lastItemRef : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="p-2"
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow h-full"
                onClick={() => onVehicleClick?.(vehicle)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {vehicle.registration_number}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      {vehicle.drivers && (
                        <p className="text-xs text-slate-400">
                          Chauffeur: {vehicle.drivers.first_name} {vehicle.drivers.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[vehicle.status] || 'bg-gray-100'}>
                      {vehicle.status}
                    </Badge>
                    <Link href={`/vehicles/${vehicle.id}`}>
                      <Button variant="ghost" size="sm">
                        Voir
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Loading indicator pour infinite scroll */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
