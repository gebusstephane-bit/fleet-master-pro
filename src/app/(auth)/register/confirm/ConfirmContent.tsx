'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pending = searchParams.get('pending');
  const sessionId = searchParams.get('session_id');
  
  const [isChecking, setIsChecking] = useState(true);
  const [accountReady, setAccountReady] = useState(false);

  useEffect(() => {
    if (!pending && !sessionId) {
      setIsChecking(false);
      return;
    }

    const checkAccount = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setAccountReady(true);
          setIsChecking(false);
          setTimeout(() => {
            router.push('/dashboard?welcome=true');
          }, 3000);
        } else {
          setTimeout(checkAccount, 3000);
        }
      } catch (error) {
        console.error('Error checking account:', error);
        setIsChecking(false);
      }
    };

    checkAccount();
  }, [pending, sessionId, router]);

  if (isChecking && (pending || sessionId)) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <CardTitle className="text-2xl">Finalisation de votre inscription</CardTitle>
          <CardDescription>
            Nous créons votre compte... Cela ne prend que quelques secondes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Veuillez patienter, vous allez être redirigé automatiquement.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (accountReady) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <CardTitle className="text-2xl">Inscription réussie !</CardTitle>
          <CardDescription>
            Votre compte est maintenant actif. Redirection vers le dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Accéder au dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Vérifiez votre email</CardTitle>
        <CardDescription>
          Un lien de confirmation a été envoyé à votre adresse email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Cliquez sur le lien dans l&apos;email pour activer votre compte. Si vous ne voyez pas l&apos;email,
          vérifiez votre dossier spam.
        </p>
        
        <div className="bg-muted p-4 rounded-lg text-sm">
          <p className="font-medium mb-1">Prochaines étapes :</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Confirmez votre email</li>
            <li>Configurez votre entreprise</li>
            <li>Ajoutez vos véhicules et chauffeurs</li>
            <li>Commencez à optimiser votre flotte !</li>
          </ol>
        </div>

        <Button asChild className="w-full">
          <Link href="/login">
            Aller à la connexion
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
