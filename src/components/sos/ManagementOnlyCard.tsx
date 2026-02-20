/**
 * ManagementOnlyCard - Affiche un contact directionnel avec blocage de recherche externe
 * Version V3.2 - Pour les cas où seule la direction doit être contactée
 */

'use client';

import { User, Phone, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ManagementOnlyCardProps {
  rule: {
    name: string;
    phone_number: string;
    contact_name?: string;
    instructions?: string;
  };
  warning: string;
}

export function ManagementOnlyCard({ rule, warning }: ManagementOnlyCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${rule.phone_number.replace(/\D/g, '')}`;
  };

  return (
    <Card className="border-2 border-blue-400 bg-blue-50/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-blue-800">Direction</h2>
            <p className="text-blue-600 text-sm">Contact prioritaire</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Numéro */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Contacter</div>
              <div className="text-2xl font-bold text-gray-900">{rule.contact_name || 'Direction'}</div>
              <div className="text-xl text-gray-700">{rule.phone_number}</div>
            </div>
            <Button 
              onClick={handleCall}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Phone className="w-5 h-5 mr-2" />
              Appeler
            </Button>
          </div>
        </div>

        {/* Instructions */}
        {rule.instructions && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-gray-700">{rule.instructions}</p>
          </div>
        )}

        {/* Warning bloquant */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-red-800">{warning}</p>
              <div className="mt-3 flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Ne contactez pas de garage extérieur</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
