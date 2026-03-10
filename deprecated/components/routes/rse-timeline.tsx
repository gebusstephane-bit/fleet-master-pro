'use client';

import { RSEResult, formatDuration } from '@/lib/routing/rse-regulations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Coffee, Navigation, Check, Clock } from 'lucide-react';

interface RSETimelineProps {
  rseResult: RSEResult;
  isHeavyVehicle: boolean;
}

export function RSETimeline({ rseResult, isHeavyVehicle }: RSETimelineProps) {
  if (!isHeavyVehicle) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Pas de contrainte RSE stricte pour ce type de véhicule
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={rseResult.isCompliant ? '' : 'border-amber-500'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="w-4 h-4" />
            Conformité RSE (Poids Lourd)
          </CardTitle>
          {rseResult.isCompliant ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="w-3 h-3 mr-1" />
              Conforme
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Non conforme
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats RSE */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-lg font-bold text-primary">
              {formatDuration(rseResult.totalDrivingTime)}
            </p>
            <p className="text-xs text-muted-foreground">Conduite</p>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-lg font-bold text-amber-600">
              {formatDuration(rseResult.totalBreakTime)}
            </p>
            <p className="text-xs text-muted-foreground">Pauses</p>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-lg font-bold">
              {Math.max(0, 270 - (rseResult.totalDrivingTime % 270))}min
            </p>
            <p className="text-xs text-muted-foreground">Avant pause</p>
          </div>
        </div>

        {/* Avertissements */}
        {rseResult.warnings.length > 0 && (
          <div className="space-y-2">
            {rseResult.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timeline des périodes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Timeline de la tournée :</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {rseResult.periods.map((period, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 rounded text-sm ${
                  period.type === 'DRIVING'
                    ? 'bg-blue-50'
                    : period.type === 'BREAK'
                    ? 'bg-amber-100 border border-amber-300'
                    : period.type === 'SERVICE'
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                }`}
              >
                {/* Icon */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  {period.type === 'DRIVING' && <Navigation className="w-3 h-3 text-blue-600" />}
                  {period.type === 'BREAK' && <Coffee className="w-3 h-3 text-amber-600" />}
                  {period.type === 'SERVICE' && <Check className="w-3 h-3 text-green-600" />}
                  {period.type === 'REST' && <Clock className="w-3 h-3 text-gray-600" />}
                </div>

                {/* Time */}
                <div className="text-xs text-muted-foreground w-20 flex-shrink-0">
                  {period.startTime} - {period.endTime}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{period.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(period.durationMinutes)}
                  </p>
                </div>

                {/* Badge */}
                {period.type === 'BREAK' && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                    PAUSE OBLIGATOIRE
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Légende RSE */}
        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Règles RSE appliquées :</p>
          <p>• Maximum 4h30 de conduite continue</p>
          <p>• 45 minutes de pause obligatoire après 4h30</p>
          <p>• Maximum 9h de conduite par jour</p>
        </div>
      </CardContent>
    </Card>
  );
}
