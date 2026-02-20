'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Clock, Star, Award, Loader2, Info } from 'lucide-react';

export interface Recommendation {
  provider: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    specialties: string[];
    vehicle_types_supported: string[];
    max_tonnage?: number;
    is_active: boolean;
    priority: number;
  };
  ai_analysis: {
    rank: number;
    confidence: number;
    reasoning: string;
    score_distance: number;
    score_specialty: number;
    score_availability: number;
  };
  distance_km: number;
  estimated_time_min: number;
  outside_radius: boolean;
}

interface AIResultsProps {
  recommendations: Recommendation[];
  vehicle: {
    id: string;
    registration_number: string;
    brand: string;
    model: string;
    category: 'PL' | 'VL';
  };
  breakdownLocation: {
    address: string;
  };
  breakdownType: string;
  onContactProvider: (providerId: string) => void;
  contactingProviderId: string | null;
}

const getBreakdownLabel = (type: string) => {
  const labels: Record<string, string> = {
    'MOTEUR': 'Moteur',
    'FRIGO_CARRIER': 'Frigo/Carrier',
    'PNEU': 'Pneumatique',
    'ELECTRIQUE': 'Électrique',
    'CARROSSERIE': 'Carrosserie',
    'AUTRE': 'Autre'
  };
  return labels[type] || type;
};

const getSpecialtyLabel = (specialty: string) => {
  const labels: Record<string, string> = {
    '24_7': '24h/24',
    'FRIGO_CARRIER': 'Frigo',
    'MOTEUR': 'Moteur',
    'PNEU': 'Pneu',
    'ELECTRIQUE': 'Électrique',
    'CARROSSERIE': 'Carrosserie'
  };
  return labels[specialty] || specialty;
};

const getSpecialtyColor = (specialty: string) => {
  const colors: Record<string, string> = {
    '24_7': 'bg-green-100 text-green-700',
    'FRIGO_CARRIER': 'bg-blue-100 text-blue-700',
    'MOTEUR': 'bg-orange-100 text-orange-700',
    'PNEU': 'bg-yellow-100 text-yellow-700',
    'ELECTRIQUE': 'bg-purple-100 text-purple-700',
    'CARROSSERIE': 'bg-pink-100 text-pink-700'
  };
  return colors[specialty] || 'bg-gray-100 text-gray-700';
};

export function AIResults({
  recommendations,
  vehicle,
  breakdownLocation,
  breakdownType,
  onContactProvider,
  contactingProviderId
}: AIResultsProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Aucune recommandation</h3>
        <p className="text-gray-500 mt-1">
          Aucun garage ne correspond à vos critères dans la zone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Recommandations IA ({recommendations.length})</h3>
        <p className="text-sm text-gray-500">
          {getBreakdownLabel(breakdownType)} • {vehicle.category}
        </p>
      </div>

      {recommendations.map((rec, index) => (
        <Card 
          key={rec.provider.id} 
          className={`overflow-hidden ${
            index === 0 ? 'ring-2 ring-green-500' : ''
          }`}
        >
          {/* Header avec badge de rank */}
          <div className={`px-4 py-2 flex items-center justify-between ${
            index === 0 ? 'bg-green-50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-2">
              {index === 0 && (
                <Award className="h-5 w-5 text-green-600" />
              )}
              <Badge className={index === 0 ? 'bg-green-600' : 'bg-gray-600'}>
                #{index + 1} Recommandé
              </Badge>
              <span className="text-sm text-gray-500">
                Confiance: {Math.round(rec.ai_analysis.confidence * 100)}%
              </span>
            </div>
            {rec.outside_radius && (
              <Badge variant="destructive" className="text-xs">
                Hors zone habituelle
              </Badge>
            )}
          </div>

          <CardContent className="p-4 space-y-4">
            {/* Info garage */}
            <div>
              <h4 className="font-semibold text-lg">{rec.provider.name}</h4>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {rec.provider.address}, {rec.provider.city}
              </p>
            </div>

            {/* Spécialités */}
            <div className="flex flex-wrap gap-2">
              {rec.provider.specialties.map((specialty) => (
                <Badge 
                  key={specialty} 
                  className={getSpecialtyColor(specialty)}
                >
                  {getSpecialtyLabel(specialty)}
                </Badge>
              ))}
              {rec.provider.vehicle_types_supported.includes('PL') && (
                <Badge variant="outline">🚛 PL</Badge>
              )}
              {rec.provider.vehicle_types_supported.includes('VL') && (
                <Badge variant="outline">🚗 VL</Badge>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-700">
                  <MapPin className="h-4 w-4" />
                  {rec.distance_km.toFixed(1)} km
                </div>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-700">
                  <Clock className="h-4 w-4" />
                  ~{rec.estimated_time_min} min
                </div>
                <p className="text-xs text-gray-500">Estimé</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-700">
                  <Star className="h-4 w-4" />
                  {Math.round(rec.ai_analysis.score_specialty * 100)}%
                </div>
                <p className="text-xs text-gray-500">Spécialité</p>
              </div>
            </div>

            {/* Raisonnement IA */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">💡 Analyse IA:</span>{' '}
                {rec.ai_analysis.reasoning}
              </p>
            </div>

            {/* Bouton d'appel */}
            <Button
              className="w-full"
              size="lg"
              onClick={() => onContactProvider(rec.provider.id)}
              disabled={contactingProviderId === rec.provider.id}
            >
              {contactingProviderId === rec.provider.id ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Appel en cours...
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5 mr-2" />
                  Appeler {rec.provider.phone}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
