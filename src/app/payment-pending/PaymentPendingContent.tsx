'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';

export default function PaymentPendingContent() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'success' | 'pending'>('idle');

  useEffect(() => {
    const data = localStorage.getItem('pending_registration');
    if (data) {
      setPendingData(JSON.parse(data));
    }
  }, []);

  const checkPaymentStatus = async () => {
    if (!pendingData?.sessionId) return;
    
    setIsChecking(true);
    try {
      const res = await fetch(`/api/stripe/check-session?session_id=${pendingData.sessionId}`);
      const { status, paymentStatus } = await res.json();

      if (paymentStatus === 'paid' || status === 'complete') {
        setCheckStatus('success');
        localStorage.removeItem('pending_registration');
        setTimeout(() => {
          router.push('/dashboard?welcome=true');
        }, 2000);
      } else {
        setCheckStatus('pending');
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetryPayment = () => {
    router.push('/pricing');
  };

  const handleChangePlan = () => {
    localStorage.removeItem('pending_registration');
    router.push('/register');
  };

  if (checkStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Paiement confirmé !</CardTitle>
            <CardDescription>
              Votre compte est maintenant actif. Redirection vers le dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CreditCard className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-2xl">Finalisez votre inscription</CardTitle>
          <CardDescription>
            Votre inscription est en attente de paiement pour être activée.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {checkStatus === 'pending' && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                Le paiement n&apos;a pas encore été reçu. Si vous venez de payer, 
                attendez quelques secondes et cliquez sur &quot;Vérifier mon paiement&quot;.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={checkPaymentStatus} 
              disabled={isChecking}
              className="w-full"
              size="lg"
            >
              {isChecking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" />Vérifier mon paiement</>
              )}
            </Button>

            <Button 
              onClick={handleRetryPayment}
              variant="outline"
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Réessayer le paiement
            </Button>

            <Button 
              onClick={handleChangePlan}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Changer de formule
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Email utilisé : {pendingData?.email || 'Non disponible'}</p>
            <p>Formule : {pendingData?.plan || 'Non disponible'}</p>
          </div>

          <div className="text-xs text-center text-muted-foreground border-t pt-4">
            <p>Besoin d&apos;aide ? Contactez-nous à support@fleet-master.fr</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
