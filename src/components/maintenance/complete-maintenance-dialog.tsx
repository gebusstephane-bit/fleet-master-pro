'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { completeMaintenance } from '@/actions/maintenance-workflow';
import { CheckCircle2, Euro, FileText } from 'lucide-react';

interface CompleteMaintenanceDialogProps {
  maintenanceId: string;
  vehicleRegistration: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteMaintenanceDialog({ 
  maintenanceId, 
  vehicleRegistration,
  open, 
  onOpenChange 
}: CompleteMaintenanceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    finalCost: '',
    completionNotes: '',
    invoiceDocument: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const result = await completeMaintenance({
        maintenanceId,
        finalCost: parseFloat(formData.finalCost) || 0,
        completionNotes: formData.completionNotes,
        invoiceDocument: formData.invoiceDocument,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Intervention terminée
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Finaliser l&apos;intervention pour <span className="text-cyan-400 font-semibold">{vehicleRegistration}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coût final */}
          <div className="space-y-2">
            <Label htmlFor="finalCost" className="text-slate-200">
              <Euro className="h-4 w-4 inline mr-1 text-cyan-500" />
              Coût final (€) *
            </Label>
            <Input
              id="finalCost"
              type="number"
              step="0.01"
              min="0"
              value={formData.finalCost}
              onChange={(e) => setFormData({ ...formData, finalCost: e.target.value })}
              placeholder="0.00"
              required
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completionNotes" className="text-slate-200">
              <FileText className="h-4 w-4 inline mr-1 text-cyan-500" />
              Notes de clôture
            </Label>
            <Textarea
              id="completionNotes"
              value={formData.completionNotes}
              onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
              placeholder="Travaux effectués, pièces changées, observations..."
              rows={4}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceDocument" className="text-slate-200">URL de la facture</Label>
            <Input
              id="invoiceDocument"
              value={formData.invoiceDocument}
              onChange={(e) => setFormData({ ...formData, invoiceDocument: e.target.value })}
              placeholder="https://..."
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
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
              disabled={loading || !formData.finalCost}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading ? 'Enregistrement...' : 'Marquer comme terminée'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
