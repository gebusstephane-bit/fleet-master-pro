/**
 * HighwaySwitch - Indique si on est sur une autoroute
 */

'use client';

import { AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface HighwaySwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function HighwaySwitch({ value, onChange }: HighwaySwitchProps) {
  return (
    <div className={`p-4 rounded-lg border-2 transition-colors ${value ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${value ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16M4 20h16M6 4v16M18 4v16M10 8h4M10 12h4M10 16h4"/>
            </svg>
          </div>
          <div>
            <Label htmlFor="highway" className="font-medium cursor-pointer">
              Sur autoroute
            </Label>
            <p className="text-sm text-gray-500">
              {value 
                ? 'A10, A6, autoroute...' 
                : 'Route nationale, départementale, ville'}
            </p>
          </div>
        </div>
        <Switch
          id="highway"
          checked={value}
          onCheckedChange={onChange}
        />
      </div>
      
      {value && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-100/50 p-2 rounded">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Priorité:</strong> Si immobilisé sur autoroute, la sécurité passe avant tout. Appelez le 112.
          </span>
        </div>
      )}
    </div>
  );
}
