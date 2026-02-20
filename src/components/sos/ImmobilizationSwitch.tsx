/**
 * ImmobilizationSwitch - Indique si le véhicule est immobilisé
 */

'use client';

import { Car, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ImmobilizationSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ImmobilizationSwitch({ value, onChange }: ImmobilizationSwitchProps) {
  return (
    <div className={`p-4 rounded-lg border-2 transition-colors ${value ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${value ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
            <Car className="w-5 h-5" />
          </div>
          <div>
            <Label htmlFor="immobilized" className="font-medium cursor-pointer">
              Véhicule immobilisé
            </Label>
            <p className="text-sm text-gray-500">
              {value 
                ? 'Le véhicule ne peut pas rouler' 
                : 'Le véhicule peut encore rouler'}
            </p>
          </div>
        </div>
        <Switch
          id="immobilized"
          checked={value}
          onCheckedChange={onChange}
        />
      </div>
      
      {value && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-100/50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Important:</strong> Si vous êtes sur autoroute, appelez immédiatement le 112 ou utilisez les bornes d'urgence.
          </span>
        </div>
      )}
    </div>
  );
}
