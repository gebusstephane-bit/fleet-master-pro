/**
 * Page d'attente de paiement
 */

import { Suspense } from 'react';
import PaymentPendingContent from './PaymentPendingContent';

export const dynamic = 'force-dynamic';

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
      <PaymentPendingContent />
    </Suspense>
  );
}
