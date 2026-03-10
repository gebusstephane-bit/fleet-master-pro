/**
 * Route /scan/[vehicleId]/fuel - Formulaire Multi-Carburant (Session de Ravitaillement)
 * Accès anonyme via QR Code avec token
 * 
 * UX optimisée pour la saisie rapide sur le terrain:
 * - Maximum 3 carburants par session
 * - Recopie intelligente du kilométrage
 * - GNR sans kilométrage (groupe frigo)
 * - Prix optionnel (AS24 automate)
 * 
 * SECURITY:
 * - Token requis et validé
 * - Rate limiting strict (5 req/min)
 * - Insert uniquement via RLS
 * - Transaction SQL: tout ou rien
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MultiFuelForm } from '@/components/scan/multi-fuel-form';
import { VEHICLE_STATUS } from '@/constants/enums';

interface FuelPageProps {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function PublicFuelPage({ 
  params, 
  searchParams 
}: FuelPageProps) {
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
    .eq('status', VEHICLE_STATUS.ACTIF)
    .single();

  if (error || !vehicle) {
    redirect('/?error=invalid_token');
  }

  return (
    <MultiFuelForm
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
