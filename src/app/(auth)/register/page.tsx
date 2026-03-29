/**
 * Page d'inscription - FLUX TRANSACTIONNEL CORRIGÉ
 * 
 * PLAN GRATUIT (starter) :
 *   Validation → Création User + Company → Confirmation → Dashboard
 * 
 * PLAN PAYANT (pro/business) :
 *   Validation → Création Session Stripe (temp_data) → Redirection Stripe
 *   → Paiement réussi → Webhook crée User + Company → Dashboard
 *   → Annulation → Suppression session + retry
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Essai Gratuit FleetMaster | Logiciel Gestion de Flotte Transport",
  description: "Testez FleetMaster gratuitement pendant 14 jours sans carte bancaire. Rejoignez les transporteurs qui ont modernisé leur gestion de flotte en moins d'une heure.",
  alternates: {
    canonical: "https://fleet-master.fr/register",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Essai Gratuit 14 Jours | FleetMaster",
    description: "Créez votre compte FleetMaster en 2 minutes. Sans carte bancaire.",
    url: "https://fleet-master.fr/register",
    images: [{ url: "https://fleet-master.fr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
