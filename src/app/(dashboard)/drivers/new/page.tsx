'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { DriverForm } from '@/components/drivers/driver-form';
import { DriverAppAccessSection, DriverAppAccessData } from '@/components/drivers/DriverAppAccessSection';
import { useCreateDriver } from '@/hooks/use-drivers';
import { PageHeader } from '@/components/ui/page-header';
import { User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createDriverAccount } from '@/actions/driver-auth';
import { useUserContext } from '@/components/providers/user-provider';

// ============================================================================
// PAGE : Création d'un nouveau conducteur avec option d'accès app
// ============================================================================

export default function NewDriverPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const createMutation = useCreateDriver();
  
  // État pour l'accès application
  const [appAccess, setAppAccess] = useState<DriverAppAccessData>({
    enabled: false,
    email: '',
    password: '',
  });
  
  // État de soumission séparé pour la création du compte auth
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  const handleSubmit = async (formData: any) => {
    try {
      // 1. Créer le conducteur dans la base de données
      // Normaliser les dates vides en null
      const normalizeDate = (date: string | null | undefined) => date === '' ? null : date ?? null;
      
      const submitData = {
        ...formData,
        hire_date: normalizeDate(formData.hire_date),
        cqc_expiry: normalizeDate(formData.cqc_expiry),
        driver_card_expiry: normalizeDate(formData.driver_card_expiry),
        fimo_date: normalizeDate(formData.fimo_date),
        fcos_expiry: normalizeDate(formData.fcos_expiry),
        qi_date: normalizeDate(formData.qi_date),
        medical_certificate_expiry: normalizeDate(formData.medical_certificate_expiry),
        adr_certificate_expiry: normalizeDate(formData.adr_certificate_expiry),
        birth_date: normalizeDate(formData.birth_date),
      };
      
      const result = await createMutation.mutateAsync(submitData);
      const newDriver = result as unknown as { id: string };
      
      // 2. Si l'accès app est activé, créer le compte auth
      if (appAccess.enabled && newDriver?.id) {
        setIsCreatingAccount(true);
        
        // Validation des champs d'accès
        if (!appAccess.email || !appAccess.password) {
          toast.error('Email et mot de passe requis pour l\'accès application');
          setIsCreatingAccount(false);
          return;
        }
        
        if (appAccess.password.length < 8) {
          toast.error('Le mot de passe doit contenir au moins 8 caractères');
          setIsCreatingAccount(false);
          return;
        }
        
        const accountResult = await createDriverAccount({
          driverId: newDriver.id,
          email: appAccess.email,
          password: appAccess.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          companyId: user?.company_id || '',
        });
        
        if (accountResult?.data?.success) {
          toast.success('Conducteur créé avec succès et accès app activé !');
        } else {
          // Le conducteur est créé mais pas le compte auth
          toast.warning('Conducteur créé, mais erreur lors de la création du compte app');
        }
      } else {
        toast.success('Conducteur créé avec succès !');
      }
      
      // 3. Redirection vers la liste
      router.push('/drivers');
      
    } catch (error: any) {
      console.error('Erreur création conducteur:', error);
      toast.error(error.message || 'Erreur lors de la création du conducteur');
    } finally {
      setIsCreatingAccount(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau conducteur"
        description="Ajoutez un nouveau conducteur à votre équipe"
        backHref="/drivers"
        // @ts-ignore
        icon={User}
      />

      <div className="space-y-6">
        {/* Formulaire principal */}
        <GlassCard glow="violet" className="p-6">
          <DriverForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending || isCreatingAccount}
            submitLabel={isCreatingAccount ? 'Création en cours...' : 'Créer le conducteur'}
          />
        </GlassCard>
        
        {/* Section accès application (affichée après le formulaire) */}
        <DriverAppAccessSection
          value={appAccess}
          onChange={setAppAccess}
          disabled={createMutation.isPending || isCreatingAccount}
        />
        
        {/* Indicateur de création du compte */}
        {isCreatingAccount && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm text-blue-400">
              Création du compte d&apos;accès en cours...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
