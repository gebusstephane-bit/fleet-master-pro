'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/(dashboard)/detail-pages-premium.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { useCreateRoute } from '@/hooks/use-routes';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';
import { RoutePlanner } from '@/components/routes/route-planner';
import { RouteConstraintsForm } from '@/components/routes/route-constraints-form';
import { AssignmentSuggestions } from '@/components/routes/assignment-suggestions';
import { RSETimeline } from '@/components/routes/rse-timeline';
import { DepotConfig } from '@/components/routes/depot-config';
import { RouteStop } from '@/lib/schemas/routes';
import { optimizeRouteV3, OptimizedRoute, formatDuration, estimateFuelCost, isHeavyVehicle, calculateAverageSpeed } from '@/lib/routing/route-optimizer';
import { RouteConstraints, DEFAULT_CONSTRAINTS } from '@/lib/routing/constraints';
import { getSpeedDetails } from '@/lib/routing/vehicle-speeds';
import { toast } from 'sonner';
import { Zap, Save, Clock, Route, AlertTriangle, Check, Gauge, Truck, Coffee, Navigation, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NewRoutePage() {
  const router = useRouter();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const createMutation = useCreateRoute();

  // Dépôt configurable
  const [depot, setDepot] = useState({
    name: 'Dépôt principal',
    address: 'Paris, France',
    latitude: 48.8566,
    longitude: 2.3522,
  });

  // États de base
  const [name, setName] = useState('');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [notes, setNotes] = useState('');
  
  // Contraintes
  const [constraints, setConstraints] = useState<RouteConstraints>(DEFAULT_CONSTRAINTS);
  const [optimizationResult, setOptimizationResult] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const selectedVehicle = ((vehicles as unknown) as any[])?.find((v: any) => v.id === vehicleId);
  const selectedDriver = ((drivers as unknown) as any[])?.find((d: any) => d.id === driverId);
  
  const vehicleCategory = (selectedVehicle as any)?.category || 'UTILITAIRE_MOYEN';
  const vehicleSpeedInfo = getSpeedDetails(vehicleCategory);
  const isHeavy = isHeavyVehicle(vehicleCategory);

  // Recalculer l'optimisation
  useEffect(() => {
    if (stops.length >= 2 && selectedVehicle) {
      const stopsForOpt = stops
        .filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number')
        .map(s => ({
          id: s.id || '',
          latitude: s.latitude!,
          longitude: s.longitude!,
          address: s.address,
          serviceDuration: s.serviceDuration,
          priority: s.priority,
          timeWindowStart: s.timeWindowStart,
          timeWindowEnd: s.timeWindowEnd,
        }));

      if (stopsForOpt.length >= 2) {
        const result = optimizeRouteV3(stopsForOpt, depot, constraints, vehicleCategory);
        setOptimizationResult(result);
        
        // Mettre à jour l'ordre des stops
        if (result.stops.length > 0) {
          setStops(prev => {
            const orderedStops = result.stops.map((optStop, index) => {
              const originalStop = prev.find(s => s.id === optStop.id);
              return originalStop ? { ...originalStop, orderIndex: index } : null;
            }).filter(Boolean) as RouteStop[];
            return orderedStops.length === prev.length ? orderedStops : prev;
          });
        }
      }
    } else {
      setOptimizationResult(null);
    }
  }, [stops.map(s => `${s.id}-${s.latitude}-${s.longitude}-${s.timeWindowStart}`).join(','), constraints, vehicleCategory, depot.latitude, depot.longitude]);

  const handleOptimize = useCallback(() => {
    if (stops.length < 2) {
      toast.error('Ajoutez au moins 2 arrêts');
      return;
    }
    if (!selectedVehicle) {
      toast.error('Sélectionnez un véhicule');
      return;
    }

    setIsOptimizing(true);
    
    const stopsForOpt = stops
      .filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map(s => ({
        id: s.id || '',
        latitude: s.latitude!,
        longitude: s.longitude!,
        address: s.address,
        serviceDuration: s.serviceDuration,
        priority: s.priority,
        timeWindowStart: s.timeWindowStart,
        timeWindowEnd: s.timeWindowEnd,
      }));

    const result = optimizeRouteV3(stopsForOpt, depot, constraints, vehicleCategory);
    setOptimizationResult(result);
    
    if (result.stops.length > 0) {
      setStops(prev => {
        const orderedStops = result.stops.map((optStop, index) => {
          const originalStop = prev.find(s => s.id === optStop.id);
          return originalStop ? { ...originalStop, orderIndex: index } : null;
        }).filter(Boolean) as RouteStop[];
        return orderedStops.length === prev.length ? orderedStops : prev;
      });
    }

    if (result.feasible) {
      toast.success(`Optimisé ! Score: ${result.score}/100`);
    } else {
      toast.warning(`${result.violations.length} contrainte(s) non respectée(s)`);
    }
    
    setIsOptimizing(false);
  }, [stops, constraints, vehicleCategory, selectedVehicle, depot]);

  const handleSave = async () => {
    if (!name || !vehicleId || !driverId || stops.length === 0) {
      toast.error('Champs obligatoires manquants');
      return;
    }

    if (optimizationResult && !optimizationResult.feasible) {
      toast.error(`Contraintes: ${optimizationResult.violations.join(', ')}`);
      return;
    }

    const stats = optimizationResult ? {
      totalDistance: optimizationResult.totalDistanceKm,
      estimatedDuration: optimizationResult.totalDurationMinutes,
      fuelCost: estimateFuelCost(optimizationResult.totalDistanceKm, vehicleCategory),
    } : {
      totalDistance: 0,
      estimatedDuration: 0,
      fuelCost: 0,
    };

    const routeData = {
      name,
      routeDate: routeDate, // Format YYYY-MM-DD
      vehicleId,
      driverId,
      stops: stops.map((stop, index) => ({ 
        ...stop, 
        orderIndex: index,
        // Assurer que les valeurs par défaut sont définies
        serviceDuration: stop.serviceDuration || 15,
        priority: stop.priority || 'NORMAL',
      })),
      totalDistance: stats.totalDistance,
      estimatedDuration: stats.estimatedDuration,
      fuelCost: stats.fuelCost,
      notes: notes + (optimizationResult ? `\nScore: ${optimizationResult.score}/100\nDépôt: ${depot.address}` : ''),
      status: 'PLANNED' as const,
    };

    console.log('Sending route data:', routeData);
    await createMutation.mutateAsync(routeData);

    toast.success('✅ Tournée créée avec succès !');
    router.push('/routes');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Nouvelle tournée optimisée"
          description="Planification intelligente avec contraintes horaires"
          backHref="/routes"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleOptimize}
            disabled={stops.length < 2 || isOptimizing || !selectedVehicle}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            {isOptimizing ? 'Optimisation...' : 'Optimiser'}
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Configuration dépôt */}
      <DepotConfig depot={depot} onChange={setDepot} />

      {/* Info véhicule */}
      {selectedVehicle && (
        <Card className={isHeavy ? 'border-amber-500/50 bg-amber-50/30' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isHeavy ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{selectedVehicle.registration_number} • {selectedVehicle.brand} {selectedVehicle.model}</p>
                  <p className="text-sm text-muted-foreground">{vehicleSpeedInfo.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{vehicleSpeedInfo.average} km/h</span>
                </div>
                <p className="text-xs text-muted-foreground">Autoroute: {vehicleSpeedInfo.highway} km/h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes */}
      {optimizationResult && !optimizationResult.feasible && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Contraintes non respectées</p>
              <ul className="text-sm text-destructive/90 mt-1 space-y-1">
                {optimizationResult.violations.map((v, i) => (
                  <li key={i}>• {v}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {optimizationResult?.feasible && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-green-700">Tournée optimisée</p>
            <p className="text-sm text-green-600">
              Score: {optimizationResult.score}/100 • {optimizationResult.totalDistanceKm}km • 
              Départ: {optimizationResult.startTime} • Retour: {optimizationResult.endTime}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tournée Nord" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions..." />
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {vehicles && drivers && stops.length >= 2 && (
            <AssignmentSuggestions
              vehicles={vehicles}
              drivers={drivers as any}
              stops={stops}
              constraints={constraints}
              depot={{ latitude: depot.latitude, longitude: depot.longitude }}
              onSelect={(vId, dId) => { setVehicleId(vId); setDriverId(dId); toast.success('Affectation appliquée'); }}
              selectedVehicleId={vehicleId}
              selectedDriverId={driverId}
            />
          )}

          {/* Sélection */}
          <Card>
            <CardHeader>
              <CardTitle>Affectation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Véhicule *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {isHeavyVehicle(v.category) && <span className="text-amber-500 mr-1">⚠</span>}
                        {v.registration_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chauffeur *</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {((drivers as unknown) as any[])?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* RSE */}
          {optimizationResult?.isHeavyVehicle && optimizationResult.rseCompliance && (
            <RSETimeline rseResult={optimizationResult.rseCompliance} isHeavyVehicle={optimizationResult.isHeavyVehicle} />
          )}

          {/* Contraintes */}
          <RouteConstraintsForm constraints={constraints} onChange={setConstraints} violations={optimizationResult?.violations} />

          {/* Stats */}
          {optimizationResult && (
            <Card>
              <CardHeader><CardTitle className="text-base">Statistiques</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Route className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{optimizationResult.totalDistanceKm}</p>
                    <p className="text-xs text-muted-foreground">km</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">
                      {Math.floor(optimizationResult.totalDurationMinutes / 60)}h{optimizationResult.totalDurationMinutes % 60}
                    </p>
                    <p className="text-xs text-muted-foreground">durée</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Départ:</span>
                    <span className="font-medium">{optimizationResult.startTime} ({depot.name})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retour:</span>
                    <span className="font-medium">{optimizationResult.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score:</span>
                    <Badge variant={optimizationResult.score > 70 ? 'default' : 'secondary'}>{optimizationResult.score}/100</Badge>
                  </div>
                </div>

                {/* Arrivées avec contraintes horaires */}
                {optimizationResult.estimatedArrivals.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Arrivées estimées:</p>
                    <div className="space-y-1 text-xs">
                      {optimizationResult.estimatedArrivals.slice(0, 6).map((arr, i) => {
                        const stop = optimizationResult.stops[i];
                        const hasTimeWindow = stop?.timeWindowStart || stop?.timeWindowEnd;
                        const isLate = !arr.isOnTime;
                        
                        return (
                          <div key={arr.stopId} className={`flex justify-between p-1 rounded ${isLate ? 'bg-red-50' : arr.waitTime > 0 ? 'bg-amber-50' : ''}`}>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{i + 1}.</span>
                              {hasTimeWindow && <Clock className="w-3 h-3 text-primary" />}
                              <span className="truncate max-w-[100px]">{stop?.address?.split(',')[0]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{arr.arrivalTime}</span>
                              {arr.waitTime > 0 && (
                                <span className="text-amber-600">(+{arr.waitTime}min attente)</span>
                              )}
                              {isLate && <span className="text-red-600 text-xs">RETARD</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Planificateur */}
        <div className="lg:col-span-8">
          <RoutePlanner stops={stops} onStopsChange={setStops} depot={depot} />
        </div>
      </div>
    </div>
  );
}
