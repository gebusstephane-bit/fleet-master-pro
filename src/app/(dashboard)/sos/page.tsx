'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Car, MapPin, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { VehicleSelect } from '@/components/sos/VehicleSelect';
import { EmergencyContractCard } from '@/components/sos/v4/EmergencyContractCard';
import { InsuranceCard } from '@/components/sos/v4/InsuranceCard';
import { GarageCard } from '@/components/sos/v4/GarageCard';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type?: string;
  registration_number: string;
}

type BreakdownType = 'pneu' | 'mecanique' | 'frigo' | 'hayon' | 'accident';
type DistanceCategory = 'close' | 'far';
type VehicleState = 'rolling' | 'immobilized';

const BREAKDOWN_TYPES: { type: BreakdownType; label: string; emoji: string; description: string }[] = [
  { type: 'pneu', label: 'Pneu', emoji: '🛞', description: 'Crevaison, pneu crevé' },
  { type: 'mecanique', label: 'Mécanique', emoji: '🔧', description: 'Moteur, transmission' },
  { type: 'frigo', label: 'Groupe frigo', emoji: '❄️', description: 'Groupe froid en panne' },
  { type: 'hayon', label: 'Hayon', emoji: '📦', description: 'Hayon élévateur' },
  { type: 'accident', label: 'Accident', emoji: '💥', description: 'Choc, carrosserie' },
];

export default function SOSPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // État du formulaire (4 questions)
  const [formData, setFormData] = useState({
    vehicleId: '',
    breakdownType: null as BreakdownType | null,
    distanceCategory: null as DistanceCategory | null,
    vehicleState: null as VehicleState | null,
    location: '', // Optionnel
  });

  // Charger les véhicules
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/sos/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicleId || !formData.breakdownType || !formData.distanceCategory || !formData.vehicleState) {
      toast.error('Veuillez répondre à toutes les questions');
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/sos/analyze-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          breakdownType: formData.breakdownType,
          distanceCategory: formData.distanceCategory,
          vehicleState: formData.vehicleState,
          location: formData.location || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        toast.error(data.error || 'Erreur lors de l\'analyse');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

  const renderResult = () => {
    if (!result) return null;

    switch (result.type) {
      case 'contract':
        return <EmergencyContractCard data={result.data} message={result.message} />;
      case 'insurance':
        return <InsuranceCard data={result.data} message={result.message} />;
      case 'garage_partner':
      case 'garage_external':
        return <GarageCard data={result.data} type={result.type} message={result.message} />;
      case 'none':
        return (
          <Card className="border-amber-400 bg-amber-50">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-amber-900">{result.message}</h3>
              <p className="text-amber-700 mt-2">
                Aucune solution configurée pour cette situation.
              </p>
              <div className="mt-4 p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Conseil :</strong> Contactez votre assurance habituelle ou configurez des contrats d'urgence dans les paramètres.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">🚨 SOS Garage</h1>
        <p className="text-muted-foreground">4 questions pour trouver la bonne solution</p>
      </div>

      {/* Formulaire */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Déclaration de panne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Question 1: Véhicule */}
          <div className="space-y-3">
            <Label required>1. Véhicule en panne</Label>
            <VehicleSelect
              vehicles={vehicles}
              value={selectedVehicle || null}
              onChange={(v) => setFormData({ ...formData, vehicleId: v?.id || '' })}
            />
          </div>

          {/* Question 2: Type de panne */}
          {formData.vehicleId && (
            <div className="space-y-3">
              <Label required>2. Type de problème</Label>
              <div className="grid grid-cols-2 gap-3">
                {BREAKDOWN_TYPES.map(({ type, label, emoji, description }) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, breakdownType: type })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.breakdownType === type
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 3: Distance */}
          {formData.breakdownType && (
            <div className="space-y-3">
              <Label required>3. Distance approximative du dépôt</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, distanceCategory: 'close' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.distanceCategory === 'close'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📍</div>
                  <div className="font-semibold">Moins de 50 km</div>
                  <div className="text-xs text-gray-500">Zone habituelle</div>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, distanceCategory: 'far' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.distanceCategory === 'far'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🛣️</div>
                  <div className="font-semibold">Plus de 50 km</div>
                  <div className="text-xs text-gray-500">Hors périmètre</div>
                </button>
              </div>
            </div>
          )}

          {/* Question 4: État du véhicule */}
          {formData.distanceCategory && (
            <div className="space-y-3">
              <Label required>4. État du véhicule</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, vehicleState: 'rolling' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.vehicleState === 'rolling'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🟢</div>
                  <div className="font-semibold">Roulant</div>
                  <div className="text-xs text-gray-500">Peut rouler lentement</div>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, vehicleState: 'immobilized' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.vehicleState === 'immobilized'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🔴</div>
                  <div className="font-semibold">Immobilisé</div>
                  <div className="text-xs text-gray-500">Ne bouge plus</div>
                </button>
              </div>
            </div>
          )}

          {/* Question 5: Localisation (optionnel) */}
          {formData.vehicleState && (
            <div className="space-y-3">
              <Label>5. Localisation <span className="text-gray-400">(optionnel)</span></Label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Aire d'autoroute A4, sortie 45, ou 'Metz'"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <p className="text-xs text-gray-500">
                Cette information aidera le chauffeur à se situer, mais n'est pas utilisée pour la recherche automatique.
              </p>
            </div>
          )}

          {/* Bouton Analyser */}
          {formData.vehicleState && (
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  Trouver une solution
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Résultat */}
      {result && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Solution recommandée</h2>
          {renderResult()}
        </div>
      )}
    </div>
  );
}

// Composant Label personnalisé
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
