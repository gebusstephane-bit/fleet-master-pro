'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, AlertTriangle, Shield, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface EmergencyProtocol {
  id: string;
  name: string;
  phone_number: string;
  instructions: string;
  action_type: string;
}

interface EmergencyProtocolCardProps {
  protocol: EmergencyProtocol;
  onSearchAnyway: () => void;
  warning?: string;
}

export function EmergencyProtocolCard({ protocol, onSearchAnyway, warning }: EmergencyProtocolCardProps) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [calling, setCalling] = useState(false);

  const handleCall = () => {
    setCalling(true);
    window.location.href = `tel:${protocol.phone_number}`;
    setTimeout(() => setCalling(false), 3000);
  };

  return (
    <Card className="border-red-500 border-2 shadow-lg overflow-hidden">
      {/* Header rouge */}
      <div className="bg-red-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-white" />
          <Badge className="bg-white text-red-600 font-bold">
            🚨 PROTOCOLE D'URGENCE
          </Badge>
        </div>
      </div>

      <CardHeader className="bg-red-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-red-900">{protocol.name}</CardTitle>
            <p className="text-sm text-red-700">
              Procédure prioritaire déclenchée automatiquement
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {/* Warning si présent */}
        {warning && (
          <Alert className="bg-amber-50 border-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              {warning}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Instructions */}
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Instructions
            </h3>
            {showInstructions ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {showInstructions && (
            <div className="mt-3 text-gray-700 whitespace-pre-line text-sm leading-relaxed">
              {protocol.instructions}
            </div>
          )}
        </div>

        {/* Bouton d'appel principal */}
        <Button
          size="lg"
          className="w-full bg-red-600 hover:bg-red-700 text-white h-14 text-lg"
          onClick={handleCall}
          disabled={calling}
        >
          <Phone className="h-5 w-5 mr-2" />
          {calling ? 'Appel en cours...' : `Appeler ${protocol.phone_number}`}
        </Button>

        {/* Info supplémentaire */}
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Ce numéro est prioritaire selon votre configuration. 
            En cas de non-réponse, vous pouvez lancer une recherche de garages classique ci-dessous.
          </AlertDescription>
        </Alert>

        {/* Option recherche standard */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onSearchAnyway}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Search className="h-4 w-4 mr-2" />
            Voir quand même les garages à proximité
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Recherche standard (partenaires + réseau externe)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
