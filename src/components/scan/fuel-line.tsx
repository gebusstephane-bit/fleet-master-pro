'use client';

/**
 * Composant ligne de carburant pour formulaire multi-plein
 * UX optimisée pour la saisie rapide sur le terrain
 */

import { FuelInputLine, FUEL_TYPE_FORM_CONFIG, FuelType } from '@/types/fuel';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Droplets, DollarSign, Gauge, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FuelLineProps {
  line: FuelInputLine;
  index: number;
  canRemove: boolean;
  mileageError?: string;
  currentVehicleMileage?: number;
  onUpdate: (updates: Partial<Omit<FuelInputLine, 'id'>>) => void;
  onRemove: () => void;
}

export function FuelLine({ line, index, canRemove, mileageError, currentVehicleMileage, onUpdate, onRemove }: FuelLineProps) {
  const config = FUEL_TYPE_FORM_CONFIG.find(c => c.value === line.type);
  const isGnr = line.type === 'gnr';
  
  // Calcul du prix au litre si les deux sont renseignés
  const pricePerLiter = line.liters && line.price
    ? (parseFloat(line.price) / parseFloat(line.liters)).toFixed(3)
    : null;

  return (
    <div className="bg-[#18181b] rounded-xl p-4 space-y-4 border border-white/[0.06]">
      {/* Header avec numéro et bouton suppression */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-white/10 text-[#71717a]">
            #{index + 1}
          </Badge>
          <span className="text-sm font-medium text-white">
            Carburant
          </span>
        </div>
        
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sélection du type */}
      <div className="grid grid-cols-4 gap-2">
        {FUEL_TYPE_FORM_CONFIG.map((fuelConfig) => (
          <button
            key={fuelConfig.value}
            type="button"
            onClick={() => onUpdate({ type: fuelConfig.value })}
            className={cn(
              "p-2 rounded-lg border-2 transition-all text-center min-h-[60px] flex flex-col items-center justify-center",
              line.type === fuelConfig.value
                ? fuelConfig.color
                : 'bg-[#0f1117] border-white/[0.06] text-[#71717a] hover:border-white/20'
            )}
          >
            <span className="text-lg mb-0.5">{fuelConfig.icon}</span>
            <span className="text-xs font-medium">{fuelConfig.label}</span>
          </button>
        ))}
      </div>

      {/* Info spéciale pour GNR */}
      {isGnr && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Info className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
          <div className="text-sm text-green-300">
            <p className="font-medium">GNR - Groupe frigo uniquement</p>
            <p className="text-green-400/70 text-xs mt-0.5">
              Pas de lien avec le kilométrage véhicule. Saisissez uniquement le volume.
            </p>
          </div>
        </div>
      )}

      {/* Champs de saisie */}
      <div className="grid grid-cols-2 gap-3">
        {/* Litres - TOUJOURS REQUIS */}
        <div className="space-y-1.5">
          <Label className="text-xs text-[#a1a1aa] flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-cyan-400" />
            Litres <span className="text-red-400">*</span>
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            value={line.liters}
            onChange={(e) => onUpdate({ liters: e.target.value })}
            className={cn(
              "h-11 text-lg font-medium bg-[#0f1117] border-white/[0.06]",
              "focus:border-cyan-500/50 focus:ring-cyan-500/20",
              "placeholder:text-[#52525b]",
              line.liters && "border-cyan-500/30"
            )}
          />
        </div>

        {/* Prix - OPTIONNEL */}
        <div className="space-y-1.5">
          <Label className="text-xs text-[#a1a1aa] flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            Prix € <span className="text-[#52525b] font-normal">(optionnel)</span>
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="Prix inconnu"
            value={line.price}
            onChange={(e) => onUpdate({ price: e.target.value })}
            className={cn(
              "h-11 text-lg font-medium bg-[#0f1117] border-white/[0.06]",
              "focus:border-emerald-500/50 focus:ring-emerald-500/20",
              "placeholder:text-[#52525b] placeholder:italic",
              line.price && "border-emerald-500/30"
            )}
          />
        </div>
      </div>

      {/* Prix au litre calculé */}
      {pricePerLiter && (
        <p className="text-xs text-[#71717a] text-center -mt-1">
          ≈ {pricePerLiter} €/L
        </p>
      )}

      {/* Kilométrage - CONDITIONNEL */}
      <div className={cn(
        "space-y-1.5 transition-opacity",
        isGnr && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-[#a1a1aa] flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-amber-400" />
            Kilométrage {isGnr ? <span className="text-green-400">(N/A)</span> : <span className={isGnr ? '' : 'text-red-400'}>*</span>}
          </Label>
          {currentVehicleMileage && currentVehicleMileage > 0 && !isGnr && (
            <span className="text-xs text-[#71717a]">
              Actuel: <span className="text-amber-400 font-medium">{currentVehicleMileage.toLocaleString('fr-FR')} km</span>
            </span>
          )}
        </div>
        <Input
          type="number"
          min={currentVehicleMileage || 0}
          inputMode="numeric"
          placeholder={isGnr ? '─' : `Min: ${currentVehicleMileage?.toLocaleString('fr-FR') || '0'} km`}
          value={line.mileage}
          disabled={isGnr}
          onChange={(e) => onUpdate({ mileage: e.target.value })}
          className={cn(
            "h-11 text-lg font-medium bg-[#0f1117] border-white/[0.06]",
            "focus:border-amber-500/50 focus:ring-amber-500/20",
            "placeholder:text-[#52525b]",
            "disabled:bg-[#0a0a0c] disabled:text-[#52525b]",
            line.mileage && !isGnr && !mileageError && "border-amber-500/30",
            mileageError && "border-red-500/50 bg-red-500/10 focus:border-red-500/50"
          )}
        />
        {mileageError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
            {mileageError}
          </p>
        )}
      </div>
    </div>
  );
}
