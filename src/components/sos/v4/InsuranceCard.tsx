/**
 * InsuranceCard - Carte Type B: Assurance (Orange)
 * Affiche les informations d'assurance pour remorquage
 */

'use client';

import { Phone, Shield, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InsuranceCardProps {
  data: {
    id: string;
    name: string;
    serviceType: string;
    phone: string;
    contractRef?: string;
    instructions?: string;
  };
  message?: string;
}

export function InsuranceCard({ data, message }: InsuranceCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${data.phone.replace(/\D/g, '')}`;
  };

  return (
    <Card className="border-orange-500 shadow-lg">
      {/* Header orange */}
      <CardHeader className="bg-orange-50 border-b border-orange-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-orange-900">{data.name}</h3>
              <Badge className="bg-orange-100 text-orange-800 border-orange-300 mt-1">
                Assurance sinistres
              </Badge>
            </div>
          </div>
          <AlertTriangle className="w-6 h-6 text-orange-600" />
        </div>
        
        {message && (
          <p className="text-orange-800 text-sm mt-3 bg-orange-100/50 p-2 rounded">
            {message}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Avertissement important */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Remorquage nécessaire</p>
              <p className="mt-1">
                Votre véhicule est immobilisé ou hors périmètre. Contactez votre assurance pour organiser le remorquage.
              </p>
            </div>
          </div>
        </div>

        {/* Numéro principal */}
        <div className="bg-orange-600 rounded-xl p-5 text-white">
          <div className="text-orange-100 text-sm mb-1">Numéro sinistres</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{data.phone}</div>
            <Button 
              onClick={handleCall}
              size="lg"
              className="bg-white text-orange-700 hover:bg-orange-50"
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
              Numéro de contrat à indiquer : <strong>{data.contractRef}</strong>
            </span>
          </div>
        )}

        {/* Instructions */}
        {data.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Conseils</h4>
            <div className="text-sm text-blue-800 whitespace-pre-line">
              {data.instructions}
            </div>
          </div>
        )}

        {/* Info complémentaire */}
        <div className="text-xs text-gray-500">
          <p>💡 Le remorquage peut être pris en charge selon les conditions de votre contrat d'assurance.</p>
        </div>
      </CardContent>
    </Card>
  );
}
