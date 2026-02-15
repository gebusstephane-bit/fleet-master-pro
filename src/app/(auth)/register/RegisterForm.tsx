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
import { Loader2, Eye, EyeOff, AlertCircle, Check, CreditCard, ArrowLeft } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/config';
import type { SubscriptionPlan } from '@/types';

// Schéma de validation
const registerSchema = z.object({
  companyName: z.string().min(2, 'Le nom de l\'entreprise est requis'),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().regex(/^\d{10}$/, 'Le téléphone doit contenir 10 chiffres'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  plan: z.enum(['starter', 'pro', 'business']),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter les conditions d\'utilisation',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const PAID_PLANS = ['pro', 'business'];

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      plan: 'starter',
      acceptTerms: false,
    },
  });

  const selectedPlan = watch('plan');
  const isPaidPlan = PAID_PLANS.includes(selectedPlan);

  // Gérer le retour annulation Stripe
  useEffect(() => {
    if (canceled) {
      setError('Paiement annulé. Vous pouvez réessayer ou choisir une autre formule.');
      localStorage.removeItem('pending_registration');
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

  // CRITIQUE : Créer la session Stripe AVANT création user
  const createStripeCheckout = async (formData: RegisterFormData) => {
    setIsRedirectingToStripe(true);
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          plan: selectedPlan,
          tempData: {
            companyName: formData.companyName,
            siret: formData.siret,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            password: formData.password,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de la session de paiement');
      }

      // Stocker les données temporaires
      localStorage.setItem('pending_registration', JSON.stringify({
        sessionId: result.sessionId,
        email: formData.email,
        plan: selectedPlan,
      }));

      // Redirection vers Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (err: any) {
      setError('Erreur lors de la redirection vers le paiement : ' + err.message);
      setIsRedirectingToStripe(false);
    }
  };

  // Flux plan gratuit : création immédiate
  const handleFreePlanRegistration = async (formData: RegisterFormData) => {
    const supabase = getSupabaseClient();
    
    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company_name: formData.companyName,
          plan: formData.plan,
        },
      },
    });

    if (authError) throw authError;

    if (authData.user) {
      // 2. Créer l'entreprise et le profil
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          companyName: formData.companyName,
          siret: formData.siret,
          plan: formData.plan,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(result.error || 'Erreur lors de la création du compte');
      }

      // 3. Redirection confirmation
      router.push('/register/confirm');
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isPaidPlan) {
        await createStripeCheckout(data);
      } else {
        await handleFreePlanRegistration(data);
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Une erreur est survenue. Veuillez réessayer.';
      
      if (err.status === 429 || err.message?.includes('rate limit')) {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      } else if (err.message?.includes('already exists')) {
        errorMessage = 'Un compte existe déjà avec cet email.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Créer un compte</CardTitle>
        <CardDescription className="text-center">
          Commencez votre essai gratuit de 14 jours
        </CardDescription>
      </CardHeader>
      <CardContent>
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

          {isRedirectingToStripe && (
            <Alert className="bg-blue-50 border-blue-200">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Redirection vers notre partenaire de paiement sécurisé Stripe...
              </AlertDescription>
            </Alert>
          )}

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
                <Label htmlFor="siret">Numéro SIRET</Label>
                <Input
                  id="siret"
                  placeholder="12345678900012"
                  maxLength={14}
                  disabled={isLoading}
                  {...register('siret')}
                />
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
                <Label htmlFor="confirmPassword">Confirmer</Label>
                <Input id="confirmPassword" type="password" placeholder="••••••••" disabled={isLoading} {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Retour</Button>
                <Button type="button" className="flex-1" onClick={handleNextStep}>Suivant</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3">
                <Label>Choisissez votre plan</Label>
                <div className="grid gap-3">
                  {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map((plan) => (
                    <div
                      key={plan}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPlan === plan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setValue('plan', plan)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{SUBSCRIPTION_PLANS[plan].name}</h4>
                          <p className="text-sm text-muted-foreground">{SUBSCRIPTION_PLANS[plan].description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{SUBSCRIPTION_PLANS[plan].priceMonthly}€/mois</div>
                          {PAID_PLANS.includes(plan) && (
                            <div className="text-xs text-blue-600 mt-1 font-medium">Paiement sécurisé Stripe</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input type="checkbox" id="acceptTerms" className="mt-1" {...register('acceptTerms')} />
                <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer">
                  J&apos;accepte les <Link href="/terms" className="text-primary hover:underline">CGU</Link>
                </Label>
              </div>
              {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Retour</Button>
                <Button type="submit" className="flex-1" disabled={isLoading || isRedirectingToStripe}>
                  {isLoading || isRedirectingToStripe ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isPaidPlan ? 'Redirection...' : 'Création...'}</>
                  ) : (
                    isPaidPlan ? 'Continuer vers le paiement' : 'Créer mon compte'
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
