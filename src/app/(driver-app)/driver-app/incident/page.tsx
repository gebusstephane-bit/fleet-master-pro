'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Camera,
  CheckCircle,
  Loader2,
  Wrench,
  Car,
  AlertOctagon,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUserContext } from '@/components/providers/user-provider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ============================================================================
// PAGE SIGNAGEMENT INCIDENT
// ============================================================================

const incidentTypes = [
  { 
    value: 'breakdown', 
    label: 'Panne moteur', 
    icon: Wrench,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  { 
    value: 'accident', 
    label: 'Accident', 
    icon: Car,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
  },
  { 
    value: 'flat_tire', 
    label: 'Crevaison', 
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  { 
    value: 'mechanical', 
    label: 'Défaut mécanique', 
    icon: Wrench,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  { 
    value: 'other', 
    label: 'Autre', 
    icon: AlertOctagon,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
];

export default function DriverIncidentPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  
  // Formulaire
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [needsAssistance, setNeedsAssistance] = useState(false);
  
  // Récupérer la position GPS
  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationText(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        toast.success('Position récupérée');
      },
      () => {
        toast.error('Impossible de récupérer la position');
      }
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incidentType) {
      toast.error('Veuillez sélectionner un type d\'incident');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const supabase = getSupabaseClient();
      
      // Récupérer le conducteur
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, current_vehicle_id, company_id')
        .eq('user_id', user?.id || '')
        .single();
      
      if (!driver) {
        toast.error('Conducteur non trouvé');
        return;
      }
      
      // Créer le signalement d'incident
      const { error } = await supabase
        .from('maintenance_records')
        .insert({
          vehicle_id: driver.current_vehicle_id || '',
          company_id: driver.company_id || '',
          requested_by: driver.id,
          type: incidentType,
          description: description || 'Signalement depuis l\'app conducteur',
          priority: needsAssistance ? 'CRITICAL' : 'HIGH',
          status: 'pending',
          garage_address: locationText || null,
          requested_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      toast.success('Incident signalé avec succès');
      router.push('/driver-app');
      
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors du signalement');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
          <Link href="/driver-app">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">Signaler un incident</h1>
          <p className="text-xs text-slate-400">Panne, accident, problème mécanique</p>
        </div>
      </div>
      
      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type d'incident */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Type d&apos;incident</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incidentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = incidentType === type.value;
              
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setIncidentType(type.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    isSelected 
                      ? cn(type.bgColor, type.borderColor) 
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', type.bgColor)}>
                    <Icon className={cn('h-5 w-5', type.color)} />
                  </div>
                  <span className={cn(
                    'font-medium',
                    isSelected ? 'text-white' : 'text-slate-300'
                  )}>
                    {type.label}
                  </span>
                  {isSelected && (
                    <CheckCircle className={cn('h-5 w-5 ml-auto', type.color)} />
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Description */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Description (optionnel)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Décrivez le problème rencontré..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-900/50 border-slate-700 min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>
        
        {/* Localisation */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Localisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: A7 sortie 23, Paris..."
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="bg-slate-900/50 border-slate-700 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={getCurrentPosition}
                className="shrink-0"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Bouton photo */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-slate-700 hover:border-slate-500 transition-colors"
            >
              <Camera className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-400">Ajouter une photo</span>
            </button>
          </CardContent>
        </Card>
        
        {/* Assistance immédiate */}
        <Card 
          className={cn(
            'border transition-colors cursor-pointer',
            needsAssistance 
              ? 'bg-red-500/10 border-red-500/50' 
              : 'bg-slate-800/50 border-slate-700'
          )}
          onClick={() => setNeedsAssistance(!needsAssistance)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center',
                needsAssistance ? 'bg-red-500/20' : 'bg-slate-700'
              )}>
                <Phone className={cn(
                  'h-5 w-5',
                  needsAssistance ? 'text-red-400' : 'text-slate-400'
                )} />
              </div>
              <div className="flex-1">
                <p className={cn(
                  'font-medium',
                  needsAssistance ? 'text-red-400' : 'text-white'
                )}>
                  Besoin d&apos;assistance immédiate
                </p>
                <p className="text-xs text-slate-400">
                  Cocher si vous êtes immobilisé et avez besoin d&apos;aide
                </p>
              </div>
              <div className={cn(
                'h-5 w-5 rounded border flex items-center justify-center',
                needsAssistance 
                  ? 'bg-red-500 border-red-500' 
                  : 'border-slate-600'
              )}>
                {needsAssistance && <CheckCircle className="h-4 w-4 text-white" />}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Bouton SOS si assistance demandée */}
        {needsAssistance && (
          <a
            href="tel:+33123456789"
            className="block w-full p-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-center font-semibold transition-colors"
          >
            <Phone className="inline h-5 w-5 mr-2" />
            APPELER L&apos;ASSISTANCE
          </a>
        )}
        
        {/* Bouton de soumission */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base"
          variant={needsAssistance ? "destructive" : "default"}
          disabled={isSubmitting || !incidentType}
        >
          {isSubmitting ? (
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
