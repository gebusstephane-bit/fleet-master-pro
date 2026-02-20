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
          <DialogTitle className="flex items-center gap-2 text-white">
            <CalendarIcon className="h-5 w-5 text-cyan-500" />
            Prendre rendez-vous
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Planifier l&apos;intervention pour le véhicule <span className="text-cyan-400 font-semibold">{vehicleRegistration}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Garage */}
          <div className="space-y-2">
            <Label htmlFor="garageName" className="text-slate-200">
              <Building className="h-4 w-4 inline mr-1 text-cyan-500" />
              Nom du garage *
            </Label>
            <Input
              id="garageName"
              value={formData.garageName}
              onChange={(e) => setFormData({ ...formData, garageName: e.target.value })}
              placeholder="Ex: Garage Dupont"
              required
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
            {hasPreFilledGarage && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Garage suggéré lors de la création de la demande
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="garageAddress" className="text-slate-200">
              <MapPin className="h-4 w-4 inline mr-1 text-cyan-500" />
              Adresse *
            </Label>
            <Textarea
              id="garageAddress"
              value={formData.garageAddress}
              onChange={(e) => setFormData({ ...formData, garageAddress: e.target.value })}
              placeholder="Adresse complète du garage"
              required
              rows={2}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="garagePhone" className="text-slate-200">
              <Phone className="h-4 w-4 inline mr-1 text-cyan-500" />
              Téléphone
            </Label>
            <Input
              id="garagePhone"
              value={formData.garagePhone}
              onChange={(e) => setFormData({ ...formData, garagePhone: e.target.value })}
              placeholder="01 23 45 67 89"
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Date et heure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal bg-slate-900/50 border-slate-700 text-slate-100 hover:bg-slate-800 hover:text-slate-200',
                      !date && 'text-slate-500'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-cyan-500" />
                    {date ? format(date, 'dd MMM yyyy', { locale: fr }) : 'Choisir'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#0f172a] border-slate-700">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="bg-[#0f172a] text-slate-100"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rdvTime" className="text-slate-200">
                <Clock className="h-4 w-4 inline mr-1 text-cyan-500" />
                Heure *
              </Label>
              <Input
                id="rdvTime"
                type="time"
                value={formData.rdvTime}
                onChange={(e) => setFormData({ ...formData, rdvTime: e.target.value })}
                required
                className="bg-slate-900/50 border-slate-700 text-slate-100"
              />
            </div>
          </div>

          {/* Durée estimée en jours/heures */}
          <div className="space-y-2">
            <Label className="text-slate-200">Durée estimée</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData({ ...formData, estimatedDays: parseInt(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-slate-700 text-slate-100"
                />
                <p className="text-xs text-slate-500 mt-1">Jours</p>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-slate-700 text-slate-100"
                />
                <p className="text-xs text-slate-500 mt-1">Heures</p>
              </div>
            </div>
            {(formData.estimatedDays > 0 || formData.estimatedHours > 0) && (
              <p className="text-sm text-cyan-400">
                Durée totale: {formData.estimatedDays > 0 && `${formData.estimatedDays} jour${formData.estimatedDays > 1 ? 's' : ''}`}
                {formData.estimatedDays > 0 && formData.estimatedHours > 0 && ' et '}
                {formData.estimatedHours > 0 && `${formData.estimatedHours} heure${formData.estimatedHours > 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-200">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations complémentaires..."
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
              disabled={loading || !date || !formData.garageName || !formData.garageAddress}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loading ? 'Confirmation...' : 'Confirmer le RDV'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
