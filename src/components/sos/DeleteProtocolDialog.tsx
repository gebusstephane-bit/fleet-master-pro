'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Protocol } from './ProtocolDialog';

interface DeleteProtocolDialogProps {
  protocol: Protocol | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteProtocolDialog({ protocol, onClose, onConfirm }: DeleteProtocolDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!protocol) return;
    
    setLoading(true);
    try {
      await onConfirm(protocol.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!protocol} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Cette action est irréversible.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer le protocole{' '}
            <span className="font-semibold">{protocol?.name}</span> ?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Ce protocole ne sera plus appliqué lors des recherches d&apos;urgence.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Supprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
