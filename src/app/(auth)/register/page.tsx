/**
 * Page d'inscription
 * Création de compte entreprise avec abonnement
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/config';
import type { SubscriptionPlan } from '@/types';

// Schéma de validation
const registerSchema = z.object({
  // Entreprise
  companyName: z.string().min(2, 'Le nom de l\'entreprise est requis'),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
  // Contact
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().regex(/^\d{10}$/, 'Le téléphone doit contenir 10 chiffres'),
  // Authentification
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  // Abonnement
  plan: z.enum(['starter', 'pro', 'business']),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter les conditions d\'utilisation',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            company_name: data.companyName,
            siret: data.siret,
            phone: data.phone,
            plan: data.plan,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Créer l'entreprise et l'utilisateur dans la BDD via une fonction RPC ou API
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            companyName: data.companyName,
            siret: data.siret,
            plan: data.plan,
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la création du compte');
        }

        // 3. Rediriger vers la page de confirmation
        router.push('/register/confirm');
      }
    } catch (err: any) {
      // Gestion spécifique des erreurs
      let errorMessage = err.message || 'Une erreur est survenue. Veuillez réessayer.';
      
      if (err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('Too Many Requests')) {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
      } else if (err.message?.includes('User already registered') || err.message?.includes('already exists')) {
        errorMessage = 'Un compte existe déjà avec cet email. Veuillez vous connecter.';
      } else if (err.message?.includes('password')) {
        errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
      } else if (err.message?.includes('email')) {
        errorMessage = 'L\'adresse email n\'est pas valide.';
      }
      
      setError(errorMessage);
    } finally {
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

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                <Input
                  id="companyName"
                  autoComplete="organization"
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
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    disabled={isLoading}
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    disabled={isLoading}
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jean.dupont@entreprise.fr"
                  disabled={isLoading}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="0612345678"
                  maxLength={10}
                  disabled={isLoading}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button type="button" className="flex-1" onClick={handleNextStep}>
                  Suivant
                </Button>
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
                        selectedPlan === plan
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setValue('plan', plan)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{SUBSCRIPTION_PLANS[plan].name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {SUBSCRIPTION_PLANS[plan].description}
                          </p>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                            <li>• {SUBSCRIPTION_PLANS[plan].maxVehicles} véhicules</li>
                            <li>• {SUBSCRIPTION_PLANS[plan].maxDrivers} chauffeurs</li>
                          </ul>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{SUBSCRIPTION_PLANS[plan].priceMonthly}€/mois</div>
                          <div className="text-xs text-muted-foreground">
                            ou {SUBSCRIPTION_PLANS[plan].priceYearly}€/an
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  className="mt-1"
                  {...register('acceptTerms')}
                />
                <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer">
                  J'accepte les{' '}
                  <Link href="/terms" className="text-primary hover:underline">
                    conditions d'utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    politique de confidentialité
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-center text-muted-foreground w-full">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
