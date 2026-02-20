'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export interface Protocol {
  id: string;
  name: string;
  priority: number;
  condition_type: string;
  condition_value: string;
  condition_reference?: string;
  action_type: string;
  phone_number: string;
  instructions: string;
  is_active: boolean;
}

export interface ProtocolFormData {
  name: string;
  priority: number;
  condition_type: string;
  condition_value: string;
  condition_reference?: string;
  phone_number: string;
  instructions: string;
}

interface ProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProtocolFormData) => Promise<void>;
  providers: { id: string; name: string }[];
}

const CONDITION_TYPES = [
  { value: 'always', label: 'Toujours applicable (24/24)', description: 'Protocole universel pour toutes les pannes' },
  { value: 'distance', label: 'Distance par rapport à un garage', description: 'Ex: Si à plus de 50km du garage X' },
  { value: 'location_type', label: 'Type de localisation', description: 'Ex: Si sur autoroute' },
  { value: 'breakdown_type', label: 'Type de panne', description: 'Ex: Si panne frigo' },
  { value: 'brand_specific', label: 'Marque spécifique', description: 'Ex: Si véhicule Carrier' },
  { value: 'severity', label: 'Gravité', description: 'Ex: Si immobilisation totale' },
];

const LOCATION_TYPES = [
  { value: 'highway', label: 'Autoroute / Aire de repos' },
  { value: 'city', label: 'Ville / Agglomération' },
];

const BREAKDOWN_TYPES = [
  { value: 'mechanical', label: 'Mécanique' },
  { value: 'frigo', label: 'Groupe frigo' },
  { value: 'electric', label: 'Électrique' },
  { value: 'tire', label: 'Pneumatique' },
  { value: 'bodywork', label: 'Carrosserie' },
];

const SEVERITY_TYPES = [
  { value: 'immediate', label: 'Arrêt immédiat' },
  { value: 'normal', label: 'Normal' },
];

export function ProtocolDialog({ open, onOpenChange, onSubmit, providers }: ProtocolDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProtocolFormData>({
    name: '',
    priority: 0,
    condition_type: 'distance',
    condition_value: '>50',
    phone_number: '',
    instructions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: '',
        priority: 0,
        condition_type: 'distance',
        condition_value: '>50',
        phone_number: '',
        instructions: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderConditionValueInput = () => {
    switch (formData.condition_type) {
      case 'always':
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              Ce protocole s&apos;appliquera à <strong>toutes les pannes</strong> sans condition.
              Utile pour une astreinte 24/24 ou un numéro d&apos;urgence général.
            </p>
            <input type="hidden" value="always" />
          </div>
        );
      case 'distance':
        return (
          <div className="space-y-2">
            <Label htmlFor="condition_value">Distance (km)</Label>
            <Select
              value={formData.condition_value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, condition_value: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">30">Plus de 30 km</SelectItem>
                <SelectItem value=">50">Plus de 50 km</SelectItem>
                <SelectItem value=">100">Plus de 100 km</SelectItem>
              </SelectContent>
            </Select>
            <Label htmlFor="condition_reference" className="mt-2">Garage de référence</Label>
            <Select
              value={formData.condition_reference}
              onValueChange={(value) => setFormData(prev => ({ ...prev, condition_reference: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un garage" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'location_type':
        return (
          <div className="space-y-2">
            <Label htmlFor="condition_value">Type de localisation</Label>
            <Select
              value={formData.condition_value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, condition_value: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'breakdown_type':
        return (
          <div className="space-y-2">
            <Label htmlFor="condition_value">Type de panne</Label>
            <Select
              value={formData.condition_value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, condition_value: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {BREAKDOWN_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'brand_specific':
        return (
          <div className="space-y-2">
            <Label htmlFor="condition_value">Marque</Label>
            <Input
              id="condition_value"
              value={formData.condition_value}
              onChange={(e) => setFormData(prev => ({ ...prev, condition_value: e.target.value }))}
              placeholder="Ex: Carrier, Thermo King, Audi..."
            />
          </div>
        );
        
      case 'severity':
        return (
          <div className="space-y-2">
            <Label htmlFor="condition_value">Gravité</Label>
            <Select
              value={formData.condition_value}
              onValueChange={(value) => setFormData(prev => ({ ...prev, condition_value: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une gravité" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un protocole d&apos;urgence</DialogTitle>
          <DialogDescription>
            Ce protocole sera vérifié avant la recherche de garages
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du protocole *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Astreinte Euromaster lointain"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorité (0 = premier)</Label>
              <Input
                id="priority"
                type="number"
                min={0}
                max={100}
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Numéro à appeler *</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="06 12 34 56 78"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition_type">Condition déclencheur *</Label>
            <Select
              value={formData.condition_type}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                condition_type: value, 
                condition_value: value === 'always' ? 'always' : '', 
                condition_reference: undefined 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {CONDITION_TYPES.find(c => c.value === formData.condition_type)?.description}
            </p>
          </div>

          {renderConditionValueInput()}

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions à afficher *</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Ex: Ne pas déplacer le véhicule. Attendre l'arrivée du dépanneur."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
