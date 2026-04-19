'use client';

/**
 * Modal de détail d'un plein de carburant
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FuelRecord, FUEL_TYPE_CONFIG } from '@/types/fuel';
import { 
  Fuel, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Gauge, 
  DollarSign, 
  Droplets,
  Car,
  Ticket,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FuelRecordDetailProps {
  record: FuelRecord | null;
  open: boolean;
  onClose: () => void;
}

export function FuelRecordDetail({ record, open, onClose }: FuelRecordDetailProps) {
  if (!record) return null;

  const fuelConfig = FUEL_TYPE_CONFIG[record.fuel_type];
  const date = new Date(record.created_at);
  
  // Calculer le prix au litre
  const pricePerLiter = record.price_total && record.quantity_liters 
    ? (record.price_total / record.quantity_liters).toFixed(3)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0f1117] border-white/[0.06] text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', fuelConfig.bgColor)}>
                <Fuel className={cn('h-4 w-4', fuelConfig.color)} />
              </div>
              Détail du plein
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Ticket et Date */}
          <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-lg">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-[#71717a]">Ticket</span>
            </div>
            <span className="font-mono font-bold text-cyan-400">
              #{record.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Date et Heure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#18181b] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-[#71717a]" />
                <span className="text-xs text-[#71717a]">Date</span>
              </div>
              <p className="font-medium">
                {date.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
            <div className="p-3 bg-[#18181b] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-[#71717a]" />
                <span className="text-xs text-[#71717a]">Heure</span>
              </div>
              <p className="font-medium">
                {date.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>

          {/* Véhicule */}
          <div className="p-3 bg-[#18181b] rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4 text-[#71717a]" />
              <span className="text-xs text-[#71717a]">Véhicule</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="font-bold text-lg">
                  {record.vehicles?.registration_number || 'N/A'}
                </p>
                <p className="text-sm text-[#71717a]">
                  {record.vehicles?.brand} {record.vehicles?.model}
                </p>
              </div>
            </div>
          </div>

          {/* Conducteur */}
          <div className="p-3 bg-[#18181b] rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-[#71717a]" />
              <span className="text-xs text-[#71717a]">Conducteur</span>
            </div>
            <p className="font-medium">
              {record.driver_name || (record.drivers 
                ? `${record.drivers.first_name} ${record.drivers.last_name}` 
                : 'Anonyme')}
            </p>
          </div>

          {/* Station */}
          {record.station_name && (
            <div className="p-3 bg-[#18181b] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-[#71717a]" />
                <span className="text-xs text-[#71717a]">Station</span>
              </div>
              <p className="font-medium">{record.station_name}</p>
            </div>
          )}

          {/* Détails du plein */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#18181b] rounded-lg text-center">
              <Droplets className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {record.quantity_liters?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-[#71717a]">Litres</p>
            </div>
            
            <div className="p-4 bg-[#18181b] rounded-lg text-center">
              <DollarSign className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              {record.price_total ? (
                <>
                  <p className="text-2xl font-bold text-white">
                    {record.price_total.toFixed(2)} €
                  </p>
                  {pricePerLiter && (
                    <p className="text-xs text-emerald-400">
                      ≈ {pricePerLiter} €/L
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-[#52525b]">-</p>
                  <p className="text-xs text-[#71717a]">Non renseigné</p>
                </>
              )}
            </div>
          </div>

          {/* Kilométrage et Conso */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#18181b] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-[#71717a]">Kilométrage</span>
              </div>
              <p className="font-bold">
                {record.mileage_at_fill 
                  ? record.mileage_at_fill.toLocaleString('fr-FR') + ' km'
                  : <span className="text-[#52525b]">N/A (GNR)</span>
                }
              </p>
            </div>
            
            <div className="p-3 bg-[#18181b] rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-[#71717a]">Consommation</span>
              </div>
              <p className="font-bold">
                {record.consumption_l_per_100km ? (
                  <span className={cn(
                    record.consumption_l_per_100km < 25 ? 'text-green-400' :
                    record.consumption_l_per_100km <= 30 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {record.consumption_l_per_100km.toFixed(1)} L/100km
                  </span>
                ) : (
                  <span className="text-[#52525b]">-</span>
                )}
              </p>
            </div>
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="p-3 bg-[#18181b] rounded-lg">
              <p className="text-xs text-[#71717a] mb-1">Notes</p>
              <p className="text-sm italic">{record.notes}</p>
            </div>
          )}

          {/* Type de carburant */}
          <div className="flex justify-center">
            <Badge className={cn(fuelConfig.bgColor, fuelConfig.color, 'border-0 px-4 py-2')}>
              <Fuel className="mr-2 h-4 w-4" />
              {fuelConfig.label}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
