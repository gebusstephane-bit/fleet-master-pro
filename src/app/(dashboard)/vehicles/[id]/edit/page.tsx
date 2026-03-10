'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { VehicleActivityManager } from '@/components/vehicles/vehicle-activity-manager';
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal - prend 2 colonnes */}
        <div className="lg:col-span-2">
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
                  type: vehicle.type as any,
                  fuel_type: vehicle.fuel_type as any,
                  color: vehicle.color,
                  mileage: vehicle.mileage,
                  vin: vehicle.vin || undefined,
                  status: vehicle.status as any,
                  // Type détaillé
                  detailed_type: (vehicle as any).detailed_type ?? '',
                  // Assurance
                  insurance_company: (vehicle as any).insurance_company ?? '',
                  insurance_policy_number: (vehicle as any).insurance_policy_number ?? '',
                  insurance_expiry: (vehicle as any).insurance_expiry ?? '',
                  // Échéances réglementaires
                  technical_control_date: (vehicle as any).technical_control_date ?? '',
                  technical_control_expiry: (vehicle as any).technical_control_expiry ?? '',
                  tachy_control_date: (vehicle as any).tachy_control_date ?? '',
                  tachy_control_expiry: (vehicle as any).tachy_control_expiry ?? '',
                  atp_date: (vehicle as any).atp_date ?? '',
                  atp_expiry: (vehicle as any).atp_expiry ?? '',
                  // ADR (transport de marchandises dangereuses)
                  adr_certificate_date: (vehicle as any).adr_certificate_date ?? '',
                  adr_certificate_expiry: (vehicle as any).adr_certificate_expiry ?? '',
                  adr_equipment_check_date: (vehicle as any).adr_equipment_check_date ?? '',
                  adr_equipment_expiry: (vehicle as any).adr_equipment_expiry ?? '',
                }}
                onSubmit={async (data) => {
                  await updateMutation.mutateAsync({ ...data, id } as unknown as Parameters<typeof updateMutation.mutateAsync>[0]);
                  router.push('/vehicles');
                }}
                isSubmitting={updateMutation.isPending}
                submitLabel="Enregistrer les modifications"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Gestion activités */}
        <div className="space-y-6">
          <VehicleActivityManager vehicleId={id} />
        </div>
      </div>
    </div>
  );
}
