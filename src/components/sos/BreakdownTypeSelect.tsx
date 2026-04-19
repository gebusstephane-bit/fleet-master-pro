'use client';

/**
 * BreakdownTypeSelect - Sélection du type de panne (V3.2)
 * Aligné Design System Fleet-Master - Glassmorphism
 */

import { Cog, Thermometer, CircleDot, Zap, Hammer, Truck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BreakdownType = 'mechanical' | 'frigo' | 'tire' | 'electric' | 'bodywork' | 'tailgate';

interface BreakdownTypeSelectProps {
  value: BreakdownType | null;
  onChange: (value: BreakdownType) => void;
}

const BREAKDOWN_TYPES: { type: BreakdownType; label: string; icon: React.ElementType; description: string; color: string; iconBg: string }[] = [
  {
    type: 'tire',
    label: 'Pneu',
    icon: CircleDot,
    description: 'Crevé, éclaté, dégonflé',
    color: 'border-amber-500/30 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10',
    iconBg: 'bg-amber-500/20'
  },
  {
    type: 'mechanical',
    label: 'Mécanique',
    icon: Cog,
    description: 'Moteur, transmission, freins',
    color: 'border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10',
    iconBg: 'bg-red-500/20'
  },
  {
    type: 'frigo',
    label: 'Frigo',
    icon: Thermometer,
    description: 'Groupe frigo en panne',
    color: 'border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10',
    iconBg: 'bg-cyan-500/20'
  },
  {
    type: 'electric',
    label: 'Électrique',
    icon: Zap,
    description: 'Batterie, alternateur, éclairage',
    color: 'border-orange-500/30 text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/10',
    iconBg: 'bg-orange-500/20'
  },
  {
    type: 'tailgate',
    label: 'Hayon',
    icon: Truck,
    description: 'Hayon élévateur en panne',
    color: 'border-violet-500/30 text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/10',
    iconBg: 'bg-violet-500/20'
  },
  {
    type: 'bodywork',
    label: 'Carrosserie',
    icon: Hammer,
    description: 'Choc, porte, pare-brise',
    color: 'border-slate-500/30 text-slate-400 hover:border-slate-500/50 hover:bg-slate-500/10',
    iconBg: 'bg-slate-500/20'
  }
];

export function BreakdownTypeSelect({ value, onChange }: BreakdownTypeSelectProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {BREAKDOWN_TYPES.map(({ type, label, icon: Icon, description, color, iconBg }) => {
        const isSelected = value === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-center bg-[#0f172a]/40',
              isSelected 
                ? 'border-cyan-500 ring-2 ring-cyan-500/30 bg-cyan-500/20' 
                : 'border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/10',
              isSelected ? '' : color
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center mb-2',
              isSelected ? 'bg-cyan-500/20' : iconBg
            )}>
              <Icon className={cn(
                'w-5 h-5',
                isSelected ? 'text-cyan-400' : ''
              )} />
            </div>
            <span className={cn(
              'font-semibold',
              isSelected ? 'text-cyan-400' : 'text-foreground'
            )}>
              {label}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {description}
            </span>
            
            {type === 'tailgate' && (
              <span className="mt-2 text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">
                Direction uniquement
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
