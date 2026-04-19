'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Fuel, History, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUserContext } from '@/components/providers/user-provider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ============================================================================
// PAGE : Saisie de carburant
// ============================================================================

export default function DriverFuelPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // États du formulaire
  const [mileage, setMileage] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [station, setStation] = useState('');
  const [fuelType, setFuelType] = useState('diesel');
  
  // Calculs automatiques
  const litersNum = parseFloat(liters) || 0;
  const priceNum = parseFloat(pricePerLiter) || 0;
  const totalCost = litersNum * priceNum;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mileage || !liters || !pricePerLiter) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const supabase = getSupabaseClient();
      
      // Récupérer le conducteur et son véhicule
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, current_vehicle_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (!driver?.current_vehicle_id) {
        toast.error('Aucun véhicule assigné');
        return;
      }
      
      // Récupérer le véhicule pour avoir le company_id
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('company_id')
        .eq('id', driver.current_vehicle_id)
        .maybeSingle();
      
      // Créer l'enregistrement de carburant
      const { error } = await supabase
        .from('fuel_records')
        .insert({
          vehicle_id: driver.current_vehicle_id,
          driver_id: driver.id,
          company_id: vehicle?.company_id || '',
          date: new Date().toISOString(),
          mileage_at_fill: parseInt(mileage),
          quantity_liters: litersNum,
          price_per_liter: priceNum,
          price_total: totalCost,
          station_name: station || null,
          fuel_type: fuelType,
        });
      
      if (error) {
        throw error;
      }
      
      // Garde-fou anti-recul : ne met à jour que si nouveau km > ancien
      const newMileage = parseInt(mileage);
      const { data: currentVehicle } = await supabase
        .from('vehicles')
        .select('mileage')
        .eq('id', driver.current_vehicle_id)
        .single();

      if (currentVehicle && newMileage > (currentVehicle.mileage || 0)) {
        await supabase
          .from('vehicles')
          .update({ mileage: newMileage })
          .eq('id', driver.current_vehicle_id);
      }
      
      toast.success('Plein enregistré avec succès !');
      router.push('/driver-app');
      
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
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
          <h1 className="text-xl font-bold text-white">Saisir un plein</h1>
          <p className="text-xs text-slate-400">Enregistrement du carburant</p>
        </div>
      </div>
      
      {/* Formulaire */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kilométrage */}
            <div className="space-y-2">
              <Label htmlFor="mileage" className="flex items-center gap-1">
                Kilométrage actuel
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mileage"
                type="number"
                placeholder="Ex: 125000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-lg"
                required
              />
              <p className="text-xs text-slate-500">Kilométrage affiché au compteur</p>
            </div>
            
            {/* Type de carburant */}
            <div className="space-y-2">
              <Label>Type de carburant</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'diesel', label: 'Diesel' },
                  { value: 'gasoline', label: 'Essence' },
                  { value: 'adblue', label: 'AdBlue' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFuelType(type.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      fuelType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Quantité et prix */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="liters" className="flex items-center gap-1">
                  Litres
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="liters"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="bg-slate-900/50 border-slate-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-1">
                  Prix/L (€)
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  className="bg-slate-900/50 border-slate-700"
                  required
                />
              </div>
            </div>
            
            {/* Station */}
            <div className="space-y-2">
              <Label htmlFor="station">Station-service (optionnel)</Label>
              <Input
                id="station"
                placeholder="Ex: Total, Shell..."
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="bg-slate-900/50 border-slate-700"
              />
            </div>
            
            {/* Récapitulatif */}
            {totalCost > 0 && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Coût total</span>
                  <span className="text-xl font-bold text-blue-400">
                    {totalCost.toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
            
            {/* Bouton de soumission */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Fuel className="h-5 w-5 mr-2" />
                  Enregistrer le plein
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Historique récent */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            Historique récent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-500 text-sm">
            <p>Les derniers pleins apparaîtront ici</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
