'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Clock, Shield, Wrench, Award } from 'lucide-react';

export interface InternalPartner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  specialties?: string[];
  vehicle_types_supported?: string[];
  vehicle_brands?: string[];
  intervention_radius_km?: number;
  priority?: number;
  contract_number?: string;
  distance_km?: number | null;
}

interface InternalPartnerCardProps {
  partner: InternalPartner;
  rank: number;
  onCall: (phone: string) => void;
  isCalling?: boolean;
}

const SPECIALTY_LABELS: Record<string, string> = {
  '24_7': '24h/24',
  'frigo': 'Frigo',
  'moteur': 'Moteur',
  'electric': 'Électrique',
  'tire': 'Pneu',
  'bodywork': 'Carrosserie',
  'general': 'Général'
};

export function InternalPartnerCard({ partner, rank, onCall, isCalling }: InternalPartnerCardProps) {
  return (
    <Card className="border-green-500 overflow-hidden">
      {/* Header vert */}
      <div className="bg-green-50 px-4 py-3 border-b border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rank === 1 && <Award className="h-5 w-5 text-green-600" />}
            <Badge className="bg-green-600 text-white">
              #{rank} Recommandation
            </Badge>
            <Badge variant="outline" className="border-green-500 text-green-700">
              <Shield className="h-3 w-3 mr-1" />
              Votre partenaire
            </Badge>
          </div>
          {partner.distance_km !== null && partner.distance_km !== undefined && (
            <span className="text-sm text-green-700 font-medium">
              {partner.distance_km} km
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Nom et contrat */}
        <div>
          <h3 className="font-bold text-lg text-gray-900">{partner.name}</h3>
          {partner.contract_number && (
            <p className="text-sm text-green-700 font-medium">
              Contrat #{partner.contract_number}
            </p>
          )}
        </div>

        {/* Adresse */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{partner.address}, {partner.city}</span>
        </div>

        {/* Spécialités */}
        {partner.specialties && partner.specialties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {partner.specialties.map((specialty) => (
              <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {SPECIALTY_LABELS[specialty] || specialty}
              </Badge>
            ))}
          </div>
        )}

        {/* Marques supportées */}
        {partner.vehicle_brands && partner.vehicle_brands.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Spécialiste:</span>{' '}
            {partner.vehicle_brands.join(', ')}
          </div>
        )}

        {/* Tarif négocié */}
        <div className="bg-green-100 rounded-lg p-3">
          <p className="text-green-800 font-semibold text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Tarif négocié sous contrat
          </p>
          {partner.intervention_radius_km && (
            <p className="text-green-700 text-xs mt-1">
              Rayon d'intervention: {partner.intervention_radius_km} km
            </p>
          )}
        </div>

        {/* Bouton d'appel */}
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
          onClick={() => onCall(partner.phone)}
          disabled={isCalling}
        >
          <Phone className="h-5 w-5 mr-2" />
          {isCalling ? 'Appel en cours...' : `Appeler ${partner.phone}`}
        </Button>
      </CardContent>
    </Card>
  );
}
