'use client';

import { useEffect, useState, useCallback } from 'react';
// @ts-expect-error react-big-calendar has no type declarations
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './agenda-premium.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { getAgendaEvents } from '@/actions/maintenance-workflow';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
      const result = await getAgendaEvents({}) as any;
      
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
    
    // Classes CSS pour le glassmorphism - gérées dans agenda-premium.css
    let eventClass = 'event-default';
    
    if (status === 'CANCELLED') {
      eventClass = 'event-cancelled';
    } else if (event_type === 'RDV_GARAGE') {
      eventClass = status === 'COMPLETED' ? 'event-completed' : 'event-default';
    } else if (event_type === 'RETOUR_PREVU') {
      eventClass = 'event-return';
    } else if (event_type === 'RAPPEL') {
      eventClass = 'event-reminder';
    }
    
    return {
      className: eventClass,
      style: {
        borderRadius: '8px',
        opacity: status === 'CANCELLED' ? 0.7 : 1,
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        fontSize: '0.85rem',
        fontWeight: 500,
      },
    };
  };

  const CustomToolbar = ({ onNavigate, label }: any) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onNavigate('TODAY')}
          className="bg-slate-800/50 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40"
        >
          Aujourd'hui
        </Button>
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onNavigate('PREV')}
            className="bg-slate-800/50 border-cyan-500/20 hover:bg-cyan-500/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onNavigate('NEXT')}
            className="bg-slate-800/50 border-cyan-500/20 hover:bg-cyan-500/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xl font-bold text-white ml-2">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {['month', 'week', 'day', 'agenda'].map((v) => (
          <Button
            key={v}
            variant={view === v ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(v as View)}
            className={view === v 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 border-none shadow-lg shadow-cyan-500/25' 
              : 'bg-slate-800/50 border-cyan-500/20 hover:bg-cyan-500/10'
            }
          >
            {v === 'agenda' && <List className="h-4 w-4 mr-1" />}
            {v === 'month' && 'Mois'}
            {v === 'week' && 'Semaine'}
            {v === 'day' && 'Jour'}
            {v === 'agenda' && 'Liste'}
          </Button>
        ))}
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
      <div className="space-y-6 p-6 agenda-premium">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-slate-800/50" />
          <Skeleton className="h-10 w-32 bg-slate-800/50" />
        </div>
        <Skeleton className="h-[600px] bg-slate-800/30 rounded-2xl" />
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
    <div className="space-y-6 p-6 agenda-premium">
      {/* Header avec effet glassmorphism */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Agenda Maintenance
            </span>
          </h1>
          <p className="text-slate-400 mt-2">
            Planning des rendez-vous et interventions
          </p>
        </div>
        <Button 
          asChild
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-none shadow-lg shadow-cyan-500/25"
        >
          <Link href="/maintenance" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle intervention
          </Link>
        </Button>
      </motion.div>

      {/* Légende - Badges glassmorphism */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        {[
          { label: 'RDV Garage', color: 'from-blue-500 to-cyan-500', border: 'border-blue-500/30' },
          { label: 'Terminé', color: 'from-emerald-500 to-teal-500', border: 'border-emerald-500/30' },
          { label: 'Retour prévu', color: 'from-amber-500 to-orange-500', border: 'border-amber-500/30' },
          { label: 'Rappel', color: 'from-violet-500 to-purple-500', border: 'border-violet-500/30' },
          { label: 'Annulé', color: 'from-red-500 to-rose-500', border: 'border-red-500/30' },
        ].map((item) => (
          <Badge 
            key={item.label}
            className={`bg-gradient-to-r ${item.color} ${item.border} border shadow-lg backdrop-blur-sm`}
          >
            {item.label}
          </Badge>
        ))}
      </motion.div>

      {/* Calendrier - Card transparente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative rounded-2xl overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-sm" />
          
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-cyan-500/10 shadow-2xl">
            <CardHeader className="border-b border-cyan-500/10">
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-cyan-400" />
                Calendrier des interventions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
      </motion.div>
    </div>
  );
}
