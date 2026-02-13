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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
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
      
      if (result?.data?.success) {
        setSuccess(true);
        toast({
          title: '✅ Demande créée avec succès',
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
        toast({
          title: '❌ Erreur',
          description: result?.data?.error || 'Impossible de créer la demande',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        title: '❌ Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Nouvelle demande d&apos;intervention
          </DialogTitle>
          <DialogDescription>
            Créer une demande de maintenance qui sera soumise au directeur pour validation.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700">Demande envoyée !</h3>
              <p className="text-sm text-gray-400 mt-1">
                La demande a bien été prise en compte.<br />
                Redirection en cours...
              </p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Véhicule - Plaque d'immatriculation */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">
              <Car className="h-4 w-4 inline mr-1" />
              Plaque d&apos;immatriculation *
            </Label>
            <Select
              value={formData.vehicleId}
              onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une plaque" />
              </SelectTrigger>
              <SelectContent>
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
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">{selectedVehicle.brand} {selectedVehicle.model}</span>
                <span className="text-blue-600 ml-2">({selectedVehicle.year || 'Année inconnue'})</span>
              </p>
              {selectedVehicle.mileage && (
                <p className="text-xs text-blue-600 mt-1">
                  Kilométrage: {selectedVehicle.mileage.toLocaleString('fr-FR')} km
                </p>
              )}
            </div>
          )}

          {/* Garage */}
          <div className="space-y-2">
            <Label htmlFor="garageName">
              <Building2 className="h-4 w-4 inline mr-1" />
              Garage préféré (optionnel)
            </Label>
            <Input
              id="garageName"
              value={formData.garageName}
              onChange={(e) => setFormData({ ...formData, garageName: e.target.value })}
              placeholder="Ex: Garage Dupont (peut être modifié plus tard)"
            />
            <p className="text-xs text-gray-400">
              Ce garage sera associé à l&apos;intervention pour toute la procédure
            </p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type d&apos;intervention *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <Label htmlFor="description">
              <Wrench className="h-4 w-4 inline mr-1" />
              Description du problème *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'intervention nécessaire..."
              rows={3}
              required
            />
          </div>

          {/* Priorité */}
          <div className="space-y-2">
            <Label htmlFor="priority">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Priorité *
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <Label htmlFor="estimatedCost">
              <Euro className="h-4 w-4 inline mr-1" />
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes complémentaires</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations additionnelles pour le directeur..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.vehicleId || !formData.description}
              className="flex-1"
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
