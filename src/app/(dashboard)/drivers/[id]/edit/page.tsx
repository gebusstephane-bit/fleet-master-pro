'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverForm } from '@/components/drivers/driver-form';
import { useDriver, useUpdateDriver } from '@/hooks/use-drivers';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';

export default function EditDriverPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const { data: driver, isLoading } = useDriver(id);
  const updateMutation = useUpdateDriver();

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

  if (!driver) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold">Conducteur non trouvé</h1>
      </div>
    );
  }

  // @ts-ignore
  const driverData = driver.data || driver;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier le conducteur"
        description="Modifiez les informations du conducteur"
        backHref="/drivers"
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations du conducteur</CardTitle>
        </CardHeader>
        <CardContent>
          <DriverForm
            defaultValues={{
              // @ts-ignore
              first_name: driverData.first_name,
              // @ts-ignore
              last_name: driverData.last_name,
              // @ts-ignore
              email: driverData.email,
              // @ts-ignore
              phone: driverData.phone || undefined,
              // @ts-ignore
              address: driverData.address || undefined,
              // @ts-ignore
              city: driverData.city || undefined,
              // @ts-ignore
              nationality: driverData.nationality || undefined,
              // @ts-ignore
              birth_date: driverData.birth_date || null,
              // @ts-ignore
              license_number: driverData.license_number,
              // @ts-ignore
              license_expiry: driverData.license_expiry,
              // @ts-ignore
              license_type: driverData.license_type,
              // @ts-ignore
              driver_card_number: driverData.driver_card_number || '',
              // @ts-ignore
              driver_card_expiry: driverData.driver_card_expiry || null,
              // @ts-ignore
              fimo_date: driverData.fimo_date || null,
              // @ts-ignore
              fcos_expiry: driverData.fcos_expiry || null,
              // @ts-ignore
              qi_date: driverData.qi_date || null,
              // @ts-ignore
              medical_certificate_expiry: driverData.medical_certificate_expiry || null,
              // @ts-ignore
              adr_certificate_expiry: driverData.adr_certificate_expiry || null,
              // @ts-ignore
              adr_classes: driverData.adr_classes || [],
              // @ts-ignore
              cqc_card_number: driverData.cqc_card_number || '',
              // @ts-ignore
              // Fallback sur cqc_expiry_date pour la rétrocompatibilité
              cqc_expiry: driverData.cqc_expiry || driverData.cqc_expiry_date || null,
              // @ts-ignore
              cqc_category: driverData.cqc_category || 'GOODS',
              // @ts-ignore
              hire_date: driverData.hire_date || null,
              // @ts-ignore
              contract_type: driverData.contract_type || undefined,
              // @ts-ignore
              is_active: driverData.is_active ?? true,
              // @ts-ignore
              status: driverData.status,
            }}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync({ ...data, id });
              router.push('/drivers');
            }}
            isSubmitting={updateMutation.isPending}
            submitLabel="Enregistrer les modifications"
          />
        </CardContent>
      </Card>
    </div>
  );
}
