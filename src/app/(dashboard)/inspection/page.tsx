'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { QRCodeScanner } from '@/components/qr-code-scanner';
import { findVehicleByPlate } from '@/actions/inspections';
import { 
  QrCode, Keyboard, History, ArrowRight, Search, AlertTriangle,
  Car, Truck, AlertCircle
} from 'lucide-react';

interface VehicleResult {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
}

// Simulation de données pour les inspections récentes
const mockRecentInspections = [
  { id: '1', vehicle: 'AB-123-CD', type: 'VOITURE', date: '2024-02-07 14:30', status: 'COMPLETED' },
  { id: '2', vehicle: 'EF-456-GH', type: 'POIDS_LOURD', date: '2024-02-07 11:15', status: 'PENDING_DEFECTS' },
];

export default function InspectionEntryPage() {
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [searchResults, setSearchResults] = useState<VehicleResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleQRScan = async (decodedText: string) => {
    setScanSuccess('QR Code détecté ! Redirection...');
    
    let vehicleId = decodedText;
    
    if (decodedText.includes('fleetmaster://vehicle/')) {
      vehicleId = decodedText.replace('fleetmaster://vehicle/', '');
    } else if (decodedText.includes('/')) {
      const parts = decodedText.split('/');
      vehicleId = parts[parts.length - 1];
    }
    
    setTimeout(() => {
      router.push(`/inspection/${vehicleId}`);
    }, 500);
  };

  const handleQRScanError = (errorMessage: string) => {
    setError(`Erreur de scan: ${errorMessage}`);
  };

  const handleManualSearch = async () => {
    if (!plateNumber.trim()) return;
    
    setLoading(true);
    setError('');
    setSearchResults([]);
    setShowResults(false);
    
    try {
      const result = await findVehicleByPlate(plateNumber);
      
      if (result.error) {
        setError(result.error);
      } else if (result.data && result.data.length > 0) {
        if (result.data.length === 1) {
          // Un seul résultat, rediriger directement
          const vehicle = result.data[0];
          router.push(`/inspection/${vehicle.id}`);
        } else {
          // Plusieurs résultats, afficher la liste
          setSearchResults(result.data);
          setShowResults(true);
        }
      } else {
        setError('Aucun véhicule trouvé avec cette immatriculation.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const selectVehicle = (vehicleId: string) => {
    router.push(`/inspection/${vehicleId}`);
  };

  const getVehicleIcon = (type: string) => {
    if (type === 'VOITURE' || type === 'car') return <Car className="h-5 w-5" />;
    return <Truck className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Contrôle d&apos;état véhicule</h1>
          <p className="text-slate-400 mt-2">
            Scanner le QR code du véhicule ou saisissez l&apos;immatriculation manuellement
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-950/40 border-red-700/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {scanSuccess && (
          <Alert className="mb-6 bg-emerald-950/40 border-emerald-700/50">
            <AlertDescription className="text-emerald-400">{scanSuccess}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Scanner QR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scanner QR Code
              </CardTitle>
              <CardDescription>
                Scannez le QR code apposé sur le pare-brise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QRCodeScanner 
                onScan={handleQRScan}
                onError={handleQRScanError}
              />
            </CardContent>
          </Card>

          {/* Saisie manuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Saisie manuelle
              </CardTitle>
              <CardDescription>
                Entrez l&apos;immatriculation du véhicule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plate">Numéro d&apos;immatriculation</Label>
                <div className="flex gap-2">
                  <Input
                    id="plate"
                    placeholder="AB-123-CD ou AB123CD"
                    value={plateNumber}
                    onChange={(e) => {
                      setPlateNumber(e.target.value.toUpperCase());
                      setShowResults(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleManualSearch}
                    disabled={loading || !plateNumber.trim()}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Format: AB-123-CD, AB 123 CD ou AB123CD
                </p>
              </div>

              {/* Résultats de recherche */}
              {showResults && searchResults.length > 0 && (
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                    <p className="text-sm font-medium text-slate-300">
                      {searchResults.length} véhicule(s) trouvé(s)
                    </p>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {searchResults.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => selectVehicle(vehicle.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/80 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          {getVehicleIcon(vehicle.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-200">{vehicle.registration_number}</p>
                          <p className="text-sm text-slate-400">
                            {vehicle.brand} {vehicle.model} • {vehicle.mileage?.toLocaleString('fr-FR')} km
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl p-3 bg-amber-950/40 border border-amber-700/50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-300">Véhicule non trouvé ?</p>
                    <p className="text-amber-400/70">
                      Contactez votre responsable flotte ou vérifiez la plaque d&apos;immatriculation.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inspections récentes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Contrôles récents
            </CardTitle>
            <CardDescription>
              Les 5 derniers contrôles effectués
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mockRecentInspections.length > 0 ? (
              <div className="space-y-2">
                {mockRecentInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {inspection.type === 'VOITURE' ? (
                        <Car className="h-5 w-5 text-slate-400" />
                      ) : (
                        <Truck className="h-5 w-5 text-slate-400" />
                      )}
                      <div>
                        <p className="font-medium text-slate-200">{inspection.vehicle}</p>
                        <p className="text-sm text-slate-400">{inspection.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inspection.status === 'COMPLETED' ? 'default' : 'destructive'}>
                        {inspection.status === 'COMPLETED' ? 'Terminé' : 'Anomalies'}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/inspections/${inspection.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <History className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                <p>Aucun contrôle récent</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guide rapide */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center mb-3">
              <span className="text-cyan-400 font-bold">1</span>
            </div>
            <h3 className="font-medium text-slate-200 mb-1">Scannez ou saisissez</h3>
            <p className="text-sm text-slate-400">
              Utilisez le QR code sur le pare-brise ou entrez la plaque manuellement.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center mb-3">
              <span className="text-cyan-400 font-bold">2</span>
            </div>
            <h3 className="font-medium text-slate-200 mb-1">Contrôlez le véhicule</h3>
            <p className="text-sm text-slate-400">
              Remplissez tous les points de contrôle selon le type de véhicule.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-slate-800 border border-slate-700">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center mb-3">
              <span className="text-cyan-400 font-bold">3</span>
            </div>
            <h3 className="font-medium text-slate-200 mb-1">Signez et validez</h3>
            <p className="text-sm text-slate-400">
              Le conducteur signe et le contrôle est enregistré automatiquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
