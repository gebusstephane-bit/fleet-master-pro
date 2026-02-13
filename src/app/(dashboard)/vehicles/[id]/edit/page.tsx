'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { useVehicle, useUpdateVehicle } from '@/hooks/use-vehicles';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const { data: vehicle, isLoading } = useVehicle(id);
  const updateMutation = useUpdateVehicle();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold">Véhicule non trouvé</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modifier le véhicule</h1>
        <p className="text-muted-foreground">
          Modifiez les informations du véhicule.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du véhicule</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            defaultValues={{
              registration_number: vehicle.registration_number,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year,
              type: vehicle.type,
              fuel_type: vehicle.fuel_type,
              color: vehicle.color,
              mileage: vehicle.mileage,
              vin: vehicle.vin || undefined,
              status: vehicle.status,
            }}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync({ ...data, id });
              router.push('/vehicles');
            }}
            isSubmitting={updateMutation.isPending}
            submitLabel="Enregistrer les modifications"
          />
        </CardContent>
      </Card>
    </div>
  );
}
