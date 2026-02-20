'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createMaintenanceRequest } from '@/actions/maintenance-workflow';
import { Plus, Wrench, AlertTriangle, Euro, Building2, Car, CheckCircle } from 'lucide-react';
import { useVehicles } from '@/hooks/use-vehicles';
import { toast } from 'sonner';

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVehicleId?: string;
}

const types = [
  { value: 'PREVENTIVE', label: 'Préventive', icon: '🔧' },
  { value: 'CORRECTIVE', label: 'Corrective', icon: '🔨' },
  { value: 'PNEUMATIQUE', label: 'Pneumatique', icon: '🛞' },
  { value: 'CARROSSERIE', label: 'Carrosserie', icon: '🎨' },
];

const priorities = [
  { value: 'LOW', label: 'Basse', color: 'text-gray-600' },
  { value: 'NORMAL', label: 'Normale', color: 'text-blue-600' },
  { value: 'HIGH', label: 'Haute', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critique', color: 'text-red-600' },
];

export function CreateRequestDialog({ 
  open, 
  onOpenChange,
  preselectedVehicleId 
}: CreateRequestDialogProps) {
  const router = useRouter();

  const { data: vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: preselectedVehicleId || '',
    type: 'PREVENTIVE',
    description: '',
    priority: 'NORMAL',
    estimatedCost: '',
    garageName: '',
    notes: '',
  });

  // Récupérer les infos du véhicule sélectionné
  const selectedVehicle = useMemo(() => {
    // @ts-ignore
    return vehicles?.find((v: any) => v.id === formData.vehicleId);
  }, [vehicles, formData.vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const result = await createMaintenanceRequest({
        vehicleId: formData.vehicleId,
        type: formData.type as 'PREVENTIVE' | 'CORRECTIVE' | 'PNEUMATIQUE' | 'CARROSSERIE',
        description: formData.description,
        priority: formData.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL',
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
        garageName: formData.garageName || undefined,
        notes: formData.notes,
      });
      
      // @ts-ignore
      if (result?.data?.success) {
        setSuccess(true);
        toast.success('Demande créée avec succès', {
          description: 'La demande a été soumise au directeur pour validation.',
        });
        
        // Attendre 1.5s pour montrer le message puis fermer/rediriger
        setTimeout(() => {
          onOpenChange(false);
          router.push('/maintenance');
          router.refresh();
          setSuccess(false);
        }, 1500);
      } else {
        // @ts-ignore
        toast.error(result?.data?.error || 'Impossible de créer la demande');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[500px] w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5 text-cyan-500" />
            Nouvelle demande d&apos;intervention
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Créer une demande de maintenance qui sera soumise au directeur pour validation.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-400">Demande envoyée !</h3>
              <p className="text-sm text-slate-400 mt-1">
                La demande a bien été prise en compte.<br />
                Redirection en cours...
              </p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Véhicule - Plaque d'immatriculation */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId" className="text-slate-200">
              <Car className="h-4 w-4 inline mr-1 text-cyan-500" />
              Plaque d&apos;immatriculation *
            </Label>
            <Select
              value={formData.vehicleId}
              onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100 [&>span]:text-slate-300">
                <SelectValue placeholder="Sélectionner une plaque" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-slate-700 text-slate-100">
                {/* @ts-ignore */}
                {vehicles?.map((vehicle: any) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Infos véhicule affichées automatiquement */}
          {selectedVehicle && (
            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <p className="text-sm text-cyan-100">
                <span className="font-medium">{selectedVehicle.brand} {selectedVehicle.model}</span>
                <span className="text-cyan-400 ml-2">({selectedVehicle.year || 'Année inconnue'})</span>
              </p>
              {selectedVehicle.mileage && (
                <p className="text-xs text-cyan-400 mt-1">
                  Kilométrage: {selectedVehicle.mileage.toLocaleString('fr-FR')} km
                </p>
              )}
            </div>
          )}

          {/* Garage */}
          <div className="space-y-2">
            <Label htmlFor="garageName" className="text-slate-200">
              <Building2 className="h-4 w-4 inline mr-1 text-cyan-500" />
              Garage préféré (optionnel)
            </Label>
            <Input
              id="garageName"
              value={formData.garageName}
              onChange={(e) => setFormData({ ...formData, garageName: e.target.value })}
              placeholder="Ex: Garage Dupont (peut être modifié plus tard)"
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">
              Ce garage sera associé à l&apos;intervention pour toute la procédure
            </p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-slate-200">Type d&apos;intervention *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-slate-700 text-slate-100">
                {types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="mr-2">{type.icon}</span>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-200">
              <Wrench className="h-4 w-4 inline mr-1 text-cyan-500" />
              Description du problème *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'intervention nécessaire..."
              rows={3}
              required
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Priorité */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-slate-200">
              <AlertTriangle className="h-4 w-4 inline mr-1 text-cyan-500" />
              Priorité *
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f172a] border-slate-700 text-slate-100">
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value} className={p.color}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Coût estimé */}
          <div className="space-y-2">
            <Label htmlFor="estimatedCost" className="text-slate-200">
              <Euro className="h-4 w-4 inline mr-1 text-cyan-500" />
              Coût estimé (€)
            </Label>
            <Input
              id="estimatedCost"
              type="number"
              step="0.01"
              min="0"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              placeholder="Optionnel"
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-200">Notes complémentaires</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations additionnelles pour le directeur..."
              rows={2}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.vehicleId || !formData.description}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loading ? 'Envoi...' : 'Soumettre au directeur'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
