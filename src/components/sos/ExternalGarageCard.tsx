'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, MapPin, Clock, Search, Star, Plus, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export interface ExternalGarage {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  location?: {
    lat: number;
    lng: number;
  };
  confidence: number;
  isAuthorizedDealer: boolean;
  specialties: string[];
  reasoning: string;
  warnings?: string[];
}

interface ExternalGarageCardProps {
  garage: ExternalGarage;
  rank: number;
  searchBrand: string;
  onCall: (phone: string) => void;
  onAddToPartners?: (garage: ExternalGarage) => void;
  isCalling?: boolean;
}

export function ExternalGarageCard({ 
  garage, 
  rank, 
  searchBrand, 
  onCall, 
  onAddToPartners,
  isCalling 
}: ExternalGarageCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToPartners = async () => {
    if (!onAddToPartners) return;
    setIsAdding(true);
    try {
      await onAddToPartners(garage);
    } finally {
      setIsAdding(false);
    }
  };

  // Calculer la couleur du score de confiance
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Card className="border-yellow-500 overflow-hidden">
      {/* Header jaune */}
      <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-600 text-white">
              #{rank}
            </Badge>
            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
              <Search className="h-3 w-3 mr-1" />
              Réseau {searchBrand}
            </Badge>
            {garage.isAuthorizedDealer && (
              <Badge className="bg-blue-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                Agréé
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Confiance IA:</span>
            <Badge className={`${getConfidenceColor(garage.confidence)} text-white`}>
              {garage.confidence}%
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Nom */}
        <div>
          <h3 className="font-bold text-lg text-gray-900">{garage.name}</h3>
          <p className="text-sm text-gray-500">{garage.reasoning}</p>
        </div>

        {/* Adresse */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{garage.address}{garage.city ? `, ${garage.city}` : ''}</span>
        </div>

        {/* Spécialités */}
        {garage.specialties && garage.specialties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {garage.specialties.map((specialty, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        )}

        {/* Warning */}
        <Alert className="bg-yellow-100 border-yellow-300">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-800 text-sm">
            Non partenaire direct - Vérifier disponibilité et tarif avant déplacement
          </AlertDescription>
        </Alert>

        {/* Warnings spécifiques */}
        {garage.warnings && garage.warnings.length > 0 && (
          <div className="space-y-1">
            {garage.warnings.map((warning, idx) => (
              <p key={idx} className="text-xs text-orange-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {warning}
              </p>
            ))}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            size="lg"
            onClick={() => garage.phone && onCall(garage.phone)}
            disabled={isCalling || !garage.phone}
          >
            <Phone className="h-5 w-5 mr-2" />
            {isCalling ? 'Appel...' : 'Appeler'}
          </Button>
          
          {onAddToPartners && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddToPartners}
              disabled={isAdding}
              className="border-green-500 text-green-700 hover:bg-green-50"
            >
              <Plus className="h-5 w-5 mr-1" />
              {isAdding ? '...' : 'Ajouter'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
