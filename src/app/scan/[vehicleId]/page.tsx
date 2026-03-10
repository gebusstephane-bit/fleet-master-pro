/**
 * Route /scan/[vehicleId] - Page d'atterrissage après scan QR
 * Triple accès : Inspection, Carburant, Carnet Digital
 * 
 * SECURITY:
 * - Vérifie la validité du token
 * - Rate limiting appliqué par middleware
 * - Pas d'exposition de données sensibles
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThreeCardsChoice } from '@/components/scan/three-cards-choice';
import { VEHICLE_STATUS } from '@/constants/enums';

interface ScanPageProps {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ScanPage({ params, searchParams }: ScanPageProps) {
  const { vehicleId } = await params;
  const { token } = await searchParams;

  // Vérifier que le token est présent
  if (!token) {
    redirect('/?error=missing_token');
  }

  // Vérifier la validité du token et récupérer les infos véhicule
  const supabase = await createClient();
  
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('id, registration_number, brand, model, type, qr_code_data, status')
    .eq('id', vehicleId)
    .eq('qr_code_data', token)
    .eq('status', VEHICLE_STATUS.ACTIF)
    .single();

  if (error || !vehicle) {
    redirect('/?error=invalid_token');
  }

  // Vérifier si l'utilisateur est authentifié
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAuthenticated = false;
  let userRole = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      isAuthenticated = true;
      userRole = profile.role;
    }
  }

  return (
    <ThreeCardsChoice
      vehicleId={vehicleId}
      accessToken={token}
      vehicleInfo={{
        registration_number: vehicle.registration_number,
        brand: vehicle.brand,
        model: vehicle.model,
        type: vehicle.type,
      }}
      isAuthenticated={isAuthenticated}
      userRole={userRole}
    />
  );
}
