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
import { Loader2, Eye, EyeOff, AlertCircle, Check, CreditCard } from 'lucide-react';
import { PLANS, PlanId, ACTIVE_PLANS } from '@/lib/plans';

// Schéma de validation - 3 plans payants uniquement
const registerSchema = z.object({
  companyName: z.string().min(2, 'Le nom de l\'entreprise est requis'),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().regex(/^\d{10}$/, 'Le téléphone doit contenir 10 chiffres'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  plan: z.enum(['essential', 'pro', 'unlimited']),
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
      plan: 'essential', // Plan par défaut: Essential
      acceptTerms: false,
    },
  });

  const selectedPlan = watch('plan') as PlanId;
  const planConfig = PLANS[selectedPlan];

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

  // TOUS les plans sont payants - redirection Stripe obligatoire
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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // TOUS les plans sont payants - toujours passer par Stripe
      await createStripeCheckout(data);
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
          Choisissez votre formule et commencez dès maintenant
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

          {isRedirectingToStripe && (
            <Alert className="bg-blue-50 border-blue-200">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Redirection vers notre partenaire de paiement sécurisé Stripe...
              </AlertDescription>
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

          {/* ÉTAPE 3 : Sélection du plan (3 plans payants) */}
          {step === 3 && (
            <>
              <div className="space-y-3">
                <Label>Choisissez votre formule</Label>
                <div className="grid gap-3">
                  {ACTIVE_PLANS.map((planId) => {
                    const plan = PLANS[planId];
                    const isSelected = selectedPlan === planId;
                    
                    return (
                      <div
                        key={planId}
                        className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setValue('plan', planId)}
                      >
                        {/* Badge Popular */}
                        {plan.popular && (
                          <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                            Le plus populaire
                          </Badge>
                        )}
                        
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{plan.name}</h4>
                              {isSelected && <Check className="w-4 h-4 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {plan.description}
                            </p>
                            
                            {/* Features */}
                            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                              {plan.features.slice(0, 3).map((feature, idx) => (
                                <li key={idx}>✓ {feature}</li>
                              ))}
                              {plan.features.length > 3 && (
                                <li className="text-primary">+ {plan.features.length - 3} autres fonctionnalités</li>
                              )}
                            </ul>
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold">{plan.priceMonthly}€</div>
                            <div className="text-xs text-muted-foreground">/mois</div>
                            <div className="text-xs text-green-600 mt-1">
                              {plan.priceYearly}€/an
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Info paiement sécurisé */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                  <CreditCard className="w-4 h-4" />
                  <span>Paiement sécurisé par Stripe • 14 jours d&apos;essai inclus</span>
                </div>
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
                <Button type="submit" className="flex-1" disabled={isLoading || isRedirectingToStripe}>
                  {isLoading || isRedirectingToStripe ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirection...</>
                  ) : (
                    <><CreditCard className="mr-2 h-4 w-4" />Payer {planConfig.priceMonthly}€/mois</>
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
