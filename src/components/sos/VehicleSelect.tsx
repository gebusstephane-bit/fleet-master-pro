/**
 * VehicleSelect - Sélection du véhicule en panne
 * Version V3.2 - Aligné Design System Fleet-Master
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Car, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type?: string;
  registration_number: string;
}

interface VehicleSelectProps {
  vehicles: Vehicle[];
  value: Vehicle | null;
  onChange: (vehicle: Vehicle) => void;
}

export function VehicleSelect({ vehicles, value, onChange }: VehicleSelectProps) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-8 bg-[#0f172a]/40 rounded-lg border-2 border-dashed border-cyan-500/20">
        <p className="text-muted-foreground">Aucun véhicule enregistré</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Ajoutez des véhicules dans la section Véhicules
        </p>
      </div>
    );
  }

  const getVehicleCategory = (vehicle: Vehicle) => {
    const typeValue = (vehicle.type || '').toString().toUpperCase();
    const isPL = typeValue.includes('POIDS') || typeValue.includes('LOURD') || typeValue.includes('FRIGO');
    return isPL ? 'PL' : 'VL';
  };

  return (
    <div className="grid gap-3">
      {vehicles.map((vehicle) => {
        const category = getVehicleCategory(vehicle);
        const isSelected = value?.id === vehicle.id;
        const Icon = category === 'PL' ? Truck : Car;

        return (
          <Card
            key={vehicle.id}
            onClick={() => onChange(vehicle)}
            className={cn(
              'cursor-pointer transition-all p-4 border-2',
              isSelected 
                ? 'ring-2 ring-cyan-500 bg-cyan-500/10 border-cyan-500' 
                : 'border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 bg-[#0f172a]/40'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  category === 'PL' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-emerald-500/20 text-emerald-400',
                  isSelected && 'bg-cyan-500/20 text-cyan-400'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={cn(
                    'font-semibold text-foreground',
                    isSelected && 'text-cyan-400'
                  )}>
                    {vehicle.registration_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.brand} {vehicle.model}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={cn(
                  'border',
                  category === 'PL' 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  isSelected && 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                )}>
                  {category}
                </Badge>
                {isSelected && (
                  <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
