'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { useCreateVehicle } from '@/hooks/use-vehicles';
import { PageHeader } from '@/components/ui/page-header';
import { Car } from 'lucide-react';

export default function NewVehiclePage() {
  const router = useRouter();
  const createMutation = useCreateVehicle();

  return (
    <div className="space-y-6">
      {React.createElement(PageHeader as any, {
        title: "Nouveau véhicule",
        description: "Ajoutez un nouveau véhicule à votre flotte",
        backHref: "/vehicles",
        icon: Car
      })}

      {/* @ts-ignore */}
      <GlassCard glow="cyan" className="p-6">
        <VehicleForm
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
            router.push('/vehicles');
          }}
          isSubmitting={createMutation.isPending}
          submitLabel="Créer le véhicule"
        />
      </GlassCard>
    </div>
  );
}
