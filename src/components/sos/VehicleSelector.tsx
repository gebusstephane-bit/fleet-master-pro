'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Car, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface Vehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
  type: string;
  vehicle_category: 'PL' | 'VL';
}

interface VehicleSelectorProps {
  onSelect: (vehicle: Vehicle) => void;
  selectedId?: string;
}

export function VehicleSelector({ onSelect, selectedId }: VehicleSelectorProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/sos/vehicles');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setVehicles(data.vehicles);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (vehicle_category: string) => {
    return vehicle_category === 'PL'
      ? { label: 'PL', icon: Truck, color: 'bg-blue-100 text-blue-700' }
      : { label: 'VL', icon: Car, color: 'bg-green-100 text-green-700' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Aucun véhicule enregistré</p>
        <p className="text-sm text-gray-400 mt-1">
          Ajoutez des véhicules dans la section Véhicules
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {vehicles.map((vehicle) => {
        const category = getCategoryLabel(vehicle.vehicle_category);
        const Icon = category.icon;
        const isSelected = selectedId === vehicle.id;

        return (
          <Card
            key={vehicle.id}
            className={`cursor-pointer transition-all ${
              isSelected 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md hover:bg-gray-50'
            }`}
            onClick={() => onSelect(vehicle)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${category.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {vehicle.registration_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                </div>

                <Badge className={category.color}>
                  {category.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
