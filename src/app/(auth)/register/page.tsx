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

import { Suspense } from 'react';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
