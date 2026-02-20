/**
 * VehicleSelect - Sélection du véhicule en panne
 * Version V3.2
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
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
        <p className="text-gray-500">Aucun véhicule enregistré</p>
        <p className="text-sm text-gray-400 mt-1">
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
              'cursor-pointer transition-all p-4',
              isSelected 
                ? 'ring-2 ring-red-500 bg-red-50 border-red-200' 
                : 'hover:shadow-md hover:bg-gray-50 border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  category === 'PL' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700',
                  isSelected && 'bg-red-100 text-red-700'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={cn(
                    'font-semibold',
                    isSelected && 'text-red-900'
                  )}>
                    {vehicle.registration_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    {vehicle.brand} {vehicle.model}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={cn(
                  category === 'PL' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700',
                  isSelected && 'bg-red-100 text-red-700'
                )}>
                  {category}
                </Badge>
                {isSelected && (
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
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
