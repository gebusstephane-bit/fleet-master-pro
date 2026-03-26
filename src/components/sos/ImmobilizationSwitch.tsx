/**
 * ImmobilizationSwitch - Indique si le véhicule est immobilisé
 * Aligné Design System Fleet-Master
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
    <div className={`p-4 rounded-lg border-2 transition-all ${value ? 'bg-red-500/10 border-red-500/30' : 'bg-[#0f172a]/40 border-cyan-500/20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${value ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
            <Car className="w-5 h-5" />
          </div>
          <div>
            <Label htmlFor="immobilized" className="font-medium cursor-pointer text-foreground">
              Véhicule immobilisé
            </Label>
            <p className="text-sm text-muted-foreground">
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
        <div className="mt-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Important:</strong> Si vous êtes sur autoroute, appelez immédiatement le 112 ou utilisez les bornes d'urgence.
          </span>
        </div>
      )}
    </div>
  );
}
