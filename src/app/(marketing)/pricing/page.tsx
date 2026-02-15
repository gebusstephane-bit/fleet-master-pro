'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLANS, ACTIVE_PLANS } from '@/lib/plans';

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="font-bold text-xl text-gray-900">FleetMaster</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Fonctionnalités
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-blue-600">
                Tarifs
              </Link>
              <Link href="/#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                FAQ
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/register">Commencer</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">
                Tarifs
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                Des prix adaptés à votre flotte
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                3 formules simples et transparentes. 
                <span className="block mt-2 text-sm text-gray-500">
                  Tous les plans incluent un essai gratuit de 14 jours.
                </span>
              </p>
            </motion.div>

            {/* Toggle Yearly/Monthly */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-8 flex items-center justify-center gap-4"
            >
              <span className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-500'}`}>
                Mensuel
              </span>
              <button
                onClick={() => setYearly(!yearly)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  yearly ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    yearly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-500'}`}>
                Annuel
              </span>
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                2 mois offerts
              </span>
            </motion.div>
          </div>

          {/* Pricing Cards - 3 plans */}
          <div className="grid md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
            {ACTIVE_PLANS.map((planId, index) => {
              const plan = PLANS[planId];
              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative rounded-2xl p-6 ${
                    plan.popular
                      ? 'bg-white shadow-xl border-2 border-blue-500 scale-105 z-10 lg:-mt-4'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        <Sparkles className="h-4 w-4" />
                        Le plus populaire
                      </span>
                    </div>
                  )}

                  {/* Plan name */}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-sm mt-1 text-gray-500">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {yearly ? plan.priceYearly : plan.priceMonthly}€
                      </span>
                      <span className="text-gray-500">/mois</span>
                    </div>
                    {yearly && (
                      <p className="text-sm text-green-600 mt-1">
                        Économisez {(plan.priceMonthly * 12 - plan.priceYearly)}€/an
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="p-3 rounded-lg mb-6 bg-gray-50">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Véhicules</span>
                      <span className="font-medium text-gray-900">
                        {plan.maxVehicles === 999 ? 'Illimité' : `Max ${plan.maxVehicles}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">Utilisateurs</span>
                      <span className="font-medium text-gray-900">
                        {plan.maxDrivers === 999 ? 'Illimité' : `Max ${plan.maxDrivers}`}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    asChild
                    className={`w-full mb-6 ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    size="lg"
                  >
                    <Link href={`/register?plan=${planId}`}>
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Features */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-900">Inclus :</p>
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-24 max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Questions fréquentes
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Puis-je changer de plan à tout moment ?',
                  a: 'Oui, vous pouvez upgrader à tout moment. Le nouveau plan est actif immédiatement. Pour downgrader, le changement s\'effectue à la fin de la période en cours.'
                },
                {
                  q: 'Que se passe-t-il si je dépasse la limite de véhicules ?',
                  a: 'Vous ne pourrez pas ajouter de nouveau véhicule tant que vous n\'aurez pas upgradé votre plan. Vos données existantes restent accessibles.'
                },
                {
                  q: 'Y a-t-il un engagement minimum ?',
                  a: 'Non, vous pouvez annuler à tout moment. Si vous annulez, votre accès est maintenu jusqu\'à la fin de la période payée.'
                },
                {
                  q: 'Comment fonctionne l\'essai gratuit de 14 jours ?',
                  a: 'Tous les plans incluent 14 jours d\'essai gratuit. Une carte bancaire est demandée mais vous n\'êtes pas débité immédiatement. Annulez avant la fin des 14 jours pour ne pas être facturé.'
                },
                {
                  q: 'Puis-je payer en plusieurs fois pour l\'annuel ?',
                  a: 'Le paiement annuel se fait en une fois. Contactez-nous pour les entreprises souhaitant un paiement échelonné.'
                }
              ].map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-500" />
                    {faq.q}
                  </h3>
                  <p className="mt-2 text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA Final */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-24 text-center bg-blue-600 rounded-2xl p-12 text-white"
          >
            <h2 className="text-3xl font-bold mb-4">
              Prêt à optimiser votre flotte ?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Rejoignez plus de 200 transporteurs qui font confiance à FleetMaster Pro 
              pour gérer leur flotte au quotidien.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Link href="/register">Commencer l&apos;essai gratuit</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/#features">Voir les fonctionnalités</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
