/**
 * Route /scan/[vehicleId]/carnet - Carnet Digital (AUTHENTIFIÉ)
 * Accessible uniquement aux rôles ADMIN, DIRECTEUR, AGENT_DE_PARC
 * 
 * SECURITY:
 * - Authentification requise (middleware redirige vers login)
 * - Vérification du rôle
 * - Vérification du token véhicule
 * - IDOR protection (vérification company_id)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CarnetDigital } from '@/components/scan/carnet-digital';

interface CarnetPageProps {
  params: Promise<{
    vehicleId: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function CarnetPage({ 
  params, 
  searchParams 
}: CarnetPageProps) {
  const { vehicleId } = await params;
  const { token } = await searchParams;

  // Vérifier que le token est présent
  if (!token) {
    redirect('/?error=missing_token');
  }

  const supabase = await createClient();
  
  // Vérifier l'authentification
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Rediriger vers login avec redirect
    const redirectUrl = `/scan/${vehicleId}/carnet?token=${token}`;
    redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
  }

  // Récupérer le profil et vérifier le rôle
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/unauthorized');
  }

  // Vérifier le rôle (ADMIN, DIRECTEUR, AGENT_DE_PARC uniquement)
  const allowedRoles = ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'];
  if (!allowedRoles.includes(profile.role)) {
    redirect('/unauthorized?reason=insufficient_role');
  }

  // Vérifier le token véhicule et récupérer les infos
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, registration_number, brand, model, type, qr_code_data, status, company_id, mileage, insurance_expiry, technical_control_expiry')
    .eq('id', vehicleId)
    .eq('qr_code_data', token)
    .eq('status', 'active')
    .single();

  if (vehicleError || !vehicle) {
    redirect('/?error=invalid_token');
  }

  // Vérification IDOR : l'utilisateur doit appartenir à la même entreprise
  if (vehicle.company_id !== profile.company_id) {
    redirect('/unauthorized?reason=company_mismatch');
  }

  // Récupérer les données du carnet
  const { data: inspections } = await supabase
    .from('vehicle_inspections')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: fuelRecords } = await supabase
    .from('fuel_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
    .limit(20);

  const { data: maintenances } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <CarnetDigital
      vehicleId={vehicleId}
      accessToken={token}
      vehicleInfo={vehicle}
      inspections={inspections || []}
      fuelRecords={fuelRecords || []}
      maintenances={maintenances || []}
    />
  );
}
