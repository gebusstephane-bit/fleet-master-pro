'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [countdown, setCountdown] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleAutoLogin = async () => {
    setIsLoading(true);
    window.location.href = '/dashboard?welcome=true';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Inscription réussie !
        </h1>

        <p className="text-slate-300 mb-6">
          Votre compte a été créé avec succès. Vous pouvez maintenant accéder à votre tableau de bord FleetMaster.
        </p>

        {email && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6 bg-white/5 rounded-lg p-3">
            <Mail className="w-4 h-4" />
            <span>{email}</span>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleAutoLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Accéder à mon tableau de bord'
            )}
          </Button>

          <p className="text-xs text-slate-500">
            Redirection automatique dans {countdown} secondes...
          </p>

          <div className="pt-4 border-t border-white/10">
            <Link 
              href="/login" 
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Se connecter avec un autre compte
            </Link>
          </div>
        </div>

        <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-green-400">
            🔒 Vos données sont sécurisées conformément au RGPD.
            Un email de confirmation vous a été envoyé.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
