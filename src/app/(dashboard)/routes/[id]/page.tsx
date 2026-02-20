'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Play, CheckCircle2, XCircle, MapPin, Clock, Route,
  Car, User, Calendar, Fuel, Navigation, Phone, Edit2, Save, 
  AlertTriangle, Coffee, Gauge, Timer, TrendingUp, Package, ChevronRight
} from 'lucide-react';
import { useRoute, useStartRoute, useCompleteRoute, useUpdateRoute } from '@/hooks/use-routes';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapboxMap } from '@/components/map/mapbox-map';
import { getDirections } from '@/lib/mapbox/geocoding';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { calculateAverageSpeed, isHeavyVehicle } from '@/lib/routing/vehicle-speeds';
import { formatDuration } from '@/lib/routing/rse-regulations';

const statusConfig = {
  PLANNED: { 
    label: 'Planifiée', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    icon: Calendar,
    action: 'Démarrer'
  },
  IN_PROGRESS: { 
    label: 'En cours', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    gradient: 'from-amber-500/20 to-orange-500/20',
    icon: Play,
    action: 'Terminer'
  },
  COMPLETED: { 
    label: 'Terminée', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    icon: CheckCircle2,
    action: null
  },
  CANCELLED: { 
    label: 'Annulée', 
    color: 'bg-red-500/10 text-red-600 border-red-200',
    gradient: 'from-red-500/20 to-rose-500/20',
    icon: XCircle,
    action: null
  },
};

// Priority config
const priorityConfig = {
  1: { label: 'Basse', color: 'bg-slate-100 text-slate-600' },
  2: { label: 'Normale', color: 'bg-blue-100 text-blue-600' },
  3: { label: 'Haute', color: 'bg-red-100 text-red-600' },
};

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data: route, isLoading } = useRoute(id);
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const startMutation = useStartRoute();
  const completeMutation = useCompleteRoute();
  const updateMutation = useUpdateRoute();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [routeGeometry, setRouteGeometry] = useState<Array<[number, number]>>([]);

  // Calculer le trajet sur la carte
  useEffect(() => {
    if ((route as any)?.route_stops?.length > 0) {
      const stops = (route as any).route_stops;
      const coords: Array<[number, number]> = stops
        .filter((s: any) => s.latitude && s.longitude)
        .map((s: any) => [s.longitude, s.latitude]);
      
      if (coords.length >= 2) {
        getDirections(coords).then(directions => {
          if (directions) setRouteGeometry(directions.geometry.coordinates);
        });
      }
    }
  }, [route]);

  // Calculer les heures d'arrivée estimées
  const estimatedArrivals = useMemo(() => {
    if (!(route as any)?.route_stops?.length) return [];
    
    const stops = (route as any).route_stops;
    const startTime = (route as any).started_at 
      ? format(parseISO((route as any).started_at), 'HH:mm')
      : '08:00';
    
    let currentMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const vehicleCategory = (route as any).vehicles?.category || 'UTILITAIRE_MOYEN';
    const avgSpeed = calculateAverageSpeed(vehicleCategory);
    
    return stops.map((stop: any, index: number) => {
      const prevStop = index > 0 ? stops[index - 1] : null;
      const distance = prevStop 
        ? calculateDistance(prevStop.latitude, prevStop.longitude, stop.latitude, stop.longitude)
        : 0;
      
      const travelMinutes = distance > 0 ? Math.round((distance / avgSpeed) * 60) : 0;
      currentMinutes += travelMinutes;
      
      const arrivalTime = formatTime(currentMinutes);
      
      // Vérifier créneau
      let isOnTime = true;
      let waitTime = 0;
      if (stop.time_window_start) {
        const windowStart = parseTime(stop.time_window_start);
        if (currentMinutes < windowStart) {
          waitTime = windowStart - currentMinutes;
          currentMinutes = windowStart;
          isOnTime = true;
        } else if (stop.time_window_end) {
          const windowEnd = parseTime(stop.time_window_end);
          isOnTime = currentMinutes <= windowEnd;
        }
      }
      
      const departureMinutes = currentMinutes + (stop.service_duration || 15);
      
      return {
        ...stop,
        arrivalTime,
        departureTime: formatTime(departureMinutes),
        isOnTime,
        waitTime,
        travelMinutes,
      };
    });
  }, [route]);

  // Calculer stats RSE
  const rseStats = useMemo(() => {
    if (!(route as any)?.route_stops?.length) return null;
    const vehicleCategory = (route as any).vehicles?.category || 'UTILITAIRE_MOYEN';
    const heavy = isHeavyVehicle(vehicleCategory);
    
    if (!heavy) return null;
    
    const totalDriving = estimatedArrivals.reduce((sum: number, stop: any, idx: number) => {
      return sum + (stop.travelMinutes || 0);
    }, 0);
    
    const needsBreak = totalDriving > 270;
    
    return {
      totalDriving,
      needsBreak,
      breakAfter: needsBreak ? estimatedArrivals.find((s: any, i: number) => {
        const accumulated = estimatedArrivals.slice(0, i + 1).reduce((sum: number, stop: any) => sum + (stop.travelMinutes || 0), 0);
        return accumulated >= 270;
      }) : null,
    };
  }, [route, estimatedArrivals]);

  if (isLoading) {
    return <RouteDetailSkeleton />;
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <MapPin className="w-12 h-12 text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold">Tournée non trouvée</h1>
        <p className="text-slate-500 mt-2">La tournée demandée n&apos;existe pas ou a été supprimée.</p>
        <Button asChild className="mt-6">
          <Link href="/routes">Retour aux tournées</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[(route as any).status as keyof typeof statusConfig];
  const StatusIcon = status.icon;

  const handleAction = () => {
    if ((route as any).status === 'PLANNED') {
      startMutation.mutate(id);
    } else if ((route as any).status === 'IN_PROGRESS') {
      completeMutation.mutate(id);
    }
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id,
      ...editData,
    });
    setIsEditing(false);
    toast.success('Tournée mise à jour');
  };

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6"
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className={`absolute inset-0 bg-gradient-to-br ${status.gradient} opacity-30`} />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10" asChild>
                <Link href="/routes">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold">
                    {(route as any).name}
                  </h1>
                  <Badge className={`${status.color} border`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-white/70 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO((route as any).route_date), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(parseISO((route as any).route_date), 'EEEE', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  {status.action && (
                    <Button 
                      onClick={handleAction}
                      disabled={startMutation.isPending || completeMutation.isPending}
                      className={(route as any).status === 'PLANNED' 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }
                    >
                      {(route as any).status === 'PLANNED' ? (
                        <><Play className="h-4 w-4 mr-2" /> Démarrer</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" /> Terminer</>
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => {
                      setEditData({
                        name: (route as any).name,
                        vehicleId: (route as any).vehicle_id,
                        driverId: (route as any).driver_id,
                        notes: (route as any).notes,
                      });
                      setIsEditing(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mode Édition */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-amber-600" />
                  Modifier la tournée
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom</Label>
                  <Input 
                    value={editData?.name || ''} 
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Véhicule</Label>
                  <Select 
                    value={editData?.vehicleId} 
                    onValueChange={(v) => setEditData({ ...editData, vehicleId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registration_number} - {v.brand} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chauffeur</Label>
                  <Select 
                    value={editData?.driverId} 
                    onValueChange={(v) => setEditData({ ...editData, driverId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {((drivers as unknown) as any[])?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.first_name} {d.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input 
                    value={editData?.notes || ''} 
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Car}
          label="Véhicule"
          value={(route as any).vehicles?.registration_number || '-'}
          subValue={(route as any).vehicles ? `${(route as any).vehicles.brand} ${(route as any).vehicles.model}` : undefined}
          href={(route as any).vehicles ? `/vehicles/${(route as any).vehicle_id}` : undefined}
          color="blue"
        />
        <StatCard
          icon={User}
          label="Chauffeur"
          value={(route as any).drivers ? `${(route as any).drivers.first_name} ${(route as any).drivers.last_name}` : '-'}
          subValue={(route as any).drivers?.cqc_card ? 'CQC ✓' : undefined}
          href={(route as any).drivers ? `/drivers/${(route as any).driver_id}` : undefined}
          color="emerald"
        />
        <StatCard
          icon={Route}
          label="Distance"
          value={(route as any).total_distance ? `${(route as any).total_distance} km` : '-'}
          subValue={(route as any).total_distance ? `~${Math.round(((route as any).total_distance / 100) * 25)}€ carburant` : undefined}
          color="purple"
        />
        <StatCard
          icon={Timer}
          label="Durée estimée"
          value={(route as any).estimated_duration 
            ? `${Math.floor((route as any).estimated_duration / 60)}h${(route as any).estimated_duration % 60}min`
            : '-'
          }
          subValue={rseStats?.needsBreak ? '⚠️ Pause RSE requise' : undefined}
          color="amber"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Carte */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-500" />
              Itinéraire
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px]">
              <MapboxMap
                center={(route as any).route_stops?.[0] 
                  ? [(route as any).route_stops[0].longitude, (route as any).route_stops[0].latitude]
                  : [2.3522, 48.8566]
                }
                zoom={12}
                markers={(route as any).route_stops?.map((s: any, i: number) => ({
                  id: s.id,
                  lng: s.longitude,
                  lat: s.latitude,
                  label: `${i + 1}. ${s.address}`,
                })) || []}
                route={routeGeometry}
                height="400px"
              />
            </div>
          </CardContent>
        </Card>

        {/* Timeline des arrêts */}
        <Card>
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Timeline des arrêts
              </span>
              <Badge variant="secondary">{(route as any).route_stops?.length || 0} stops</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              {estimatedArrivals.map((stop: any, index: number) => (
                <motion.div
                  key={stop.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Ligne de connexion */}
                  {index < estimatedArrivals.length - 1 && (
                    <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-slate-200" />
                  )}
                  
                  <div className="flex gap-4">
                    {/* Numéro */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      stop.priority === 3 ? 'bg-red-500' : stop.priority === 1 ? 'bg-slate-400' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium truncate">{stop.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={priorityConfig[stop.priority as keyof typeof priorityConfig]?.color || priorityConfig[2].color}>
                              {priorityConfig[stop.priority as keyof typeof priorityConfig]?.label || 'Normale'}
                            </Badge>
                            {stop.time_window_start && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {stop.time_window_start} - {stop.time_window_end}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Heures */}
                        <div className="text-right">
                          <div className={`text-lg font-bold ${!stop.isOnTime ? 'text-red-500' : 'text-green-600'}`}>
                            {stop.arrivalTime}
                          </div>
                          <div className="text-xs text-slate-500">
                            → {stop.departureTime}
                          </div>
                          {stop.waitTime > 0 && (
                            <div className="text-xs text-amber-600">
                              +{stop.waitTime}min attente
                            </div>
                          )}
                          {!stop.isOnTime && (
                            <div className="text-xs text-red-500 font-medium">
                              En retard
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Détails */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {stop.service_duration}min sur place
                        </span>
                        {stop.travelMinutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {stop.travelMinutes}min trajet
                          </span>
                        )}
                      </div>
                      
                      {/* Alertes RSE */}
                      {rseStats?.breakAfter?.id === stop.id && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
                          <Coffee className="h-4 w-4" />
                          <span>Pause RSE obligatoire (45min après 4h30 de conduite)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RSE Card pour PL */}
      {rseStats && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coffee className="h-5 w-5 text-amber-500" />
              Conformité RSE (Poids Lourd)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-slate-700">
                  {formatDuration(rseStats.totalDriving * 60)}
                </p>
                <p className="text-sm text-slate-500">Conduite totale</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-slate-700">
                  {Math.max(0, 270 - rseStats.totalDriving)}min
                </p>
                <p className="text-sm text-slate-500">Avant pause obligatoire</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className={`text-2xl font-bold ${rseStats.needsBreak ? 'text-amber-600' : 'text-green-600'}`}>
                  {rseStats.needsBreak ? '⚠️ Requise' : '✓ OK'}
                </p>
                <p className="text-sm text-slate-500">Pause RSE</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(route as any).notes && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 whitespace-pre-wrap">{(route as any).notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Composant StatCard
function StatCard({ icon: Icon, label, value, subValue, href, color }: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  href?: string;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  const content = (
    <Card className={`${colors[color]} border transition-all hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white/50`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm opacity-80">{label}</p>
            <p className="font-bold truncate">{value}</p>
            {subValue && (
              <p className="text-xs opacity-70 mt-0.5">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Helpers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function RouteDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
