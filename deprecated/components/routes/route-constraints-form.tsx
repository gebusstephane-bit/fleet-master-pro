'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RouteConstraints, DEFAULT_CONSTRAINTS } from '@/lib/routing/constraints';
import { Clock, Route, Weight, AlertTriangle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RouteConstraintsFormProps {
  constraints: RouteConstraints;
  onChange: (constraints: RouteConstraints) => void;
  violations?: string[];
}

export function RouteConstraintsForm({ 
  constraints, 
  onChange,
  violations = []
}: RouteConstraintsFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (updates: Partial<RouteConstraints>) => {
    onChange({ ...constraints, ...updates });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Contraintes de tournée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Violations */}
        {violations.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Contraintes non respectées :</span>
            </div>
            <ul className="text-sm text-destructive/90 space-y-1 ml-6">
              {violations.map((v, i) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Distance max */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              Distance maximum
            </Label>
            <Badge variant="secondary">
              {constraints.maxDistanceKm} km
            </Badge>
          </div>
          <Slider
            value={[constraints.maxDistanceKm]}
            onValueChange={([v]) => handleChange({ maxDistanceKm: v })}
            min={100}
            max={2000}
            step={50}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100 km</span>
            <span className="text-primary font-medium">National</span>
            <span>2000 km</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ La vitesse est calculée automatiquement selon le type de véhicule
            (PL limité à 90 km/h sur autoroute)
          </p>
        </div>

        {/* Heures */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Heure de départ
            </Label>
            <Input
              type="time"
              value={constraints.startTime}
              onChange={(e) => handleChange({ startTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Heure de retour max
            </Label>
            <Input
              type="time"
              value={constraints.endTime}
              onChange={(e) => handleChange({ endTime: e.target.value })}
            />
          </div>
        </div>

        {/* Durée max */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Durée maximum</Label>
            <Badge variant="secondary">{formatDuration(constraints.maxDurationMinutes)}</Badge>
          </div>
          <Slider
            value={[constraints.maxDurationMinutes]}
            onValueChange={([v]) => handleChange({ maxDurationMinutes: v })}
            min={120}
            max={600}
            step={30}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2h</span>
            <span>8h (recommandé)</span>
            <span>10h</span>
          </div>
        </div>

        {/* Options avancées */}
        <div className="pt-2 border-t">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary hover:underline"
          >
            {showAdvanced ? 'Masquer' : 'Afficher'} les options avancées
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 pt-2">
            {/* Nombre max d'arrêts */}
            <div className="space-y-2">
              <Label>Nombre maximum d'arrêts</Label>
              <Input
                type="number"
                value={constraints.maxStops}
                onChange={(e) => handleChange({ maxStops: parseInt(e.target.value) || 15 })}
                min={1}
                max={50}
              />
            </div>

            {/* Équipements spéciaux */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Weight className="w-4 h-4" />
                Équipements requis
              </Label>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Véhicule réfrigéré</span>
                <Switch
                  checked={constraints.requireRefrigeration}
                  onCheckedChange={(v) => handleChange({ requireRefrigeration: v })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Hayon élévateur</span>
                <Switch
                  checked={constraints.requireLiftgate}
                  onCheckedChange={(v) => handleChange({ requireLiftgate: v })}
                />
              </div>
            </div>

            {/* Pondérations */}
            <div className="space-y-4">
              <Label>Priorité d'optimisation</Label>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Distance</span>
                  <span className="text-muted-foreground">{Math.round(constraints.distanceWeight * 100)}%</span>
                </div>
                <Slider
                  value={[constraints.distanceWeight * 100]}
                  onValueChange={([v]) => handleChange({ distanceWeight: v / 100 })}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Créneaux horaires</span>
                  <span className="text-muted-foreground">{Math.round(constraints.timeWindowWeight * 100)}%</span>
                </div>
                <Slider
                  value={[constraints.timeWindowWeight * 100]}
                  onValueChange={([v]) => handleChange({ timeWindowWeight: v / 100 })}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Priorité des arrêts</span>
                  <span className="text-muted-foreground">{Math.round(constraints.priorityWeight * 100)}%</span>
                </div>
                <Slider
                  value={[constraints.priorityWeight * 100]}
                  onValueChange={([v]) => handleChange({ priorityWeight: v / 100 })}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>
            </div>

            {/* Réinitialiser */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(DEFAULT_CONSTRAINTS)}
              className="w-full"
            >
              Réinitialiser les paramètres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
