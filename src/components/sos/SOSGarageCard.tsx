/**
 * SOSGarageCard - Composant principal SOS Garage V3.2
 * Arbre de décision intelligent
 */

'use client';

import { useState } from 'react';
import { Wrench, Loader2, MapPin, Phone, AlertCircle, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { VehicleSelect } from './VehicleSelect';
import { BreakdownTypeSelect, BreakdownType } from './BreakdownTypeSelect';
import { LocationForm } from './LocationForm';
import { ImmobilizationSwitch } from './ImmobilizationSwitch';
import { HighwaySwitch } from './HighwaySwitch';
import { EmergencyRuleCard } from './EmergencyRuleCard';
import { HighwayEmergencyCard } from './HighwayEmergencyCard';
import { ManagementOnlyCard } from './ManagementOnlyCard';
import { InternalPartnerCard } from './InternalPartnerCard';
import { NoPartnerFallback } from './NoPartnerFallback';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type?: string;
  registration_number: string;
}

interface SOSGarageCardProps {
  vehicles: Vehicle[];
}

export function SOSGarageCard({ vehicles }: SOSGarageCardProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [breakdownType, setBreakdownType] = useState<BreakdownType | null>(null);
  const [location, setLocation] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [isImmobilized, setIsImmobilized] = useState(false);
  const [isOnHighway, setIsOnHighway] = useState(false);
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = selectedVehicle && breakdownType && location;

  const handleSearch = async () => {
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/sos/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          breakdownType,
          coordinates: { lat: location.lat, lng: location.lng },
          address: location.address,
          vehicleImmobilized: isImmobilized,
          onHighway: isOnHighway
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recherche');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAnyway = () => {
    // Forcer la recherche standard même si une règle s'applique
    console.log('Recherche forcée ignorée pour l\'instant');
  };

  const renderResult = () => {
    if (!result) return null;

    switch (result.level) {
      // === URGENCE AUTOROUTE (Priorité 1) ===
      case 'highway_emergency':
        return (
          <HighwayEmergencyCard
            message={result.message}
            safetyInstructions={result.safetyInstructions}
            highwayService={result.highwayService}
            warning={result.warning}
            vehicle={result.vehicle}
          />
        );

      // === CONTRAT 24/7 ===
      case 'emergency_contract':
        return (
          <EmergencyRuleCard
            rule={result.rule}
            context={result.context}
            nextSteps={result.nextSteps}
            showBypass={true}
            onBypass={handleSearchAnyway}
          />
        );

      // === ASSURANCE OBLIGATOIRE ===
      case 'insurance_mandatory':
        return (
          <EmergencyRuleCard
            rule={result.rule}
            warning={result.warning}
            context={result.reason}
          />
        );

      // === FALLBACK ASSURANCE ===
      case 'insurance_fallback':
        return (
          <Alert variant="destructive" className="border-orange-400 bg-orange-50">
            <AlertCircle className="w-5 h-5" />
            <AlertDescription className="ml-2">
              <p className="font-semibold">{result.message}</p>
              <p className="text-sm mt-1">{result.warning}</p>
              <p className="text-sm mt-2">
                Contactez votre assurance habituelle pour un remorquage.
              </p>
            </AlertDescription>
          </Alert>
        );

      // === DIRECTION ===
      case 'management_contact':
        return (
          <ManagementOnlyCard
            rule={result.rule}
            warning={result.warning}
          />
        );

      // === FALLBACK DIRECTION ===
      case 'management_fallback':
        return (
          <Alert className="border-blue-400 bg-blue-50">
            <User className="w-5 h-5 text-blue-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold">{result.message}</p>
              <p className="text-sm mt-1 text-red-600">{result.warning}</p>
            </AlertDescription>
          </Alert>
        );

      // === PARTENAIRE INTERNE ===
      case 'internal_partner':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Garages partenaires trouvés
            </h3>
            {result.recommendations.map((partner: any, index: number) => (
              <InternalPartnerCard 
                key={partner.id} 
                partner={partner} 
                rank={index + 1}
                onCall={(phone) => window.location.href = `tel:${phone.replace(/\D/g, '')}`}
              />
            ))}
          </div>
        );

      // === AUCUN PARTENAIRE ===
      case 'no_partner':
        return (
          <NoPartnerFallback
            message={result.message}
            searchSuggestion={result.searchSuggestion}
            googleSearchUrl={result.googleSearchUrl}
            warning={result.warning}
            tips={result.tips}
          />
        );

      default:
        return (
          <Alert>
            <AlertCircle className="w-5 h-5" />
            <AlertDescription>Résultat non reconnu: {result.level}</AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          SOS Garage V3.2 - Urgence
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Étape 1: Véhicule */}
        <div>
          <label className="block text-sm font-medium mb-2">
            1. Sélectionnez le véhicule en panne
          </label>
          <VehicleSelect
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={setSelectedVehicle}
          />
        </div>

        {/* Étape 2: Type de panne */}
        {selectedVehicle && (
          <div>
            <label className="block text-sm font-medium mb-2">
              2. Type de problème
            </label>
            <BreakdownTypeSelect
              value={breakdownType}
              onChange={setBreakdownType}
            />
          </div>
        )}

        {/* Étape 3: Situation */}
        {breakdownType && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImmobilizationSwitch
                value={isImmobilized}
                onChange={setIsImmobilized}
              />
              <HighwaySwitch
                value={isOnHighway}
                onChange={setIsOnHighway}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                4. Localisation
              </label>
              <LocationForm 
                breakdownType={breakdownType}
                onSubmit={setLocation} 
              />
            </div>
          </>
        )}

        {/* Bouton recherche */}
        {canSearch && (
          <Button
            onClick={handleSearch}
            disabled={loading}
            size="lg"
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Trouver une solution d'urgence
              </>
            )}
          </Button>
        )}

        {/* Erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-5 h-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Résultat */}
        {result && (
          <div className="border-t pt-6">
            {renderResult()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

