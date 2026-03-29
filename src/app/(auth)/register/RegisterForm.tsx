'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, AlertCircle, Check, Gift } from 'lucide-react';

// Schéma de validation
const registerSchema = z.object({
  companyName: z.string().min(2, 'Le nom de l\'entreprise est requis'),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')),
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().regex(/^\d{10}$/, 'Le téléphone doit contenir 10 chiffres'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter les conditions d\'utilisation',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  // Gérer le retour annulation (si jamais l'utilisateur revient)
  useEffect(() => {
    if (canceled) {
      setError('Inscription annulée. Vous pouvez réessayer.');
    }
  }, [canceled]);

  const handleNextStep = async () => {
    let fieldsToValidate: string[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['companyName', 'siret', 'firstName', 'lastName', 'email', 'phone'];
    } else if (step === 2) {
      fieldsToValidate = ['password', 'confirmPassword'];
    }

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(step + 1);
    }
  };

  // Nouveau flux : création directe sans CB
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register-with-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          siret: data.siret,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'inscription');
      }

      // Redirection vers dashboard après création réussie
      router.push('/dashboard');

    } catch (err: any) {
      let errorMessage = err.message || 'Une erreur est survenue. Veuillez réessayer.';
      
      if (err.status === 429 || err.message?.includes('rate limit')) {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      } else if (err.message?.includes('déjà')) {
        errorMessage = 'Un compte existe déjà avec cet email.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-3 py-1">
            <Gift className="w-4 h-4 mr-1.5 inline" />
            14 jours d&apos;essai gratuit
          </Badge>
        </div>
        <CardTitle className="text-2xl text-center">Créer un compte</CardTitle>
        <CardDescription className="text-center">
          Commencez votre essai gratuit de 14 jours
          <br />
          <span className="text-green-600 font-medium">Sans carte bancaire requise</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Indicateur d'étape */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ÉTAPE 1 : Informations entreprise */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                <Input
                  id="companyName"
                  placeholder="Transport Dupont SAS"
                  disabled={isLoading}
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="siret">Numéro SIRET (optionnel)</Label>
                <Input
                  id="siret"
                  placeholder="12345678900012"
                  maxLength={14}
                  disabled={isLoading}
                  {...register('siret')}
                />
                <p className="text-xs text-muted-foreground">Vous pourrez le renseigner plus tard dans vos paramètres</p>
                {errors.siret && (
                  <p className="text-sm text-destructive">{errors.siret.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" placeholder="Jean" disabled={isLoading} {...register('firstName')} />
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" placeholder="Dupont" disabled={isLoading} {...register('lastName')} />
                  {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <Input id="email" type="email" placeholder="jean@entreprise.fr" disabled={isLoading} {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" placeholder="0612345678" maxLength={10} disabled={isLoading} {...register('phone')} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>

              <Button type="button" className="w-full" onClick={handleNextStep}>
                Suivant
              </Button>
            </>
          )}

          {/* ÉTAPE 2 : Mot de passe */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    disabled={isLoading}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input id="confirmPassword" type="password" placeholder="••••••••" disabled={isLoading} {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Retour</Button>
                <Button type="button" className="flex-1" onClick={handleNextStep}>Suivant</Button>
              </div>
            </>
          )}

          {/* ÉTAPE 3 : Confirmation */}
          {step === 3 && (
            <>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">Récapitulatif de l&apos;essai</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ 14 jours d&apos;accès complet au plan PRO</li>
                  <li>✓ Jusqu&apos;à 20 véhicules et 50 conducteurs</li>
                  <li>✓ Toutes les fonctionnalités incluses</li>
                  <li>✓ Sans engagement, sans carte bancaire</li>
                </ul>
              </div>

              <div className="flex items-start space-x-2">
                <input type="checkbox" id="acceptTerms" className="mt-1" {...register('acceptTerms')} />
                <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer">
                  J&apos;accepte les <Link href="/terms" className="text-primary hover:underline">conditions d&apos;utilisation</Link>
                  {' '}et la{' '}<Link href="/privacy" className="text-primary hover:underline">politique de confidentialité</Link>
                </Label>
              </div>
              {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
                  ) : (
                    <>Créer mon compte</>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-center text-muted-foreground w-full">
          Déjà un compte ? <Link href="/login" className="text-primary hover:underline">Se connecter</Link>
        </div>
      </CardFooter>
    </Card>
  );
}
