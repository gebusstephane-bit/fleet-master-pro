/**
 * EmergencyContractCard - Carte Type A: Contrat 24/24 (Vert)
 * Affiche un contrat d'urgence avec numéro prioritaire
 */

'use client';

import { Phone, Clock, FileText, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmergencyContractCardProps {
  data: {
    id: string;
    name: string;
    serviceType: string;
    phone: string;
    contractRef?: string;
    instructions?: string;
    forDistance?: string;
    forImmobilized?: boolean | null;
  };
  message?: string;
}

export function EmergencyContractCard({ data, message }: EmergencyContractCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${data.phone.replace(/\D/g, '')}`;
  };

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      'pneu_24h': 'Dépannage pneu 24/24',
      'frigo_assistance': 'Assistance frigo',
      'mecanique_24h': 'Mécanique 24/24',
      'remorquage': 'Remorquage',
    };
    return labels[type] || 'Service d\'urgence';
  };

  return (
    <Card className="border-green-500 shadow-lg">
      {/* Header vert */}
      <CardHeader className="bg-green-50 border-b border-green-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-green-900">{data.name}</h3>
              <Badge className="bg-green-100 text-green-800 border-green-300 mt-1">
                {getServiceLabel(data.serviceType)}
              </Badge>
            </div>
          </div>
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        
        {message && (
          <p className="text-green-800 text-sm mt-3 bg-green-100/50 p-2 rounded">
            {message}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Numéro principal */}
        <div className="bg-green-600 rounded-xl p-5 text-white">
          <div className="text-green-100 text-sm mb-1">Numéro d'urgence</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{data.phone}</div>
            <Button 
              onClick={handleCall}
              size="lg"
              className="bg-white text-green-700 hover:bg-green-50"
            >
              <Phone className="w-5 h-5 mr-2" />
              Appeler
            </Button>
          </div>
        </div>

        {/* Référence contrat */}
        {data.contractRef && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
            <FileText className="w-5 h-5" />
            <span className="text-sm">
              Référence contrat : <strong>{data.contractRef}</strong>
            </span>
          </div>
        )}

        {/* Instructions */}
        {data.instructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <span>📝</span> Instructions
            </h4>
            <div className="text-sm text-yellow-800 whitespace-pre-line">
              {data.instructions}
            </div>
          </div>
        )}

        {/* Badges conditions */}
        <div className="flex flex-wrap gap-2">
          {data.forDistance && data.forDistance !== 'both' && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {data.forDistance === 'close' ? 'Moins de 50 km' : 'Plus de 50 km'}
            </Badge>
          )}
          {data.forImmobilized !== null && (
            <Badge variant="outline" className="text-xs">
              {data.forImmobilized ? 'Immobilisé uniquement' : 'Roulant uniquement'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
