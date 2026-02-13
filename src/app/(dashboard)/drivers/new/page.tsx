'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverForm } from '@/components/drivers/driver-form';
import { useCreateDriver } from '@/hooks/use-drivers';
import { PageHeader } from '@/components/ui/page-header';

export default function NewDriverPage() {
  const router = useRouter();
  const createMutation = useCreateDriver();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau conducteur"
        description="Ajoutez un nouveau conducteur à votre équipe"
        backHref="/drivers"
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations du conducteur</CardTitle>
        </CardHeader>
        <CardContent>
          <DriverForm
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
              router.push('/drivers');
            }}
            isSubmitting={createMutation.isPending}
            submitLabel="Créer le conducteur"
          />
        </CardContent>
      </Card>
    </div>
  );
}
