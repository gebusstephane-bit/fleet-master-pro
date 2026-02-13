/**
 * Page de confirmation d'inscription
 * Affiché après l'inscription réussie
 */

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight } from 'lucide-react';

export default function ConfirmPage() {
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
          Cliquez sur le lien dans l'email pour activer votre compte. Si vous ne voyez pas l'email,
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
