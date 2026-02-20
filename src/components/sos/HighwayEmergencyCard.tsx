/**
 * HighwayEmergencyCard - Affiche les instructions de sécurité pour une urgence sur autoroute
 * Version V3.2 - Priorité absolue
 */

'use client';

import { AlertTriangle, Phone, Shield, Triangle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HighwayEmergencyCardProps {
  message: string;
  safetyInstructions: string[];
  highwayService: {
    name: string;
    phone: string;
    alternative?: string;
  };
  warning: string;
  vehicle: {
    brand: string;
    model: string;
    registration_number: string;
  };
}

export function HighwayEmergencyCard({
  message,
  safetyInstructions,
  highwayService,
  warning,
  vehicle
}: HighwayEmergencyCardProps) {
  const handleEmergencyCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  return (
    <Card className="border-4 border-red-600 bg-red-50 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-full">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-700 uppercase tracking-wide">
              🚨 URGENCE AUTOROUTE
            </h2>
            <p className="text-red-600 font-medium">{message}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Consignes de sécurité */}
        <div className="bg-white rounded-xl p-4 border-2 border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-800">CONSIGNES DE SÉCURITÉ</h3>
          </div>
          
          <ul className="space-y-3">
            {safetyInstructions.map((instruction, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-7 h-7 flex-shrink-0 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </span>
                <span className="text-gray-800 font-medium pt-0.5">{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Numéros d'urgence */}
        <div className="bg-red-600 text-white rounded-xl p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            APPELEZ MAINTENANT
          </h3>
          
          <div className="grid gap-3">
            <button
              onClick={() => handleEmergencyCall('112')}
              className="bg-white text-red-700 rounded-lg p-4 font-bold text-3xl hover:bg-red-50 transition-colors flex items-center justify-center gap-3"
            >
              <Phone className="w-8 h-8" />
              112
            </button>
            
            <div className="text-sm text-red-100 text-center">
              Numéro d'urgence européen - Gratuit 24h/24
            </div>
          </div>
        </div>

        {/* Alerte finale */}
        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 flex items-start gap-3">
          <Triangle className="w-6 h-6 text-yellow-700 flex-shrink-0" />
          <div>
            <p className="font-bold text-yellow-800 text-lg">⚠️ {warning}</p>
            <p className="text-yellow-700 mt-1">
              {vehicle.brand} {vehicle.model} - {vehicle.registration_number}
            </p>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            Les bornes d'appel d'urgence sont situées tous les 2 km sur les autoroutes françaises.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
