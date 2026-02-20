'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

export interface Provider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  vehicle_types_supported: string[];
  specialties: string[];
  max_tonnage?: number;
  intervention_radius_km: number;
  is_active: boolean;
  priority: number;
}

export interface ProviderFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  vehicle_types_supported: string[];
  specialties: string[];
  max_tonnage: number;
  intervention_radius_km: number;
  priority: number;
}

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProviderFormData) => Promise<void>;
  provider?: Provider;
}

const VEHICLE_TYPES = [
  { value: 'PL', label: '🚛 Poids Lourd (Camions, Vans > 3.5t)' },
  { value: 'VL', label: '🚗 Véhicule Léger (Voitures, Vans < 3.5t)' },
];

const SPECIALTIES = [
  { value: '24_7', label: '24h/24 7j/7' },
  { value: 'FRIGO_CARRIER', label: 'Frigo / Groupe froid' },
  { value: 'MOTEUR', label: 'Moteur / Mécanique' },
  { value: 'PNEU', label: 'Pneumatique' },
  { value: 'ELECTRIQUE', label: 'Électrique' },
  { value: 'CARROSSERIE', label: 'Carrosserie' },
];

export function ProviderDialog({ open, onOpenChange, onSubmit, provider }: ProviderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: provider?.name || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    address: provider?.address || '',
    city: provider?.city || '',
    postal_code: provider?.postal_code || '',
    vehicle_types_supported: provider?.vehicle_types_supported || ['PL'],
    specialties: provider?.specialties || [],
    max_tonnage: provider?.max_tonnage || 44,
    intervention_radius_km: provider?.intervention_radius_km || 50,
    priority: provider?.priority || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      if (!provider) {
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          city: '',
          postal_code: '',
          vehicle_types_supported: ['PL'],
          specialties: [],
          max_tonnage: 44,
          intervention_radius_km: 50,
          priority: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicleType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      vehicle_types_supported: prev.vehicle_types_supported.includes(type)
        ? prev.vehicle_types_supported.filter(t => t !== type)
        : [...prev.vehicle_types_supported, type]
    }));
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {provider ? 'Modifier le prestataire' : 'Ajouter un prestataire'}
          </DialogTitle>
          <DialogDescription>
            Configurez un garage partenaire pour le module SOS.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)] px-6">
          <form id="provider-form" onSubmit={handleSubmit} className="space-y-6 pb-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Informations générales</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du garage *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Garage Dupont"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="06 12 34 56 78"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@garage.fr"
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Adresse</h4>
              
              <div className="space-y-2">
                <Label htmlFor="address">Adresse *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Rue de la Mécanique"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="75000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Paris"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Types de véhicules */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Types de véhicules acceptés *</h4>
              <div className="space-y-2">
                {VEHICLE_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vt-${type.value}`}
                      checked={formData.vehicle_types_supported.includes(type.value)}
                      onCheckedChange={() => toggleVehicleType(type.value)}
                    />
                    <Label htmlFor={`vt-${type.value}`} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Spécialités */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Spécialités</h4>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALTIES.map((specialty) => (
                  <div key={specialty.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`spec-${specialty.value}`}
                      checked={formData.specialties.includes(specialty.value)}
                      onCheckedChange={() => toggleSpecialty(specialty.value)}
                    />
                    <Label htmlFor={`spec-${specialty.value}`} className="cursor-pointer text-sm">
                      {specialty.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Paramètres avancés */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-900 border-b pb-2">Paramètres avancés</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="radius">Rayon d&apos;intervention (km)</Label>
                  <Input
                    id="radius"
                    type="number"
                    min={5}
                    max={500}
                    value={formData.intervention_radius_km}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      intervention_radius_km: parseInt(e.target.value) || 50 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tonnage">Tonnage max (tonnes)</Label>
                  <Input
                    id="tonnage"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.max_tonnage}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_tonnage: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorité (0-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    priority: parseInt(e.target.value) || 0 
                  }))}
                />
                <p className="text-xs text-gray-500">
                  Plus la valeur est élevée, plus le garage sera priorisé par l&apos;IA
                </p>
              </div>
            </div>
          </form>
        </ScrollArea>

        {/* Actions - Footer fixe */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button type="submit" form="provider-form" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {provider ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
