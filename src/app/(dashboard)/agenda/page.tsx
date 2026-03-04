'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
// @ts-expect-error react-big-calendar has no type declarations
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './agenda-premium.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  AlertTriangle,
  Clock,
  Wrench,
  FileCheck,
  Gauge,
  Thermometer,
  ExternalLink,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { UnifiedCalendarEvent } from '@/app/api/calendar/events/route';

const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type EventType = 'maintenance' | 'ct' | 'tachy' | 'atp';

const FILTER_CONFIG: Record<EventType, { label: string; color: string; gradient: string; border: string; icon: React.ElementType }> = {
  maintenance: { label: 'Maintenances', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500', border: 'border-cyan-500/30', icon: Wrench },
  ct: { label: 'Contrôle Technique', color: 'text-red-400', gradient: 'from-red-500 to-rose-600', border: 'border-red-500/30', icon: FileCheck },
  tachy: { label: 'Tachygraphe', color: 'text-orange-400', gradient: 'from-orange-500 to-amber-500', border: 'border-orange-500/30', icon: Gauge },
  atp: { label: 'ATP', color: 'text-yellow-400', gradient: 'from-yellow-500 to-amber-400', border: 'border-yellow-500/30', icon: Thermometer },
};

interface CalendarEventForBigCalendar {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: UnifiedCalendarEvent;
}

export default function AgendaPage() {
  const [events, setEvents] = useState<CalendarEventForBigCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [activeFilters, setActiveFilters] = useState<Set<EventType>>(new Set(['maintenance', 'ct', 'tachy', 'atp'] as EventType[]));
  const [selectedEvent, setSelectedEvent] = useState<UnifiedCalendarEvent | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar/events');
      if (!res.ok) throw new Error('Erreur API');
      const { events: raw } = await res.json() as { events: UnifiedCalendarEvent[] };

      const formatted = raw.map((ev) => ({
        id: ev.id,
        title: ev.title,
        start: new Date(ev.start),
        end: new Date(ev.end),
        resource: ev,
      }));
      setEvents(formatted);
    } catch (error) {
      console.error('Erreur chargement agenda:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const toggleFilter = (type: EventType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Compter les événements par type
  const countByType = useMemo(() => {
    const counts: Record<EventType, number> = { maintenance: 0, ct: 0, tachy: 0, atp: 0 };
    for (const ev of events) {
      counts[ev.resource.type as EventType] = (counts[ev.resource.type as EventType] || 0) + 1;
    }
    return counts;
  }, [events]);

  // Filtrer les événements selon les filtres actifs
  const filteredEvents = useMemo(
    () => events.filter((ev) => activeFilters.has(ev.resource.type as EventType)),
    [events, activeFilters]
  );

  const eventStyleGetter = (event: CalendarEventForBigCalendar) => {
    const { type, status, urgent, overdue } = event.resource;
    let classes: string[] = [];

    if (type === 'maintenance') {
      if (status === 'CANCELLED' || status === 'REFUSEE') classes.push('event-cancelled');
      else if (status === 'COMPLETED' || status === 'TERMINEE') classes.push('event-completed');
      else if (status === 'RDV_PRIS') classes.push('event-rdv');
      else if (status === 'EN_COURS') classes.push('event-en-cours');
      else if (event.resource.eventType === 'RETOUR_PREVU') classes.push('event-return');
      else if (event.resource.eventType === 'RAPPEL') classes.push('event-reminder');
      else classes.push('event-default');
    } else if (type === 'ct') {
      classes.push('event-ct');
    } else if (type === 'tachy') {
      classes.push('event-tachy');
    } else if (type === 'atp') {
      classes.push('event-atp');
    }

    if (urgent) classes.push('event-urgent');
    if (overdue) classes.push('event-overdue');

    return {
      className: classes.join(' '),
      style: {
        borderRadius: '8px',
        color: 'white',
        border: 'none',
        padding: '3px 8px',
        fontSize: '0.8rem',
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
        {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
          <Button
            key={v}
            variant={view === v ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(v)}
            className={
              view === v
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

  const CustomEvent = ({ event }: { event: CalendarEventForBigCalendar }) => {
    const { resource } = event;
    const isDeadline = resource.type !== 'maintenance';
    return (
      <div className="text-xs font-medium truncate flex items-center gap-1">
        {resource.urgent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />}
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  const EventDetailModal = () => {
    if (!selectedEvent) return null;
    const cfg = FILTER_CONFIG[selectedEvent.type as EventType];
    const Icon = cfg.icon;
    const daysLeft = selectedEvent.start
      ? differenceInDays(new Date(selectedEvent.start), new Date())
      : null;

    return (
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="bg-[#0f172a] border border-cyan-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${cfg.gradient} bg-opacity-20`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <span>{cfg.label}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Véhicule */}
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Véhicule</p>
              <p className="text-white font-bold text-lg">{selectedEvent.vehicleRegistration}</p>
              {selectedEvent.vehicleBrand && (
                <p className="text-slate-300 text-sm">
                  {selectedEvent.vehicleBrand} {selectedEvent.vehicleModel}
                </p>
              )}
              {selectedEvent.vehicleType && (
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">
                  {selectedEvent.vehicleType}
                </Badge>
              )}
            </div>

            {/* Dates */}
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Échéances</p>

              {selectedEvent.controlDate && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Dernier contrôle</span>
                  <span className="text-slate-200 text-sm font-medium">
                    {format(parseISO(selectedEvent.controlDate), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Expiration</span>
                <span className={`text-sm font-bold ${selectedEvent.overdue ? 'text-red-400' : selectedEvent.urgent ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {format(new Date(selectedEvent.start), 'dd/MM/yyyy', { locale: fr })}
                </span>
              </div>

              {daysLeft !== null && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  selectedEvent.overdue
                    ? 'bg-red-500/10 border border-red-500/20'
                    : selectedEvent.urgent
                    ? 'bg-orange-500/10 border border-orange-500/20'
                    : 'bg-emerald-500/10 border border-emerald-500/20'
                }`}>
                  {selectedEvent.overdue ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-semibold ${
                    selectedEvent.overdue ? 'text-red-400' : selectedEvent.urgent ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    {selectedEvent.overdue
                      ? `Expiré il y a ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`
                      : daysLeft === 0
                      ? "Expire aujourd'hui !"
                      : `J-${daysLeft}`}
                  </span>
                </div>
              )}
            </div>

            {/* Maintenance events specifics */}
            {selectedEvent.type === 'maintenance' && selectedEvent.garageName && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Garage</p>
                <p className="text-slate-200 text-sm font-medium">{selectedEvent.garageName}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {selectedEvent.type === 'maintenance' && selectedEvent.maintenanceId && (
                <Button asChild size="sm" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 border-none">
                  <Link href={`/maintenance/${selectedEvent.maintenanceId}`} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Voir l'intervention
                  </Link>
                </Button>
              )}
              {selectedEvent.vehicleId && (
                <Button asChild size="sm" variant="outline" className="flex-1 border-cyan-500/30 hover:bg-cyan-500/10">
                  <Link href={`/vehicles/${selectedEvent.vehicleId}`} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Voir le véhicule
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

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

  if (loading) {
    return (
      <div className="space-y-6 p-6 agenda-premium">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-slate-800/50" />
          <Skeleton className="h-10 w-32 bg-slate-800/50" />
        </div>
        <Skeleton className="h-16 w-full bg-slate-800/30 rounded-2xl" />
        <Skeleton className="h-[600px] bg-slate-800/30 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 agenda-premium">
      {/* Header */}
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
              Agenda & Échéances
            </span>
          </h1>
          <p className="text-slate-400 mt-2">
            Maintenances, contrôles techniques, tachygraphes et ATP
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

      {/* Filtres */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3 items-center"
      >
        <span className="flex items-center gap-1.5 text-slate-400 text-sm">
          <Filter className="h-4 w-4" />
          Filtres :
        </span>
        {(Object.entries(FILTER_CONFIG) as [EventType, typeof FILTER_CONFIG[EventType]][]).map(([type, cfg]) => {
          const Icon = cfg.icon;
          const active = activeFilters.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                active
                  ? `bg-gradient-to-r ${cfg.gradient} border-transparent text-white shadow-lg`
                  : `bg-slate-800/50 ${cfg.border} ${cfg.color} opacity-50 hover:opacity-75`
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-700'}`}>
                {countByType[type]}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Légende */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-3"
      >
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          RDV planifié
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          En cours
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Terminé
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Refusé / Annulé
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Urgent (J-7)
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          Rappel
        </div>
      </motion.div>

      {/* Calendrier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-sm" />

          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-cyan-500/10 shadow-2xl">
            <CardHeader className="border-b border-cyan-500/10">
              <CardTitle className="text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-cyan-400" />
                  Calendrier des interventions &amp; échéances
                </span>
                <span className="text-sm font-normal text-slate-400">
                  {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event: CalendarEventForBigCalendar) => setSelectedEvent(event.resource)}
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

      {/* Modale détail événement */}
      <EventDetailModal />
    </div>
  );
}
