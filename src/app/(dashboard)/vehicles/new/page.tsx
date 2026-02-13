'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { useCreateVehicle } from '@/hooks/use-vehicles';

export default function NewVehiclePage() {
  const router = useRouter();
  const createMutation = useCreateVehicle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nouveau véhicule</h1>
        <p className="text-muted-foreground">
          Ajoutez un nouveau véhicule à votre flotte.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du véhicule</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
              router.push('/vehicles');
            }}
            isSubmitting={createMutation.isPending}
            submitLabel="Créer le véhicule"
          />
        </CardContent>
      </Card>
    </div>
  );
}
