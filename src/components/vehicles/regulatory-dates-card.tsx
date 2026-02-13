'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Wrench,
  Gauge,
  Snowflake
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { vehicleTypeConfig, type VehicleType } from '@/lib/vehicle/calculate-dates';

interface RegulatoryDatesCardProps {
  vehicle: {
    type?: string;
    technical_control_date?: string;
    technical_control_expiry?: string;
    tachy_control_date?: string;
    tachy_control_expiry?: string;
    atp_date?: string;
    atp_expiry?: string;
  };
}

interface DateItem {
  id: string;
  label: string;
  date: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'cyan';
  description?: string;
}

export function RegulatoryDatesCard({ vehicle }: RegulatoryDatesCardProps) {
  const vehicleType = vehicle.type as VehicleType | undefined;
  const typeConfig = vehicleType ? vehicleTypeConfig[vehicleType] : null;

  const dates: DateItem[] = [
    // CT
    vehicle.technical_control_expiry && {
      id: 'ct',
      label: 'Contrôle Technique',
      date: vehicle.technical_control_expiry,
      icon: <Wrench className="h-5 w-5" />,
      color: 'green',
      description: vehicle.technical_control_date 
        ? `Dernier: ${format(parseISO(vehicle.technical_control_date), 'dd/MM/yyyy')}`
        : undefined,
    },
    // Tachy
    vehicle.tachy_control_expiry && {
      id: 'tachy',
      label: 'Tachygraphe',
      date: vehicle.tachy_control_expiry,
      icon: <Gauge className="h-5 w-5" />,
      color: 'blue',
      description: vehicle.tachy_control_date
        ? `Dernier: ${format(parseISO(vehicle.tachy_control_date), 'dd/MM/yyyy')}`
        : undefined,
    },
    // ATP
    vehicle.atp_expiry && {
      id: 'atp',
      label: 'ATP Frigorifique',
      date: vehicle.atp_expiry,
      icon: <Snowflake className="h-5 w-5" />,
      color: 'cyan',
      description: vehicle.atp_date
        ? `Délivré: ${format(parseISO(vehicle.atp_date), 'dd/MM/yyyy')}`
        : undefined,
    },
  ].filter(Boolean) as DateItem[];

  if (dates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Échéances réglementaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Aucune échéance configurée. Modifiez le véhicule pour ajouter les dates de contrôle.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Échéances réglementaires
          {typeConfig && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {typeConfig.emoji} {typeConfig.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dates.map((item) => {
          const daysLeft = differenceInDays(parseISO(item.date), new Date());
          const isExpired = daysLeft < 0;
          const isUrgent = daysLeft < 30 && daysLeft >= 0;
          const isWarning = daysLeft < 60 && daysLeft >= 30;

          const colorClasses = {
            green: {
              bg: isExpired ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : 'bg-green-50',
              border: isExpired ? 'border-red-200' : isUrgent ? 'border-amber-200' : 'border-green-200',
              text: isExpired ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-green-700',
              icon: isExpired ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-green-500',
            },
            blue: {
              bg: isExpired ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : 'bg-blue-50',
              border: isExpired ? 'border-red-200' : isUrgent ? 'border-amber-200' : 'border-blue-200',
              text: isExpired ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-blue-700',
              icon: isExpired ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-blue-500',
            },
            cyan: {
              bg: isExpired ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : 'bg-cyan-50',
              border: isExpired ? 'border-red-200' : isUrgent ? 'border-amber-200' : 'border-cyan-200',
              text: isExpired ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-cyan-700',
              icon: isExpired ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-cyan-500',
            },
          };

          const colors = colorClasses[item.color];

          return (
            <div
              key={item.id}
              className={cn(
                'p-4 rounded-lg border-2 transition-all',
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5', colors.icon)}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('font-medium', colors.text)}>{item.label}</p>
                    <Badge
                      variant={isExpired ? 'destructive' : isUrgent ? 'default' : 'secondary'}
                      className={cn(
                        'shrink-0',
                        !isExpired && !isUrgent && 'bg-green-100 text-green-700 hover:bg-green-100'
                      )}
                    >
                      {isExpired ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expiré
                        </>
                      ) : isUrgent ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {daysLeft}j
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          OK
                        </>
                      )}
                    </Badge>
                  </div>

                  <p className={cn('text-lg font-bold mt-1', colors.text)}>
                    {format(parseISO(item.date), 'dd MMMM yyyy', { locale: fr })}
                  </p>

                  <p className={cn('text-sm mt-1', colors.text)}>
                    {isExpired ? (
                      <span className="font-medium">
                        Expiré depuis {Math.abs(daysLeft)} jours
                      </span>
                    ) : isUrgent ? (
                      <span className="font-medium">
                        Expire dans {daysLeft} jours
                      </span>
                    ) : isWarning ? (
                      <span>
                        Expire dans {daysLeft} jours
                      </span>
                    ) : (
                      <span>
                        Valide encore {daysLeft} jours
                      </span>
                    )}
                  </p>

                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Récapitulatif des périodicités */}
        {typeConfig && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <Info className="h-4 w-4 inline mr-1" />
              <strong>Périodicités {typeConfig.label}:</strong>
              <span className="ml-2">
                CT {typeConfig.ctPeriodicity}
                {typeConfig.requiresTachy && ', Tachy 2 ans'}
                {typeConfig.requiresATP && ', ATP 5 ans'}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
