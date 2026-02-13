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
              first_name: driver.first_name,
              last_name: driver.last_name,
              email: driver.email,
              phone: driver.phone,
              license_number: driver.license_number,
              license_expiry: driver.license_expiry,
              license_type: driver.license_type,
              address: driver.address || '',
              city: driver.city || '',
              hire_date: driver.hire_date || '',
              status: driver.status,
              cqc_card_number: driver.cqc_card_number || '',
              cqc_expiry_date: driver.cqc_expiry_date || '',
              cqc_category: driver.cqc_category || 'GOODS',
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
