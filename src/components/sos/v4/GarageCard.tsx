/**
 * GarageCard - Carte Type C: Garage (Bleu)
 * Affiche un garage partenaire ou une recherche externe
 */

'use client';

import { Phone, MapPin, Wrench, ExternalLink, Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GarageCardProps {
  data: {
    id?: string;
    name: string;
    specialty?: string;
    phone?: string;
    city?: string;
    address?: string;
    maxDistance?: number;
    has24h?: boolean;
    searchQuery?: string;
  };
  type: 'garage_partner' | 'garage_external';
  message?: string;
}

export function GarageCard({ data, type, message }: GarageCardProps) {
  const handleCall = () => {
    if (data.phone) {
      window.location.href = `tel:${data.phone.replace(/\D/g, '')}`;
    }
  };

  const handleSearch = () => {
    const query = data.searchQuery || `${data.name}`;
    window.open(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      '_blank'
    );
  };

  const getSpecialtyLabel = (spec?: string) => {
    const labels: Record<string, string> = {
      'pneu': 'Pneumatique',
      'mecanique': 'Mécanique',
      'frigo': 'Frigo',
      'carrosserie': 'Carrosserie',
      'general': 'Généraliste',
    };
    return labels[spec || ''] || 'Garage';
  };

  // Garage partenaire interne
  if (type === 'garage_partner') {
    return (
      <Card className="border-blue-500 shadow-lg">
        <CardHeader className="bg-blue-50 border-b border-blue-200 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-blue-900">{data.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    Votre partenaire
                  </Badge>
                  {data.specialty && (
                    <Badge variant="outline" className="text-xs">
                      {getSpecialtyLabel(data.specialty)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {data.has24h && (
              <div className="p-1 bg-green-100 rounded-full" title="Service 24/24">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            )}
          </div>
          
          {message && (
            <p className="text-blue-800 text-sm mt-3 bg-blue-100/50 p-2 rounded">
              {message}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Coordonnées */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>{data.city}</span>
              {data.maxDistance && (
                <Badge variant="outline" className="text-xs">
                  Rayon: {data.maxDistance} km
                </Badge>
              )}
            </div>
            {data.address && (
              <p className="text-sm text-gray-500 ml-7">{data.address}</p>
            )}
          </div>

          {/* Téléphone */}
          {data.phone && (
            <div className="bg-blue-600 rounded-xl p-5 text-white">
              <div className="text-blue-100 text-sm mb-1">Téléphone</div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{data.phone}</div>
                <Button 
                  onClick={handleCall}
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Appeler
                </Button>
              </div>
            </div>
          )}

          {/* Conseils */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-2">Avant de vous déplacer :</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Appelez pour vérifier la disponibilité</li>
              <li>Demandez un devis estimatif</li>
              <li>Vérifiez que le garage prend votre type de véhicule</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Garage externe (fallback Google Maps)
  return (
    <Card className="border-gray-400 shadow-lg">
      <CardHeader className="bg-gray-50 border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-600 rounded-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{data.name}</h3>
              <Badge variant="secondary">
                Recherche externe
              </Badge>
            </div>
          </div>
        </div>
        
        {message && (
          <p className="text-gray-800 text-sm mt-3 bg-amber-100/50 p-2 rounded border border-amber-200">
            {message}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Aucun garage partenaire trouvé</p>
              <p className="mt-1">
                Nous vous suggérons de rechercher un garage sur Google Maps. 
                Vérifiez bien l'agrément et la disponibilité avant de vous déplacer.
              </p>
            </div>
          </div>
        </div>

        {/* Bouton recherche */}
        <Button 
          onClick={handleSearch}
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Rechercher sur Google Maps
        </Button>

        {/* Conseils de sécurité */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">⚠️ Points de vigilance :</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Vérifiez l'agrément du garage</li>
            <li>Demandez une estimation avant travaux</li>
            <li>Demandez une facture détaillée</li>
            <li>Vérifiez les délais de réparation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
