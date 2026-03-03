/**
 * Route /scan/[vehicleId]/inspection - Formulaire d'inspection public
 * Accès anonyme via QR Code avec token
 * 
 * SECURITY:
 * - Token requis et validé
 * - Rate limiting strict (5 req/min)
 * - Insert uniquement via RLS
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PublicInspectionForm } from '@/components/scan/public-inspection-form';

interface InspectionPageProps {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function PublicInspectionPage({ 
  params, 
  searchParams 
}: InspectionPageProps) {
  const { vehicleId } = await params;
  const { token } = await searchParams;

  // Vérifier que le token est présent
  if (!token) {
    redirect('/?error=missing_token');
  }

  // Vérifier la validité du token
  const supabase = await createClient();
  
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('id, registration_number, brand, model, type, qr_code_data, status, mileage')
    .eq('id', vehicleId)
    .eq('qr_code_data', token)
    .eq('status', 'active')
    .single();

  if (error || !vehicle) {
    redirect('/?error=invalid_token');
  }

  return (
    <PublicInspectionForm
      vehicleId={vehicleId}
      accessToken={token}
      vehicleInfo={{
        registration_number: vehicle.registration_number,
        brand: vehicle.brand,
        model: vehicle.model,
        type: vehicle.type,
        mileage: vehicle.mileage,
      }}
    />
  );
}
