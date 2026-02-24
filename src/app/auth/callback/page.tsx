/**
 * Callback Auth - Établit la session Supabase depuis le magic link
 *
 * Le magic link redirige ici avec les tokens dans le hash (#access_token=...)
 * Le client Supabase les détecte automatiquement → session établie → redirect dashboard
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

function CallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Écouter l'événement SIGNED_IN — déclenché quand Supabase traite les tokens du hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        router.push('/dashboard?welcome=true');
        router.refresh();
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        subscription.unsubscribe();
        router.push('/dashboard');
        router.refresh();
      }
    });

    // Vérifier si une session existe déjà (cas où les cookies sont déjà là)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        router.push('/dashboard?welcome=true');
        router.refresh();
      }
    });

    // Timeout de sécurité — 10 secondes
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setError('La session n\'a pas pu être établie. Veuillez réessayer.');
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Erreur de connexion</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <a href="/login" className="text-blue-400 hover:underline text-sm">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-slate-400">Connexion en cours...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
