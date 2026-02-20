'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Truck, Check } from 'lucide-react';
import { VehicleSelector, Vehicle } from '@/components/sos/VehicleSelector';

export default function SOSSelectionPage() {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const handleContinue = () => {
    if (selectedVehicle) {
      // Stocker dans localStorage pour la suite du workflow
      localStorage.setItem('sos_vehicle', JSON.stringify(selectedVehicle));
      router.push('/sos/localisation');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600">Étape 1 sur 3</span>
          <span className="text-sm text-gray-500">Sélection du véhicule</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '33%' }}></div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Quel véhicule est en panne ?</CardTitle>
              <p className="text-sm text-gray-500">
                Sélectionnez le véhicule concerné dans votre parc
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Résumé du véhicule sélectionné */}
          {selectedVehicle && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Véhicule sélectionné</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  {selectedVehicle.registration_number}
                </Badge>
                <span className="text-gray-500">•</span>
                <span className="text-gray-700">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </span>
                <Badge variant={selectedVehicle.vehicle_category === 'PL' ? 'default' : 'secondary'}>
                  {selectedVehicle.vehicle_category === 'PL' ? 'Poids Lourd' : 'Véhicule Léger'}
                </Badge>
                {(selectedVehicle as any).has_fridge && (
                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                    Groupe frigo
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Sélecteur */}
          <VehicleSelector 
            onSelect={setSelectedVehicle}
            {...{selectedVehicleId: (selectedVehicle as any)?.id} as any}
          />

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline"
              onClick={() => router.push('/sos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            
            <Button
              onClick={handleContinue}
              disabled={!selectedVehicle}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continuer
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
