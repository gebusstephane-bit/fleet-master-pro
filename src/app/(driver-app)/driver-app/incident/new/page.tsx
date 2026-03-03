'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle,
  Loader2,
  Wrench,
  Car,
  AlertOctagon,
  Flame,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createIncident } from '@/actions/incidents';
import { cn } from '@/lib/utils';

// ============================================================================
// PAGE RAPPORT D'INCIDENT — MOBILE-FIRST
// ============================================================================

interface Vehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

const INCIDENT_TYPES = [
  { value: 'accident_matériel', label: 'Accident',    icon: Car,          color: 'text-red-500',    bg: 'bg-red-500/20',    border: 'border-red-500/50' },
  { value: 'panne_grave',       label: 'Panne',       icon: Wrench,       color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { value: 'accident_matériel', label: 'Accrochage',  icon: AlertTriangle,color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  { value: 'incendie',          label: 'Incendie',    icon: Flame,        color: 'text-red-600',    bg: 'bg-red-600/20',    border: 'border-red-600/50' },
  { value: 'autre',             label: 'Autre',       icon: AlertOctagon, color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/30' },
] as const;

// Mapping label → type schema
const LABEL_TO_TYPE: Record<string, string> = {
  'Accident':   'accident_matériel',
  'Panne':      'panne_grave',
  'Accrochage': 'accident_matériel',
  'Incendie':   'incendie',
  'Autre':      'autre',
};

export default function NewIncidentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);

  // Champs du formulaire
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedTypeLabel, setSelectedTypeLabel] = useState('');
  const [incidentDate, setIncidentDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // format datetime-local
  });
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Charger les véhicules du chauffeur
  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Récupérer le conducteur
        const { data: driver } = await supabase
          .from('drivers')
          .select('id, current_vehicle_id, company_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!driver) {
          toast.error('Profil conducteur non trouvé');
          router.push('/driver-app');
          return;
        }

        setDriverId(driver.id);

        // Ses véhicules : véhicule assigné uniquement (ou tous ceux de son historique si besoin)
        if (driver.current_vehicle_id) {
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('id, registration_number, brand, model')
            .eq('id', driver.current_vehicle_id)
            .maybeSingle();

          if (vehicle) {
            setVehicles([vehicle]);
            setSelectedVehicleId(vehicle.id);
          }
        }
      } catch {
        toast.error('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationText(`Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`);
        toast.success('Position récupérée');
        setGettingLocation(false);
      },
      () => {
        toast.error('Impossible de récupérer la position');
        setGettingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicleId) { toast.error('Sélectionnez un véhicule'); return; }
    if (!selectedTypeLabel) { toast.error('Sélectionnez un type d\'incident'); return; }
    if (description.trim().length < 20) { toast.error('La description doit faire au moins 20 caractères'); return; }

    setSubmitting(true);
    try {
      const incidentType = LABEL_TO_TYPE[selectedTypeLabel] || 'autre';

      const result = await createIncident({
        vehicle_id: selectedVehicleId,
        driver_id: driverId ?? undefined,
        incident_date: new Date(incidentDate).toISOString(),
        incident_type: incidentType as any,
        circumstances: description,
        location_description: locationText || null,
        status: 'ouvert',
        claim_status: 'non_declaré',
        third_party_involved: false,
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la soumission');
        return;
      }

      // Upload photo si présente
      if (photoFile && result.data) {
        try {
          const supabase = getSupabaseClient();
          const ext = photoFile.name.split('.').pop();
          const path = `incidents/${(result.data as any).id}/photo.${ext}`;
          await supabase.storage.from('incident-documents').upload(path, photoFile);
        } catch {
          // Photo non critique — on continue
        }
      }

      toast.success('Incident signalé avec succès');
      router.push('/driver-app');
    } catch (err: any) {
      toast.error(err.message || 'Erreur inattendue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const descriptionValid = description.trim().length >= 20;
  const canSubmit = selectedVehicleId && selectedTypeLabel && descriptionValid;

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" asChild>
          <Link href="/driver-app">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">Signaler un incident</h1>
          <p className="text-xs text-slate-400">Rapport visible par votre gestionnaire</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Sélection véhicule */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Véhicule concerné</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vehicles.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">Aucun véhicule assigné</p>
            ) : (
              vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left min-h-[56px]',
                    selectedVehicleId === v.id
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-slate-900/50 border-slate-700'
                  )}
                >
                  <Car className={cn('h-5 w-5 shrink-0', selectedVehicleId === v.id ? 'text-blue-400' : 'text-slate-400')} />
                  <div>
                    <p className="font-semibold text-white">{v.registration_number}</p>
                    <p className="text-xs text-slate-400">{v.brand} {v.model}</p>
                  </div>
                  {selectedVehicleId === v.id && (
                    <CheckCircle className="h-5 w-5 text-blue-400 ml-auto" />
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Type d'incident */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Type d&apos;incident</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {INCIDENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedTypeLabel === type.label;
              return (
                <button
                  key={type.label}
                  type="button"
                  onClick={() => setSelectedTypeLabel(type.label)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left min-h-[56px]',
                    isSelected ? cn(type.bg, type.border) : 'bg-slate-900/50 border-slate-700'
                  )}
                >
                  <div className={cn('p-2 rounded-lg shrink-0', type.bg)}>
                    <Icon className={cn('h-5 w-5', type.color)} />
                  </div>
                  <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                    {type.label}
                  </span>
                  {isSelected && <CheckCircle className={cn('h-5 w-5 ml-auto', type.color)} />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Date / heure */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Date et heure</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="datetime-local"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="bg-slate-900/50 border-slate-700 h-12 text-base"
              required
            />
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex justify-between">
              <span>Description <span className="text-red-400">*</span></span>
              <span className={cn('text-xs', descriptionValid ? 'text-green-400' : 'text-slate-500')}>
                {description.trim().length}/20 min
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Décrivez précisément ce qui s'est passé : circonstances, dommages constatés..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                'bg-slate-900/50 border-slate-700 min-h-[120px] resize-none text-base',
                description.trim().length > 0 && !descriptionValid && 'border-amber-500/50'
              )}
              required
            />
          </CardContent>
        </Card>

        {/* Localisation */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Localisation (optionnel)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: A6 sortie 12, zone commerciale..."
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="bg-slate-900/50 border-slate-700 h-12 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 w-12 shrink-0 border-slate-700"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Photo (optionnel)</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photoFile ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span className="text-sm text-green-300 flex-1 truncate">{photoFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPhotoFile(null)}
                  className="text-slate-400 hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 transition-colors min-h-[60px]"
              >
                <Camera className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-400">Prendre une photo / Choisir un fichier</span>
              </button>
            )}
          </CardContent>
        </Card>

        {/* Bouton soumettre */}
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className={cn(
            'w-full h-14 text-base font-semibold transition-all',
            canSubmit
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              Signaler l&apos;incident
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
