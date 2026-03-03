'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight, HelpCircle, X, Info, Shield, Zap, Phone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Configuration des plans
const PLANS = {
  essential: {
    id: 'essential',
    name: 'ESSENTIAL',
    priceMonthly: 29,
    priceYearly: 23, // -20%
    yearlyTotal: 276,
    maxVehicles: 5,
    maxUsers: 10,
    popular: false,
    features: [
      '5 véhicules',
      '10 conducteurs',
      'Conformité de base',
      'Inspections QR',
      'Carnet d\'entretien',
      'Support communauté',
    ],
    cta: 'Essayer gratuitement 14 jours',
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    priceMonthly: 49,
    priceYearly: 39, // -20%
    yearlyTotal: 468,
    maxVehicles: 20,
    maxUsers: 50,
    popular: true,
    features: [
      '20 véhicules',
      '50 conducteurs',
      'Tout Essential +',
      'Rapports avancés',
      'Webhooks',
      'Support email',
      'TCO & coûts',
    ],
    cta: 'Essayer gratuitement 14 jours',
  },
  unlimited: {
    id: 'unlimited',
    name: 'UNLIMITED',
    priceMonthly: 129,
    priceYearly: 103, // -20%
    yearlyTotal: 1236,
    maxVehicles: 999,
    maxUsers: 999,
    popular: false,
    features: [
      'Véhicules illimités',
      'Conducteurs illimités',
      'Tout Pro +',
      'API publique',
      'Assistant IA réglementaire',
      'Export comptable',
      'Support prioritaire',
    ],
    cta: 'Essayer gratuitement 14 jours',
  },
};

// Tableau comparatif
const COMPARISON_DATA = [
  { feature: 'Prix/mois (10 véhicules)', fleetmaster: '49€', quartix: '~300€', webfleet: '~400€' },
  { feature: 'Conformité réglementaire', fleetmaster: '✅ Inclus', quartix: '⚠️ Partiel', webfleet: '✅' },
  { feature: 'Inspections QR sans app', fleetmaster: '✅ Unique', quartix: '❌', webfleet: '❌' },
  { feature: 'SOS panne intelligent', fleetmaster: '✅', quartix: '❌', webfleet: '⚠️' },
  { feature: 'Géolocalisation', fleetmaster: '❌ (RGPD+)', quartix: '✅', webfleet: '✅', tooltip: 'Pas de traceur GPS = meilleur RGPD, moins cher, pas de surveillance des chauffeurs' },
  { feature: 'Sans engagement', fleetmaster: '✅', quartix: '❌', webfleet: '❌' },
];

// FAQ
const FAQ_ITEMS = [
  {
    question: "L'essai gratuit nécessite-t-il une carte bancaire ?",
    answer: "Non, aucune carte bancaire n'est requise pendant les 14 jours d'essai. Vous pouvez tester toutes les fonctionnalités du plan PRO sans engagement.",
  },
  {
    question: "Que se passe-t-il après l'essai ?",
    answer: "À la fin des 14 jours, vous pouvez choisir le plan qui vous convient. Si vous ne faites pas de choix, votre compte passe automatiquement sur le plan Essential avec 1 véhicule pour garder l'accès à vos données.",
  },
  {
    question: "Puis-je changer de plan ?",
    answer: "Oui, vous pouvez changer de plan à tout moment. Le changement est effectif immédiatement et la facturation est calculée au prorata.",
  },
  {
    question: "Puis-je annuler quand je veux ?",
    answer: "Absolument. Il n'y a aucun engagement de durée. Vous pouvez annuler votre abonnement à tout moment sans frais.",
  },
  {
    question: "Proposez-vous des devis pour les flottes >50 véhicules ?",
    answer: "Oui, pour les grandes flottes nous proposons des tarifs personnalisés. Contactez-nous pour obtenir un devis adapté à vos besoins.",
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);

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

      <main className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero - En-tête accrocheur */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge essai gratuit */}
              <div className="mb-6">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1.5 text-sm font-medium">
                  <Check className="w-4 h-4 mr-1.5 inline" />
                  Essai gratuit 14 jours — Sans carte bancaire
                </Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Gérez votre flotte à{' '}
                <span className="text-blue-600">1/10ème du prix</span>
                <br className="hidden sm:block" />
                de Webfleet ou Quartix
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Sans GPS. Sans engagement. Sans surprise.
              </p>
            </motion.div>
          </div>

          {/* Tableau comparatif */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-16 max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Comparaison des solutions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Feature</th>
                      <th className="text-center px-6 py-4 text-sm font-bold text-blue-600">FleetMaster Pro</th>
                      <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Quartix</th>
                      <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">Webfleet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_DATA.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {row.feature}
                            {row.tooltip && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-4 h-4 text-gray-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{row.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-blue-600">
                          {row.fleetmaster}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {row.quartix}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {row.webfleet}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Toggle Mensuel/Annuel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center mb-12"
          >
            <div className="flex items-center gap-4 mb-2">
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
            </div>
            <span className="text-sm text-green-600 font-medium">
              {yearly ? 'Économisez 20% avec l\'annuel' : 'Passez à l\'annuel pour économiser 20%'}
            </span>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto mb-20">
            {Object.values(PLANS).map((plan, index) => (
              <motion.div
                key={plan.id}
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
                      Recommandé
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      {yearly ? plan.priceYearly : plan.priceMonthly}€
                    </span>
                    <span className="text-gray-500">/mois</span>
                  </div>
                  {yearly ? (
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.yearlyTotal}€ facturés annuellement
                      <span className="text-green-600 ml-2">
                        (-20%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      soit {plan.priceYearly}€/mois en annuel
                    </p>
                  )}
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
                  <Link href="/register">
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <p className="text-xs text-center text-gray-500 mb-6">
                  Sans carte bancaire requise
                </p>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 pl-7">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* Bandeau de confiance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="border-t border-gray-200 pt-12"
          >
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <span>Données hébergées en France</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Conformité RGPD</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Mise en service en 10 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <span>Support en français</span>
              </div>
            </div>
          </motion.div>

          {/* CTA Final */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 text-center bg-blue-600 rounded-2xl p-12 text-white"
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
