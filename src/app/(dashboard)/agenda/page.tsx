'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { getAgendaEvents } from '@/actions/maintenance-workflow';
import Link from 'next/link';

const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: 'RDV_GARAGE' | 'RETOUR_PREVU' | 'RAPPEL';
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  vehicle_registration: string;
  garage_name: string;
  maintenance_id: string;
}

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAgendaEvents({});
      
      if (result?.data?.success && result.data.data) {
        const formattedEvents = result.data.data.map((event: AgendaEvent) => ({
          id: event.id,
          title: event.title,
          start: new Date(`${event.event_date}T${event.start_time}`),
          end: new Date(`${event.event_date}T${event.end_time || event.start_time}`),
          resource: event,
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Erreur chargement agenda:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventStyleGetter = (event: any) => {
    const { event_type, status } = event.resource;
    
    let backgroundColor = '#3b82f6';
    let borderColor = '#2563eb';
    
    if (event_type === 'RDV_GARAGE') {
      backgroundColor = status === 'COMPLETED' ? '#10b981' : '#3b82f6';
      borderColor = status === 'COMPLETED' ? '#059669' : '#2563eb';
    } else if (event_type === 'RETOUR_PREVU') {
      backgroundColor = '#f59e0b';
      borderColor = '#d97706';
    } else if (event_type === 'RAPPEL') {
      backgroundColor = '#8b5cf6';
      borderColor = '#7c3aed';
    }
    
    if (status === 'CANCELLED') {
      backgroundColor = '#ef4444';
      borderColor = '#dc2626';
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '6px',
        opacity: status === 'CANCELLED' ? 0.6 : 1,
        color: 'white',
        border: 'none',
        padding: '2px 4px',
      },
    };
  };

  const CustomToolbar = ({ onNavigate, label }: any) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
          Aujourd'hui
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('PREV')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('NEXT')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold ml-2">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('month')}
        >
          Mois
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('week')}
        >
          Semaine
        </Button>
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('day')}
        >
          Jour
        </Button>
        <Button
          variant={view === 'agenda' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('agenda')}
        >
          <List className="h-4 w-4 mr-1" />
          Liste
        </Button>
      </div>
    </div>
  );

  const CustomEvent = ({ event }: { event: any }) => {
    const { resource } = event;
    return (
      <Link href={`/maintenance/${resource.maintenance_id}`} className="block">
        <div className="text-xs font-medium truncate">
          {resource.vehicle_registration}
        </div>
        <div className="text-xs opacity-90 truncate">
          {resource.garage_name}
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const messages = {
    today: "Aujourd'hui",
    previous: 'Précédent',
    next: 'Suivant',
    month: 'Mois',
    week: 'Semaine',
    day: 'Jour',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Heure',
    event: 'Événement',
    noEventsInRange: 'Aucun événement dans cette période',
    showMore: (total: number) => `+ ${total} autres`,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            Agenda Maintenance
          </h1>
          <p className="text-muted-foreground mt-1">
            Planning des rendez-vous et interventions
          </p>
        </div>
        <Button asChild>
          <Link href="/maintenance">Voir les interventions</Link>
        </Button>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-blue-500 hover:bg-blue-600">RDV Garage</Badge>
        <Badge className="bg-emerald-500 hover:bg-emerald-600">Terminé</Badge>
        <Badge className="bg-amber-500 hover:bg-amber-600">Retour prévu</Badge>
        <Badge className="bg-purple-500 hover:bg-purple-600">Rappel</Badge>
        <Badge className="bg-red-500 hover:bg-red-600">Annulé</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendrier des interventions</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
              event: CustomEvent,
            }}
            messages={messages}
            culture="fr"
          />
        </CardContent>
      </Card>
    </div>
  );
}
