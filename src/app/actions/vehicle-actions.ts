'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, getUserWithCompany } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface VehicleData {
  registration_number: string;
  brand: string;
  model: string;
  year: number;
  type: 'truck' | 'van' | 'car' | 'motorcycle' | 'trailer';
  fuel_type: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
  color: string;
  mileage: number;
  vin?: string;
}

export async function createVehicle(data: VehicleData) {
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('vehicles').insert({
    ...data,
    company_id: userData.company_id,
    status: 'active',
  });

  if (error) {
    console.error('Erreur création véhicule:', error);
    throw new Error('Erreur lors de la création du véhicule');
  }

  revalidatePath('/vehicles');
  redirect('/vehicles');
}

export async function updateVehicle(id: string, data: Partial<VehicleData>) {
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('vehicles')
    .update(data)
    .eq('id', id)
    .eq('company_id', userData.company_id);

  if (error) {
    console.error('Erreur mise à jour véhicule:', error);
    throw new Error('Erreur lors de la mise à jour du véhicule');
  }

  revalidatePath('/vehicles');
  revalidatePath(`/vehicles/${id}`);
}

export async function deleteVehicle(id: string) {
  const userData = await getUserWithCompany();
  
  if (!userData) {
    throw new Error('Non authentifié');
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('company_id', userData.company_id);

  if (error) {
    console.error('Erreur suppression véhicule:', error);
    throw new Error('Erreur lors de la suppression du véhicule');
  }

  revalidatePath('/vehicles');
}
