'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔑 Tentative connexion...', data.email);
      
      const supabase = getSupabaseClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        console.error('❌ Erreur connexion:', signInError);
        throw signInError;
      }

      console.log('✅ Connexion réussie:', signInData.user?.email);
      console.log('📝 Session:', signInData.session ? 'présente' : 'absente');

      if (!signInData.session) {
        throw new Error('Pas de session créée');
      }

      // Vérifier que les cookies sont bien créés
      const cookies = document.cookie;
      console.log('🍪 Cookies:', cookies.includes('sb-') ? 'présents' : 'absents');

      setRedirecting(true);
      
      // Attendre un peu que les cookies soient bien enregistrés
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirection avec rechargement complet
      console.log('🚀 Redirection vers:', redirect);
      window.location.assign(redirect);

    } catch (err: any) {
      console.error('❌ Erreur:', err);
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : err.message || 'Une erreur est survenue'
      );
      setIsLoading(false);
    }
  };

  if (redirecting) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Connexion réussie !</p>
            <p className="text-sm text-muted-foreground">Redirection vers le dashboard...</p>
            <p className="text-xs text-muted-foreground mt-2">{redirect}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Connexion</CardTitle>
        <CardDescription className="text-center">
          Entrez vos identifiants pour accéder à votre compte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="votre@entreprise.fr"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>

          <div className="text-sm text-center space-y-2">
            <Link href="/forgot-password" className="text-primary hover:underline block">
              Mot de passe oublié ?
            </Link>
            <p>
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
