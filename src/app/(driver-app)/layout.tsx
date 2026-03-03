export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DriverAppLayoutClient } from './DriverAppLayoutClient';

// ============================================================================
// METADATA PWA
// ============================================================================

export const metadata: Metadata = {
  title: 'FleetMaster — Conducteur',
  description: 'Application mobile pour les conducteurs FleetMaster Pro',
  manifest: '/manifest-driver.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FleetMaster',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0f1a',
  viewportFit: 'cover',
};

// ============================================================================
// LAYOUT SERVEUR
// ============================================================================

export default async function DriverAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifier l'authentification
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/driver-app');
  }
  
  // Récupérer le profil pour vérifier le rôle et récupérer les infos
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, company_id, first_name, last_name')
    .eq('id', user.id)
    .single();
  
  // Récupérer les infos du conducteur
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, current_vehicle_id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  // Récupérer le véhicule assigné
  let vehicle = null;
  if (driver?.current_vehicle_id) {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, mileage, status')
      .eq('id', driver.current_vehicle_id)
      .maybeSingle();
    vehicle = vehicleData;
  }
  
  // Déterminer si c'est un admin en mode aperçu (pour les tests)
  const isAdminPreview = profile?.role === 'ADMIN' || profile?.role === 'DIRECTEUR';
  
  // Construire l'objet driverData
  const driverData = driver ? {
    id: driver.id,
    firstName: driver.first_name,
    lastName: driver.last_name,
    userId: user.id,
    companyId: profile?.company_id || '',
    role: profile?.role || 'CHAUFFEUR',
  } : null;
  
  const vehicleData = vehicle ? {
    id: vehicle.id,
    immatriculation: vehicle.registration_number,
    brand: vehicle.brand,
    model: vehicle.model,
    mileage: vehicle.mileage,
    status: vehicle.status,
  } : null;
  
  return (
    <DriverAppLayoutClient
      driver={driverData}
      vehicle={vehicleData}
      isAdminPreview={isAdminPreview && profile?.role !== 'CHAUFFEUR'}
    >
      {children}
    </DriverAppLayoutClient>
  );
}
