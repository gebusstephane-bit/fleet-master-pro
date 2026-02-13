'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Stop {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  serviceDuration?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

interface SortableStopProps {
  stop: Stop;
  index: number;
  onUpdate: (id: string, updates: Partial<Stop>) => void;
  onRemove: (id: string) => void;
}

export function SortableStop({ stop, index, onUpdate, onRemove }: SortableStopProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const hasTimeWindow = stop.timeWindowStart || stop.timeWindowEnd;
  const isHighPriority = stop.priority === 'HIGH';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-start gap-3 p-3 bg-card border rounded-lg
        ${isDragging ? 'shadow-lg ring-2 ring-primary' : 'hover:border-primary/50'}
        ${isHighPriority ? 'border-l-4 border-l-red-500' : ''}
        transition-all
      `}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Stop Number */}
      <div className={`
        flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
        ${isHighPriority ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'}
      `}>
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Adresse */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={stop.address}
            onChange={(e) => onUpdate(stop.id, { address: e.target.value })}
            placeholder="Adresse"
            className="h-8 text-sm"
          />
        </div>

        {/* Coordinates */}
        {stop.latitude && stop.longitude && (
          <Badge variant="secondary" className="text-xs">
            {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
          </Badge>
        )}

        {/* Contraintes horaires */}
        <div className="grid grid-cols-2 gap-2 p-2 bg-muted/50 rounded">
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Créneau
            </Label>
            <div className="flex items-center gap-1 mt-1">
              <Input
                type="time"
                value={stop.timeWindowStart || ''}
                onChange={(e) => onUpdate(stop.id, { timeWindowStart: e.target.value })}
                className="h-7 text-xs"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="time"
                value={stop.timeWindowEnd || ''}
                onChange={(e) => onUpdate(stop.id, { timeWindowEnd: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            {hasTimeWindow && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Livraison obligatoire dans ce créneau
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Durée (min)</Label>
              <Input
                type="number"
                value={stop.serviceDuration || 15}
                onChange={(e) => onUpdate(stop.id, { serviceDuration: parseInt(e.target.value) })}
                className="h-7 text-xs"
                min={5}
                max={120}
              />
            </div>
            <div>
              <Label className="text-xs">Priorité</Label>
              <select
                value={stop.priority || 'NORMAL'}
                onChange={(e) => onUpdate(stop.id, { priority: e.target.value as any })}
                className="w-full h-7 text-xs rounded border border-input bg-background px-2"
              >
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(stop.id)}
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

// Import manquant
import { Label } from '@/components/ui/label';
