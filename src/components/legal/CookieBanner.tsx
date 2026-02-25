/**
 * Bannière de consentement cookies RGPD
 * Design cohérent avec Shadcn/ui - Position sticky en bas
 * 
 * Conformité CNIL :
 * - Opt-in explicite requis avant chargement des traceurs
 * - Choix binaire (Accepter/Refuser) équitable
 * - Information claire sur les finalités
 */

'use client';

import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { Button } from '@/components/ui/button';
import { Cookie, X, Shield, Info } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export function CookieBanner() {
  const { needsBanner, hasMadeChoice, acceptCookies, refuseCookies, isLoaded } = useCookieConsent();

  // Ne pas afficher pendant le chargement ou si le choix est déjà fait
  if (!isLoaded || hasMadeChoice) {
    return null;
  }

  return (
    <AnimatePresence>
      {needsBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
        >
          <div className="max-w-5xl mx-auto">
            <div className="relative bg-[#0f172a]/95 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)] overflow-hidden">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-orange-500/5 pointer-events-none" />
              
              {/* Pattern subtile */}
              <div 
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              <div className="relative p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Icon et titre */}
                  <div className="flex items-start gap-4 flex-shrink-0">
                    <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/20">
                      <Cookie className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="lg:hidden">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        Votre vie privée
                        <Shield className="w-4 h-4 text-green-400" />
                      </h3>
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 space-y-3">
                    <h3 className="hidden lg:flex text-lg font-semibold text-white items-center gap-2">
                      Votre vie privée compte pour nous
                      <Shield className="w-4 h-4 text-green-400" />
                    </h3>
                    
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Nous utilisons des cookies et technologies similaires pour améliorer votre expérience, 
                      analyser le trafic et personnaliser les contenus. Les traceurs analytiques (PostHog) 
                      ne sont chargés qu&apos;avec votre consentement explicite, conformément aux recommandations CNIL.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <Link 
                        href="/politique-confidentialite" 
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                        Politique de confidentialité
                      </Link>
                      <span className="hidden sm:inline">•</span>
                      <Link 
                        href="/cookies" 
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Gérer les préférences
                      </Link>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 lg:min-w-[280px]">
                    <Button
                      onClick={acceptCookies}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all"
                    >
                      <Cookie className="w-4 h-4 mr-2" />
                      Accepter
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={refuseCookies}
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                  </div>
                </div>
              </div>

              {/* Indicateur de sécurité */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-cyan-500/50" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Composant pour afficher un bouton de réinitialisation du consentement
 * Utile pour la page de paramètres cookies
 */
export function CookieResetButton() {
  const { resetConsent, hasMadeChoice } = useCookieConsent();

  if (!hasMadeChoice) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={resetConsent}
      className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
    >
      <Cookie className="w-3 h-3 mr-1" />
      Réinitialiser les préférences
    </Button>
  );
}
