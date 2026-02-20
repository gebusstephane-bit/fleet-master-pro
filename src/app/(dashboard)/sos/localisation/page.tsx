'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { LocationForm, LocationData } from '@/components/sos/LocationForm';
import { NoProviderWarning } from '@/components/sos/NoProviderWarning';
import { Vehicle } from '@/components/sos/VehicleSelector';

export default function SOSLocalisationPage() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProviders, setNoProviders] = useState(false);

  // Récupérer le véhicule du localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sos_vehicle');
    if (stored) {
      setVehicle(JSON.parse(stored));
    } else {
      // Rediriger si pas de véhicule sélectionné
      router.push('/sos/selection');
    }
  }, [router]);

  const handleSubmit = async (locationData: LocationData) => {
    if (!vehicle) return;

    setLoading(true);
    setError(null);
    setNoProviders(false);

    try {
      // Stocker les données de localisation
      localStorage.setItem('sos_location', JSON.stringify(locationData));

      // Appeler la nouvelle API smart-search (V3)
      const response = await fetch('/api/sos/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          breakdownType: locationData.breakdownType,
          coordinates: {
            lat: locationData.lat,
            lng: locationData.lng
          },
          address: locationData.address,
          severity: 'normal'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erreur lors de la recherche');
      }

      // Stocker les résultats et rediriger
      localStorage.setItem('sos_results', JSON.stringify(data));
      router.push('/sos/resultat');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!vehicle) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (noProviders) {
    return (
      <div className="max-w-2xl mx-auto">
        <NoProviderWarning />
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => router.push('/sos/selection')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la sélection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600">Étape 2 sur 3</span>
          <span className="text-sm text-gray-500">Localisation de la panne</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '66%' }}></div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Où êtes-vous exactement ?</CardTitle>
              <p className="text-sm text-gray-500">
                {vehicle.registration_number} - {vehicle.brand} {vehicle.model}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Erreur</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <LocationForm 
            onSubmit={handleSubmit}
            loading={loading}
          />

          <div className="flex justify-start pt-4 border-t">
            <Button 
              variant="outline"
              onClick={() => router.push('/sos/selection')}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
