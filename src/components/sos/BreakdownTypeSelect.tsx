/**
 * BreakdownTypeSelect - Sélection du type de panne (V3.2)
 */

'use client';

import { Cog, Thermometer, CircleDot, Zap, Hammer, Truck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BreakdownType = 'mechanical' | 'frigo' | 'tire' | 'electric' | 'bodywork' | 'tailgate';

interface BreakdownTypeSelectProps {
  value: BreakdownType | null;
  onChange: (value: BreakdownType) => void;
}

const BREAKDOWN_TYPES: { type: BreakdownType; label: string; icon: React.ElementType; description: string; color: string }[] = [
  {
    type: 'tire',
    label: 'Pneu',
    icon: CircleDot,
    description: 'Crevé, éclaté, dégonflé',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'
  },
  {
    type: 'mechanical',
    label: 'Mécanique',
    icon: Cog,
    description: 'Moteur, transmission, freins',
    color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
  },
  {
    type: 'frigo',
    label: 'Frigo',
    icon: Thermometer,
    description: 'Groupe frigo en panne',
    color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
  },
  {
    type: 'electric',
    label: 'Électrique',
    icon: Zap,
    description: 'Batterie, alternateur, éclairage',
    color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
  },
  {
    type: 'tailgate',
    label: 'Hayon',
    icon: Truck,
    description: 'Hayon élévateur en panne',
    color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
  },
  {
    type: 'bodywork',
    label: 'Carrosserie',
    icon: Hammer,
    description: 'Choc, porte, pare-brise',
    color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
  }
];

export function BreakdownTypeSelect({ value, onChange }: BreakdownTypeSelectProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {BREAKDOWN_TYPES.map(({ type, label, icon: Icon, description, color }) => {
        const isSelected = value === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-center',
              isSelected 
                ? 'border-red-500 ring-2 ring-red-200 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300 bg-white',
              color
            )}
          >
            <Icon className={cn(
              'w-8 h-8 mb-2',
              isSelected ? 'text-red-600' : ''
            )} />
            <span className={cn(
              'font-semibold',
              isSelected ? 'text-red-700' : ''
            )}>
              {label}
            </span>
            <span className="text-xs opacity-75 mt-1">
              {description}
            </span>
            
            {type === 'tailgate' && (
              <span className="mt-2 text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full">
                Direction uniquement
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
