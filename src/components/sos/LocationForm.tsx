/**
 * LocationForm - Formulaire de localisation V3.2
 * Simplifié : ne gère que l'adresse (le type de panne est géré par BreakdownTypeSelect)
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  breakdownType: string;
  additionalInfo?: string;
}

interface LocationFormProps {
  onSubmit: (data: LocationData) => void;
  loading?: boolean;
  breakdownType?: string;
}

export function LocationForm({ onSubmit, loading, breakdownType }: LocationFormProps) {
  const [address, setAddress] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) {
      setError('Veuillez indiquer votre adresse ou localisation');
      return;
    }

    geocodeAddress(address);
  };

  const geocodeAddress = async (addressStr: string) => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(addressStr)}`);
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        onSubmit({
          address: location.display_name,
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          breakdownType: breakdownType || 'mechanical',
          additionalInfo
        });
      } else {
        setError('Adresse non trouvée. Veuillez être plus précis.');
      }
    } catch (err) {
      // Fallback si geocoding échoue
      onSubmit({
        address: addressStr,
        lat: 0,
        lng: 0,
        breakdownType: breakdownType || 'mechanical',
        additionalInfo
      });
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          });
          
          const data = await response.json();
          setAddress(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch {
          setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError('Impossible d\'obtenir votre position. Veuillez entrer l\'adresse manuellement.');
        setIsLocating(false);
      }
    );
  };

  const isHighway = (addr: string) => {
    const lower = addr.toLowerCase();
    return lower.includes('autoroute') || /\bA\d+\b/.test(lower) || lower.includes('aire');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="address">Votre position actuelle *</Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex: Aire de repos A6, km 245, direction Paris. Ou: 12 rue de Paris, Lyon"
          className="min-h-[80px]"
          required
        />
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeolocation}
            disabled={isLocating}
            className="flex items-center gap-2"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {isLocating ? 'Localisation...' : 'Ma position GPS'}
          </Button>
        </div>

        {isHighway(address) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ Détection autoroute possible
            </p>
            <p className="text-amber-700 text-sm mt-1">
              Cochez "Sur autoroute" si vous êtes sur une voie rapide.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional">Informations complémentaires (optionnel)</Label>
        <Textarea
          id="additional"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Ex: Camion sur la bande d'arrêt d'urgence, trafic dense, accès difficile..."
          className="min-h-[60px]"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={loading}
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Analyse en cours...
          </>
        ) : (
          'Valider la localisation'
        )}
      </Button>
    </form>
  );
}
