'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Search, Car, AlertTriangle } from 'lucide-react';
import { useVehicles } from '@/hooks/use-vehicles';

// Composant qui utilise useSearchParams
function InspectionManualContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVehicle = searchParams.get('vehicle');
  
  const { data: vehicles, isLoading } = useVehicles();
  const [searchTerm, setSearchTerm] = useState(initialVehicle || '');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [error, setError] = useState('');

  // Filtrer les véhicules
  const filteredVehicles = vehicles?.filter((v: any) => 
    v.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pré-sélection si un véhicule est passé en URL
  useEffect(() => {
    if (initialVehicle && vehicles) {
      const vehicle = vehicles.find((v: any) => 
        v.registration_number === initialVehicle
      );
      if (vehicle) {
        setSelectedVehicle(vehicle);
      }
    }
  }, [initialVehicle, vehicles]);

  const handleVehicleSelect = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setError('');
  };

  const handleStartInspection = () => {
    if (!selectedVehicle) {
      setError('Veuillez sélectionner un véhicule');
      return;
    }
    router.push(`/inspection/${selectedVehicle.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vehicles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Contrôle d&apos;état - Accès manuel</h1>
            <p className="text-slate-500">Recherchez le véhicule par immatriculation</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Rechercher un véhicule
            </CardTitle>
            <CardDescription>
              Saisissez la plaque d&apos;immatriculation ou le nom du véhicule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Champ de recherche */}
            <div className="space-y-2">
              <Label htmlFor="search">Immatriculation ou nom du véhicule</Label>
              <Input
                id="search"
                placeholder="Ex: AB-123-CD ou Renault Master"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedVehicle(null);
                }}
                className="text-lg"
              />
            </div>

            {/* Résultats de recherche */}
            {searchTerm && !selectedVehicle && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-slate-500">Chargement...</div>
                ) : filteredVehicles?.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    Aucun véhicule trouvé
                  </div>
                ) : (
                  filteredVehicles?.map((vehicle: any) => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleVehicleSelect(vehicle)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{vehicle.registration_number}</p>
                        <p className="text-sm text-slate-500">
                          {vehicle.brand} {vehicle.model} • {vehicle.year}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Véhicule sélectionné */}
            {selectedVehicle && (
              <Alert className="bg-blue-50 border-blue-200">
                <Car className="h-4 w-4 text-blue-600" />
                <AlertDescription className="ml-2">
                  <span className="font-medium">{selectedVehicle.registration_number}</span>
                  <span className="text-slate-600 ml-2">
                    - {selectedVehicle.brand} {selectedVehicle.model}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleStartInspection}
              disabled={!selectedVehicle}
              className="w-full"
              size="lg"
            >
              Démarrer le contrôle
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading fallback
function InspectionManualSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-96 bg-white rounded-lg shadow animate-pulse" />
      </div>
    </div>
  );
}

// Export avec Suspense
export default function InspectionManualPage() {
  return (
    <Suspense fallback={<InspectionManualSkeleton />}>
      <InspectionManualContent />
    </Suspense>
  );
}
