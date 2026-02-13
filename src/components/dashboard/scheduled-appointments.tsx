/**
 * Scheduled Appointments - Dashboard
 * Affiche les RDV de maintenance programmés
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Wrench, ArrowRight, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ScheduledAppointment {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  service_date: string;
  service_time?: string;
  description: string;
  garage?: string;
  days_until: number;
}

interface ScheduledAppointmentsProps {
  appointments: ScheduledAppointment[] | null;
  isLoading: boolean;
}

export function ScheduledAppointments({ appointments, isLoading }: ScheduledAppointmentsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = appointments || [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            RDV programmés
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-300">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun RDV programmé</p>
            <p className="text-xs mt-1">Planifiez une maintenance pour voir les RDV ici</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {items.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/maintenance`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "p-2 rounded-full shrink-0",
                    appointment.days_until <= 3 ? "bg-red-100 text-red-600" : 
                    appointment.days_until <= 7 ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  )}>
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{appointment.vehicle_name}</p>
                    <p className="text-xs text-gray-400">{appointment.service_type}</p>
                    {appointment.garage && (
                      <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {appointment.garage}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {format(parseISO(appointment.service_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                    {appointment.service_time && (
                      <p className="text-xs text-gray-300 flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {appointment.service_time.slice(0, 5)}
                      </p>
                    )}
                    <p className={cn(
                      "text-xs font-medium",
                      appointment.days_until <= 3 ? "text-red-600" : "text-gray-300"
                    )}>
                      J-{appointment.days_until}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
