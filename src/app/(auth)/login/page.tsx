/**
 * Page de connexion - Version propre et fonctionnelle
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: "Connexion Espace Client | FleetMaster",
  description: "Accédez à votre tableau de bord FleetMaster. Suivez vos véhicules, gérez vos alertes de maintenance et pilotez votre parc en temps réel.",
  alternates: {
    canonical: "https://fleet-master.fr/login",
  },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
