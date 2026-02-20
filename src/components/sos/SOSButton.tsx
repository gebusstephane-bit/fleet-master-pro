'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Siren } from 'lucide-react';

interface SOSButtonProps {
  className?: string;
  variant?: 'default' | 'sidebar';
}

export function SOSButton({ className = '', variant = 'default' }: SOSButtonProps) {
  const router = useRouter();

  if (variant === 'sidebar') {
    return (
      <button
        onClick={() => router.push('/sos')}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-red-600 hover:bg-red-50 ${className}`}
      >
        <Siren className="h-5 w-5" />
        <span>SOS Garage</span>
      </button>
    );
  }

  return (
    <Button
      onClick={() => router.push('/sos')}
      className={`bg-red-600 hover:bg-red-700 text-white ${className}`}
      size="lg"
    >
      <Siren className="h-5 w-5 mr-2" />
      SOS Garage
    </Button>
  );
}
