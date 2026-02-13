'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, getUserWithCompany } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface DriverData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_type: 'C' | 'C1' | 'CE' | 'D' | 'D1' | 'B';
  license_expiry: string;
}

export async function createDriver(data: DriverData) {
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('drivers').insert({
    ...data,
    company_id: userData.company_id,
    status: 'active',
    safety_score: 100,
    fuel_efficiency_score: 100,
  });

  if (error) {
    console.error('Erreur création chauffeur:', error);
    throw new Error('Erreur lors de la création du chauffeur');
  }

  revalidatePath('/drivers');
  redirect('/drivers');
}

export async function updateDriver(id: string, data: Partial<DriverData>) {
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('drivers')
    .update(data)
    .eq('id', id)
    .eq('company_id', userData.company_id);

  if (error) {
    console.error('Erreur mise à jour chauffeur:', error);
    throw new Error('Erreur lors de la mise à jour du chauffeur');
  }

  revalidatePath('/drivers');
  revalidatePath(`/drivers/${id}`);
}

export async function deleteDriver(id: string) {
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id)
    .eq('company_id', userData.company_id);

  if (error) {
    console.error('Erreur suppression chauffeur:', error);
    throw new Error('Erreur lors de la suppression du chauffeur');
  }

  revalidatePath('/drivers');
}
