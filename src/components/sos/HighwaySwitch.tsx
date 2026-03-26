/**
 * HighwaySwitch - Indique si on est sur une autoroute
 * Aligné Design System Fleet-Master
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
    <div className={`p-4 rounded-lg border-2 transition-all ${value ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#0f172a]/40 border-cyan-500/20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${value ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-500/20 text-slate-400'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16M4 20h16M6 4v16M18 4v16M10 8h4M10 12h4M10 16h4"/>
            </svg>
          </div>
          <div>
            <Label htmlFor="highway" className="font-medium cursor-pointer text-foreground">
              Sur autoroute
            </Label>
            <p className="text-sm text-muted-foreground">
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
        <div className="mt-3 flex items-start gap-2 text-sm text-orange-400 bg-orange-500/10 p-2 rounded border border-orange-500/20">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Priorité:</strong> Si immobilisé sur autoroute, la sécurité passe avant tout. Appelez le 112.
          </span>
        </div>
      )}
    </div>
  );
}
