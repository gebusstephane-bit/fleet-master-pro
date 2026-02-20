'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, MapPin, 
  Clock, ChevronRight
} from 'lucide-react';
import { useRoute, useUpdateRoute } from '@/hooks/use-routes';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { geocodeAddress } from '@/lib/mapbox/geocoding';
import { v4 as uuidv4 } from 'uuid';
import { MapboxMap } from '@/components/map/mapbox-map';
import { getDirections } from '@/lib/mapbox/geocoding';

interface Stop {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  serviceDuration: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  notes?: string;
}

export default function EditRoutePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data: route, isLoading } = useRoute(id);
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const updateMutation = useUpdateRoute();

  const [name, setName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<Array<[number, number]>>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [newAddress, setNewAddress] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Charger les données
  useEffect(() => {
    if (route) {
      setName((route as any).name);
      setVehicleId((route as any).vehicle_id || '');
      setDriverId((route as any).driver_id || '');
      setNotes((route as any).notes || '');
      setStops(((route as any).route_stops as any[])?.map((s: any) => ({
        id: s.id,
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        orderIndex: s.order_index,
        timeWindowStart: s.time_window_start,
        timeWindowEnd: s.time_window_end,
        serviceDuration: s.service_duration,
        priority: ['LOW', 'NORMAL', 'HIGH'][s.priority - 1] as any || 'NORMAL',
        notes: s.notes,
      })) || []);
    }
  }, [route]);

  // Calculer le trajet
  useEffect(() => {
    if (stops.length >= 2) {
      const coords = stops.map(s => [s.longitude, s.latitude] as [number, number]);
      getDirections(coords).then(directions => {
        if (directions) setRouteGeometry(directions.geometry.coordinates);
      });
    }
  }, [stops]);

  const handleAddStop = async () => {
    if (!newAddress.trim()) return;
    setIsGeocoding(true);
    
    try {
      const result = await geocodeAddress(newAddress);
      if (result) {
        const [lng, lat] = result.center;
        setStops([...stops, {
          id: uuidv4(),
          address: result.place_name,
          latitude: lat,
          longitude: lng,
          orderIndex: stops.length,
          serviceDuration: 15,
          priority: 'NORMAL',
        }]);
        setNewAddress('');
      }
    } catch (error) {
      toast.error('Erreur de géocodage');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(s => s.id !== id).map((s, idx) => ({ ...s, orderIndex: idx })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex(s => s.id === active.id);
      const newIndex = stops.findIndex(s => s.id === over.id);
      setStops(arrayMove(stops, oldIndex, newIndex).map((s, idx) => ({ ...s, orderIndex: idx })));
    }
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id,
      name,
      vehicleId,
      driverId,
      notes,
      stops: (stops as any[]).map((s, index) => ({
        ...s,
        orderIndex: index,
        priority: s.priority === 'HIGH' ? 3 : s.priority === 'LOW' ? 1 : 2,
      })),
    });
    router.push(`/routes/${id}`);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/routes/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Modifier la tournée</h1>
            <p className="text-slate-500">{(route as any)?.name}</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Formulaire */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom de la tournée</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Véhicule</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
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
                  <Select value={driverId} onValueChange={setDriverId}>
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
              </div>
              <div>
                <Label>Notes</Label>
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions particulières..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Gestion des arrêts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Arrêts ({stops.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ajouter un arrêt */}
              <div className="flex gap-2">
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Ajouter une adresse..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                />
                <Button onClick={handleAddStop} disabled={isGeocoding}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Liste des arrêts */}
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={stops.map(s => s.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {stops.map((stop, index) => (
                      <SortableStopItem
                        key={stop.id}
                        stop={stop}
                        index={index}
                        onUpdate={(id, updates) => 
                          setStops(stops.map(s => s.id === id ? { ...s, ...updates } : s))
                        }
                        onRemove={handleRemoveStop}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite - Carte */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Aperçu du trajet</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px]">
                <MapboxMap
                  center={stops[0] ? [stops[0].longitude, stops[0].latitude] : [2.3522, 48.8566]}
                  zoom={12}
                  markers={stops.map((s, i) => ({
                    id: s.id,
                    lng: s.longitude,
                    lat: s.latitude,
                    label: `${i + 1}. ${s.address}`,
                  }))}
                  route={routeGeometry}
                  height="400px"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Composant SortableStopItem
function SortableStopItem({ 
  stop, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  stop: Stop; 
  index: number; 
  onUpdate: (id: string, updates: Partial<Stop>) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`
        group flex flex-col gap-2 p-3 bg-card border rounded-lg
        ${isDragging ? 'shadow-lg ring-2 ring-primary' : 'hover:border-primary/50'}
        transition-all
      `}
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="p-1 hover:bg-muted rounded cursor-grab">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold
          ${stop.priority === 'HIGH' ? 'bg-red-500' : stop.priority === 'LOW' ? 'bg-slate-400' : 'bg-blue-500'}
        `}>
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <Input 
            value={stop.address} 
            onChange={(e) => onUpdate(stop.id, { address: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => onRemove(stop.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      
      {/* Détails */}
      <div className="grid grid-cols-3 gap-2 pl-8">
        <div>
          <Label className="text-xs text-muted-foreground">Créneau début</Label>
          <Input 
            type="time"
            value={stop.timeWindowStart || ''} 
            onChange={(e) => onUpdate(stop.id, { timeWindowStart: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Créneau fin</Label>
          <Input 
            type="time"
            value={stop.timeWindowEnd || ''} 
            onChange={(e) => onUpdate(stop.id, { timeWindowEnd: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Durée (min)</Label>
          <Input 
            type="number"
            value={stop.serviceDuration} 
            onChange={(e) => onUpdate(stop.id, { serviceDuration: parseInt(e.target.value) || 15 })}
            className="h-8 text-xs"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 pl-8">
        <Label className="text-xs text-muted-foreground">Priorité:</Label>
        <select
          value={stop.priority}
          onChange={(e) => onUpdate(stop.id, { priority: e.target.value as any })}
          className="h-8 text-xs rounded border border-input bg-background px-2"
        >
          <option value="LOW">Basse</option>
          <option value="NORMAL">Normale</option>
          <option value="HIGH">Haute</option>
        </select>
      </div>
    </motion.div>
  );
}
