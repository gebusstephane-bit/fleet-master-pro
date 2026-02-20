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
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="w-full backdrop-blur-xl bg-[#0f172a]/60 rounded-2xl border border-cyan-500/20 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-400" />
        <p className="text-lg font-medium text-white">Connexion réussie !</p>
        <p className="text-sm text-slate-400">Redirection vers le dashboard...</p>
        <p className="text-xs text-slate-500 mt-2">{redirect}</p>
      </div>
    );
  }

  return (
    <div className="w-full backdrop-blur-xl bg-[#0f172a]/60 rounded-2xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)] p-8">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl text-center">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
            Connexion
          </span>
        </CardTitle>
        <CardDescription className="text-center text-slate-400">
          Entrez vos identifiants pour accéder à votre compte
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-cyan-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="votre@entreprise.fr"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-blue-300">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] border-0" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>

          <div className="text-sm text-center space-y-2 pt-2">
            <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300 hover:underline block transition-colors">
              Mot de passe oublié ?
            </Link>
            <p className="text-slate-400">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-orange-400 hover:text-orange-300 hover:underline transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </div>
  );
}
