'use client';

import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { DriverForm } from '@/components/drivers/driver-form';
import { useCreateDriver } from '@/hooks/use-drivers';
import { PageHeader } from '@/components/ui/page-header';
import { User } from 'lucide-react';

export default function NewDriverPage() {
  const router = useRouter();
  const createMutation = useCreateDriver();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau conducteur"
        description="Ajoutez un nouveau conducteur à votre équipe"
        backHref="/drivers"
        // @ts-ignore
        icon={User}
      />

      <GlassCard glow="violet" className="p-6">
        <DriverForm
          onSubmit={async (data) => {
            // Convertir undefined en null pour les champs optionnels
            const submitData = {
              ...data,
              hire_date: data.hire_date ?? null,
              cqc_expiry_date: data.cqc_expiry_date ?? null,
            };
            await createMutation.mutateAsync(submitData);
            router.push('/drivers');
          }}
          isSubmitting={createMutation.isPending}
          submitLabel="Créer le conducteur"
        />
      </GlassCard>
    </div>
  );
}
