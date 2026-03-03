'use client';

import { useState, useEffect } from 'react';
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
import { RouteStop } from '@/lib/schemas/routes';
import { Plus, MapPin, Loader2, Navigation, Zap, Clock, Warehouse } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { geocodeAddress, getDirections } from '@/lib/mapbox/geocoding';
import { MapboxMap } from '@/components/map/mapbox-map';
import { SortableStop } from './sortable-stop';
import { Badge } from '@/components/ui/badge';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface RoutePlannerProps {
  stops: RouteStop[];
  onStopsChange: (stops: RouteStop[]) => void;
  depot?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

export function RoutePlanner({ stops, onStopsChange, depot }: RoutePlannerProps) {
  const [newAddress, setNewAddress] = useState('');
  const [newTimeWindowStart, setNewTimeWindowStart] = useState('');
  const [newTimeWindowEnd, setNewTimeWindowEnd] = useState('');
  const [newDuration, setNewDuration] = useState(15);
  const [newPriority, setNewPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<Array<[number, number]>>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Update route line when stops change
  useEffect(() => {
    const updateRoute = async () => {
      const coords: Array<[number, number]> = [];
      
      // Ajouter le dépôt comme point de départ
      if (depot) {
        coords.push([depot.longitude, depot.latitude]);
      }
      
      // Ajouter les arrêts
      stops
        .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
        .forEach((s) => coords.push([s.longitude!, s.latitude!]));
      
      // Retour au dépôt
      if (depot && stops.length > 0) {
        coords.push([depot.longitude, depot.latitude]);
      }

      if (coords.length >= 2) {
        const directions = await getDirections(coords);
        if (directions) {
          setRouteGeometry(directions.geometry.coordinates);
          setRouteInfo({
            distance: directions.distance / 1000,
            duration: directions.duration / 60,
          });
        }
      } else {
        setRouteGeometry([]);
        setRouteInfo(null);
      }
    };

    updateRoute();
  }, [stops, depot]);

  const handleAddStop = async () => {
    if (!newAddress.trim()) return;

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(newAddress);
      if (!result) {
        alert('Adresse non trouvée');
        return;
      }

      const [lng, lat] = result.center;
      
      const newStop: RouteStop = {
        id: uuidv4(),
        address: result.place_name,
        latitude: lat,
        longitude: lng,
        orderIndex: stops.length,
        timeWindowStart: newTimeWindowStart || undefined,
        timeWindowEnd: newTimeWindowEnd || undefined,
        serviceDuration: newDuration,
        priority: newPriority,
      };

      onStopsChange([...stops, newStop]);
      
      // Reset form
      setNewAddress('');
      setNewTimeWindowStart('');
      setNewTimeWindowEnd('');
      setNewDuration(15);
      setNewPriority('NORMAL');
    } catch (error) {
      console.error('Erreur géocodage:', error);
      alert('Erreur lors du géocodage');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleRemoveStop = (id: string) => {
    onStopsChange(stops.filter(s => s.id !== id).map((s, idx) => ({ ...s, orderIndex: idx })));
  };

  const handleUpdateStop = (id: string, updates: Partial<RouteStop>) => {
    onStopsChange(stops.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex(s => s.id === active.id);
      const newIndex = stops.findIndex(s => s.id === over.id);
      const newStops = arrayMove(stops, oldIndex, newIndex);
      onStopsChange(newStops.map((s, idx) => ({ ...s, orderIndex: idx })));
    }
  };

  // Prepare markers for map
  const markers = stops
    .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
    .map((s, index) => ({
      id: s.id!,
      lng: s.longitude!,
      lat: s.latitude!,
      label: `${index + 1}. ${s.address}`,
    }));

  const mapCenter: [number, number] = depot 
    ? [depot.longitude, depot.latitude]
    : markers.length > 0 
      ? [markers[0].lng, markers[0].lat]
      : [2.3522, 48.8566];

  return (
    <div className="space-y-4">
      {/* Carte avec dépôt */}
      <Card>
        <CardContent className="p-0 relative">
          <MapboxMap
            center={mapCenter}
            zoom={12}
            markers={markers}
            route={routeGeometry}
            height="400px"
          />
          {depot && (
            <div className="absolute top-4 left-4 bg-white dark:bg-gray-900 p-2 rounded-lg shadow-lg border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{depot.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{depot.address}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {routeInfo && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Navigation className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Distance totale</p>
                <p className="text-lg font-bold">{routeInfo.distance.toFixed(1)} km</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Durée trajet</p>
                <p className="text-lg font-bold">{Math.round(routeInfo.duration)} min</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ajouter un arrêt avec contraintes horaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Ajouter une destination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Adresse *</Label>
            <div className="flex gap-2">
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Rechercher une adresse..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
              />
              <Button onClick={handleAddStop} disabled={isGeocoding || !newAddress.trim()}>
                {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Contraintes horaires */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                Créneau obligatoire
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="time" value={newTimeWindowStart} onChange={(e) => setNewTimeWindowStart(e.target.value)} />
                <span className="text-muted-foreground">→</span>
                <Input type="time" value={newTimeWindowEnd} onChange={(e) => setNewTimeWindowEnd(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Le chauffeur arrivera dans ce créneau
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Durée sur place (min)</Label>
                <Input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value) || 15)}
                  min={5}
                  max={120}
                />
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="NORMAL">Normale</SelectItem>
                    <SelectItem value="HIGH">Haute (urgente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des arrêts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Destinations ({stops.length})</CardTitle>
            <p className="text-xs text-muted-foreground">
              Glissez-déposez pour réordonner ou définissez des créneaux horaires
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {stops.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune destination</p>
              <p className="text-sm">Ajoutez votre première destination ci-dessus</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stops.map(s => s.id!)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {stops.map((stop, index) => (
                    <SortableStop
                      key={stop.id}
                      stop={{
                        id: stop.id!,
                        address: stop.address,
                        latitude: stop.latitude,
                        longitude: stop.longitude,
                        timeWindowStart: stop.timeWindowStart,
                        timeWindowEnd: stop.timeWindowEnd,
                        serviceDuration: stop.serviceDuration,
                        priority: stop.priority,
                      }}
                      index={index}
                      onUpdate={handleUpdateStop}
                      onRemove={handleRemoveStop}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
