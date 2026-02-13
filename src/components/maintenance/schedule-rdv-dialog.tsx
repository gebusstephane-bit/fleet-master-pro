'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { scheduleMaintenanceRDV } from '@/actions/maintenance-workflow';
import { Calendar as CalendarIcon, Clock, MapPin, Phone, Building, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ScheduleRDVDialogProps {
  maintenanceId: string;
  vehicleRegistration: string;
  garageName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleRDVDialog({ 
  maintenanceId, 
  vehicleRegistration,
  garageName,
  open, 
  onOpenChange 
}: ScheduleRDVDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    garageName: '',
    garageAddress: '',
    garagePhone: '',
    rdvTime: '09:00',
    estimatedDays: 0,
    estimatedHours: 2,
    notes: '',
  });

  // Pré-remplir le garage si fourni
  useEffect(() => {
    if (garageName && open) {
      setFormData(prev => ({ ...prev, garageName }));
    }
  }, [garageName, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    
    setLoading(true);
    try {
      const result = await scheduleMaintenanceRDV({
        maintenanceId,
        garageName: formData.garageName,
        garageAddress: formData.garageAddress,
        garagePhone: formData.garagePhone,
        rdvDate: format(date, 'yyyy-MM-dd'),
        rdvTime: formData.rdvTime,
        estimatedDays: formData.estimatedDays,
        estimatedHours: formData.estimatedHours,
        notes: formData.notes,
      });
      
      if (result?.data?.success) {
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPreFilledGarage = !!garageName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Prendre rendez-vous
          </DialogTitle>
          <DialogDescription>
            Planifier l&apos;intervention pour le véhicule <strong>{vehicleRegistration}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Garage */}
          <div className="space-y-2">
            <Label htmlFor="garageName">
              <Building className="h-4 w-4 inline mr-1" />
              Nom du garage *
            </Label>
            <Input
              id="garageName"
              value={formData.garageName}
              onChange={(e) => setFormData({ ...formData, garageName: e.target.value })}
              placeholder="Ex: Garage Dupont"
              required
            />
            {hasPreFilledGarage && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Garage suggéré lors de la création de la demande
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="garageAddress">
              <MapPin className="h-4 w-4 inline mr-1" />
              Adresse *
            </Label>
            <Textarea
              id="garageAddress"
              value={formData.garageAddress}
              onChange={(e) => setFormData({ ...formData, garageAddress: e.target.value })}
              placeholder="Adresse complète du garage"
              required
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="garagePhone">
              <Phone className="h-4 w-4 inline mr-1" />
              Téléphone
            </Label>
            <Input
              id="garagePhone"
              value={formData.garagePhone}
              onChange={(e) => setFormData({ ...formData, garagePhone: e.target.value })}
              placeholder="01 23 45 67 89"
            />
          </div>

          {/* Date et heure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd MMM yyyy', { locale: fr }) : 'Choisir'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rdvTime">
                <Clock className="h-4 w-4 inline mr-1" />
                Heure *
              </Label>
              <Input
                id="rdvTime"
                type="time"
                value={formData.rdvTime}
                onChange={(e) => setFormData({ ...formData, rdvTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Durée estimée en jours/heures */}
          <div className="space-y-2">
            <Label>Durée estimée</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData({ ...formData, estimatedDays: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">Jours</p>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">Heures</p>
              </div>
            </div>
            {(formData.estimatedDays > 0 || formData.estimatedHours > 0) && (
              <p className="text-sm text-blue-600">
                Durée totale: {formData.estimatedDays > 0 && `${formData.estimatedDays} jour${formData.estimatedDays > 1 ? 's' : ''}`}
                {formData.estimatedDays > 0 && formData.estimatedHours > 0 && ' et '}
                {formData.estimatedHours > 0 && `${formData.estimatedHours} heure${formData.estimatedHours > 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations complémentaires..."
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
              disabled={loading || !date || !formData.garageName || !formData.garageAddress}
              className="flex-1"
            >
              {loading ? 'Confirmation...' : 'Confirmer le RDV'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
