'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CarnetPdfButtonProps {
  vehicleId: string;
  registrationNumber: string;
  /** Optional extra className for the button */
  className?: string;
  /** Visual variant forwarded to shadcn Button */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

type State = 'idle' | 'loading' | 'success' | 'error';

export function CarnetPdfButton({
  vehicleId,
  registrationNumber,
  className,
  variant = 'outline',
}: CarnetPdfButtonProps) {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleGenerate() {
    if (state === 'loading') return;
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/carnet/pdf`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Trigger browser download via Blob URL
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `carnet-${registrationNumber.replace(/\s+/g, '-')}-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setState('success');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setErrorMsg(msg);
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }

  const icons: Record<State, React.ReactNode> = {
    idle:    <BookOpen    className="h-4 w-4 mr-2" />,
    loading: <Loader2     className="h-4 w-4 mr-2 animate-spin" />,
    success: <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />,
    error:   <AlertCircle  className="h-4 w-4 mr-2 text-red-500" />,
  };

  const labels: Record<State, string> = {
    idle:    'Carnet PDF',
    loading: 'Génération…',
    success: 'Téléchargé !',
    error:   'Erreur',
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        onClick={handleGenerate}
        disabled={state === 'loading'}
        title={`Générer le carnet d'entretien PDF pour ${registrationNumber}`}
        className={className}
      >
        {icons[state]}
        {labels[state]}
      </Button>
      {state === 'error' && errorMsg && (
        <p className="text-xs text-red-500 max-w-[220px] leading-snug">{errorMsg}</p>
      )}
    </div>
  );
}
