'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Fuel, Eye, Trash2, Calendar, Fuel as FuelIcon, Gauge, Euro } from 'lucide-react';
import { FuelRecord, FUEL_TYPE_CONFIG, getConsumptionIndicator } from '@/types/fuel';
import { FuelRecordDetail } from './fuel-record-detail';
import { cn } from '@/lib/utils';

interface FuelMobileCardsProps {
  records: FuelRecord[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  userRole?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function FuelMobileCards({
  records,
  isLoading,
  onDelete,
  userRole,
  selectedIds = [],
  onSelectionChange,
}: FuelMobileCardsProps) {
  const canDelete = userRole === 'ADMIN' || userRole === 'AGENT_DE_PARC';
  const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetail = (record: FuelRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return;
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((sid) => sid !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-[#18181b] flex items-center justify-center mb-4">
          <FuelIcon className="h-8 w-8 text-[#52525b]" />
        </div>
        <h3 className="text-base font-medium text-white mb-2">Aucun plein enregistré</h3>
        <p className="text-sm text-[#71717a] px-4">
          Scannez le QR code du véhicule pour ajouter un plein depuis le terrain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const fuelConfig = FUEL_TYPE_CONFIG[record.fuel_type];
        const consumptionIndicator = getConsumptionIndicator(record.consumption_l_per_100km);

        return (
          <Card
            key={record.id}
            className={cn(
              'overflow-hidden transition-colors',
              selectedIds.includes(record.id) && 'border-cyan-500/50 bg-cyan-500/5'
            )}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
              <div className="flex items-start gap-3">
                {onSelectionChange && (
                  <Checkbox
                    checked={selectedIds.includes(record.id)}
                    onCheckedChange={() => toggleSelection(record.id)}
                    className="mt-1"
                  />
                )}
                <div>
                  <div className="font-semibold text-white">
                    {record.vehicles?.registration_number || 'N/A'}
                  </div>
                  <div className="text-xs text-[#71717a]">
                    {record.vehicles?.brand} {record.vehicles?.model}
                  </div>
                </div>
              </div>
              <Badge className={cn(fuelConfig.bgColor, fuelConfig.color, 'border-0')}>
                <Fuel className="mr-1 h-3 w-3" />
                {fuelConfig.label}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-[#52525b]" />
                  <span>{new Date(record.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-[#52525b]" />
                  <span>{record.mileage_at_fill ? `${record.mileage_at_fill.toLocaleString('fr-FR')} km` : '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#18181b]/50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">{record.quantity_liters?.toFixed(1) || '0.0'}</div>
                  <div className="text-xs text-[#52525b]">Litres</div>
                </div>
                <div className="bg-[#18181b]/50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-400">{record.price_total ? `${record.price_total.toFixed(0)}€` : '-'}</div>
                  <div className="text-xs text-[#52525b]">Total</div>
                </div>
                <div className="bg-[#18181b]/50 rounded-lg p-2 text-center">
                  {record.consumption_l_per_100km ? (
                    <>
                      <div className={cn('text-lg font-bold', consumptionIndicator.color)}>
                        {record.consumption_l_per_100km.toFixed(1)}
                      </div>
                      <div className="text-xs text-[#52525b]">L/100</div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-[#52525b]">-</div>
                      <div className="text-xs text-[#52525b]">L/100</div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-[#71717a]">
                  {record.driver_name ? (
                    <span className="font-medium text-white">{record.driver_name}</span>
                  ) : record.drivers ? (
                    `${record.drivers.first_name} ${record.drivers.last_name}`
                  ) : (
                    <span className="italic">Anonyme</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleViewDetail(record)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => onDelete(record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Modal de détail */}
      <FuelRecordDetail
        record={selectedRecord}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
